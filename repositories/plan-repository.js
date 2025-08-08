import { supabase } from '../configs/db-config.js';

export class PlanRepository {
  async crearPlan({ nombrePlan, descPlan, idLugar, inicioPlan, finPlan, idAnfitrion, participantes }) {
    // 1. Insertar el plan
    const { data: planData, error: planError } = await supabase
      .from('Planes')
      .insert([{
        nombrePlan,
        descPlan,
        idLugar,
        fechaCreacion: new Date().toISOString(),
        inicioPlan,
        finPlan,
        idAnfitrion
      }])
      .select()
      .single();
    if (planError) throw new Error(planError.message);
    // 2. Insertar participantes (anfitrión como participante, invitados como pendientes)
    const idPlan = planData.idPlan;
    const participantesSet = new Set(participantes);
    participantesSet.add(idAnfitrion);
    const participantesRows = Array.from(participantesSet).map(idPerfil => ({ 
      idPlan, 
      idPerfil,
      estadoParticipante: idPerfil === idAnfitrion ? 1 : 0 // El anfitrión acepta automáticamente
    }));
    const { error: partError } = await supabase.from('ParticipantePlan').insert(participantesRows);
    if (partError) throw new Error(partError.message);
    return planData;
  }

  async obtenerPlan(idPlan) {
    const { data, error } = await supabase.from('Planes').select('*').eq('idPlan', idPlan).single();
    if (error) throw new Error(error.message);
    return data;
  }

  async detallePlan(idPlan, currentUserId) {
    // 1. Traer el plan
    const { data: plan, error: planError } = await supabase
      .from('Planes')
      .select('*')
      .eq('idPlan', idPlan)
      .single();
    if (planError || !plan) throw new Error('Plan no encontrado');
    // 2. Traer los participantes con perfil
    const { data: participantes, error: partError } = await supabase
      .from('ParticipantePlan')
      .select('idPerfil, estadoParticipante, perfiles: idPerfil (id, nombre, username, foto)')
      .eq('idPlan', idPlan);
    if (partError) throw new Error('Error al obtener participantes');

    // 3. Armar la lista de participantes con datos útiles y flags derivados
    const participantesList = participantes.map(row => ({
      id: row.idPerfil,
      nombre: row.perfiles?.nombre,
      username: row.perfiles?.username,
      avatarUrl: row.perfiles?.foto,
      estadoParticipante: row.estadoParticipante,
      aceptado: row.estadoParticipante === 1,
      anfitrion: row.idPerfil === plan.idAnfitrion
    }));

    // 4. Determinar el estado del usuario actual dentro del plan
    const miParticipacion = participantes.find(p => p.idPerfil === currentUserId);
    const miEstadoParticipante = miParticipacion?.estadoParticipante ?? (currentUserId === plan.idAnfitrion ? 1 : null);

    return { ...plan, participantes: participantesList, miEstadoParticipante };
  }

  async planesDeUsuario(userId, limit = 10, offset = 0) {
    // 1. Buscar idPlanes donde el usuario participa y aceptó (estadoParticipante = 1)
    const { data: participaciones, error: partError } = await supabase
      .from('ParticipantePlan')
      .select('idPlan')
      .eq('idPerfil', userId)
      .eq('estadoParticipante', 1);
    if (partError) throw new Error(partError.message);
    const idPlanesParticipa = participaciones.map(p => p.idPlan);
    
    // 2. Buscar todos los planes donde es anfitrión o participante (estadoParticipante = 2)
    let filters = [`idAnfitrion.eq.${userId}`];
    if (idPlanesParticipa.length > 0) {
      filters.push(`idPlan.in.(${idPlanesParticipa.join(',')})`);
    }
    
    // 3. Obtener el total de planes para la paginación
    const { count: totalPlanes, error: countError } = await supabase
      .from('Planes')
      .select('*', { count: 'exact', head: true })
      .or(filters.join(','));
    if (countError) throw new Error(countError.message);
    
    // 4. Obtener los planes con paginación
    const { data: planes, error: planesError } = await supabase
      .from('Planes')
      .select('*')
      .or(filters.join(','))
      .order('fechaCreacion', { ascending: false })
      .range(offset, offset + limit - 1);
    if (planesError) throw new Error(planesError.message);
    
    // 5. Para cada plan, obtener los participantes
    const planesConParticipantes = await Promise.all(
      planes.map(async (plan) => {
        const { data: participantes, error: partError } = await supabase
          .from('ParticipantePlan')
          .select('idPerfil, estadoParticipante, perfiles: idPerfil (id, nombre, username, foto)')
          .eq('idPlan', plan.idPlan);
        
        if (partError) throw new Error('Error al obtener participantes');
        
        // Armar la lista de participantes con datos útiles
        const participantesList = participantes.map(row => ({
          id: row.idPerfil,
          nombre: row.perfiles?.nombre,
          username: row.perfiles?.username,
          avatarUrl: row.perfiles?.foto,
          estadoParticipante: row.estadoParticipante
        }));
        
        return { ...plan, participantes: participantesList };
      })
    );
    
    return {
      planes: planesConParticipantes,
      paginacion: {
        total: totalPlanes,
        limit,
        offset,
        hasMore: offset + limit < totalPlanes
      }
    };
  }

  async invitacionesPendientes(userId) {
    // Buscar planes donde el usuario tiene invitaciones pendientes (estadoParticipante = 0)
    const { data: participaciones, error: partError } = await supabase
      .from('ParticipantePlan')
      .select('idPlan, estadoParticipante')
      .eq('idPerfil', userId)
      .eq('estadoParticipante', 0);
    if (partError) throw new Error(partError.message);
    
    if (participaciones.length === 0) return [];
    
    const idPlanes = participaciones.map(p => p.idPlan);
    const { data: planes, error: planesError } = await supabase
      .from('Planes')
      .select('*')
      .in('idPlan', idPlanes);
    if (planesError) throw new Error(planesError.message);
    
    return planes;
  }

  async obtenerEstadoParticipacion(idPlan, idPerfil) {
    const { data, error } = await supabase
      .from('ParticipantePlan')
      .select('estadoParticipante')
      .eq('idPlan', idPlan)
      .eq('idPerfil', idPerfil)
      .single();
    if (error) throw new Error(error.message);
    return data?.estadoParticipante || null;
  }

  async aceptarInvitacion(idPlan, idPerfil) {
    const { error } = await supabase
      .from('ParticipantePlan')
      .update({ estadoParticipante: 1 })
      .eq('idPlan', idPlan)
      .eq('idPerfil', idPerfil);
    if (error) throw new Error(error.message);
  }

  async declinarInvitacion(idPlan, idPerfil) {
    const { error } = await supabase
      .from('ParticipantePlan')
      .update({ estadoParticipante: 2 })
      .eq('idPlan', idPlan)
      .eq('idPerfil', idPerfil);
    if (error) throw new Error(error.message);
  }

  async eliminarPlan(idPlan) {
    // 1. Eliminar los participantes del plan
    const { error: partError } = await supabase
      .from('ParticipantePlan')
      .delete()
      .eq('idPlan', idPlan);
    if (partError) throw new Error('Error al eliminar participantes del plan');
    // 2. Eliminar el plan
    const { error: planError } = await supabase
      .from('Planes')
      .delete()
      .eq('idPlan', idPlan);
    if (planError) throw new Error('Error al eliminar el plan');
  }
} 