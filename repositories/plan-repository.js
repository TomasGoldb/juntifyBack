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
    participantesSet.delete(idAnfitrion); // El anfitrión se maneja aparte
    const participantesRows = [
      { idPlan, idPerfil: idAnfitrion, estadoParticipante: 2 }, // anfitrión
      ...Array.from(participantesSet).map(idPerfil => ({ idPlan, idPerfil, estadoParticipante: 1 })) // invitados
    ];
    const { error: partError } = await supabase.from('ParticipantePlan').insert(participantesRows);
    if (partError) throw new Error(partError.message);
    return planData;
  }

  async obtenerPlan(idPlan) {
    const { data, error } = await supabase.from('Planes').select('*').eq('idPlan', idPlan).single();
    if (error) throw new Error(error.message);
    return data;
  }

  async detallePlan(idPlan) {
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
      .select('idPerfil, perfiles: idPerfil (id, nombre, username, foto)')
      .eq('idPlan', idPlan);
    if (partError) throw new Error('Error al obtener participantes');
    // 3. Armar la lista de participantes con datos útiles
    const participantesList = participantes.map(row => ({
      id: row.idPerfil,
      nombre: row.perfiles?.nombre,
      username: row.perfiles?.username,
      avatarUrl: row.perfiles?.foto,
    }));
    return { ...plan, participantes: participantesList };
  }

  async planesDeUsuario(userId) {
    // 1. Buscar idPlanes donde el usuario participa y es participante (estadoParticipante = 2)
    const { data: participaciones, error: partError } = await supabase
      .from('ParticipantePlan')
      .select('idPlan')
      .eq('idPerfil', userId)
      .eq('estadoParticipante', 2);
    if (partError) throw new Error(partError.message);
    const idPlanesParticipa = participaciones.map(p => p.idPlan);
    // 2. Buscar todos los planes donde es anfitrión o participante (estadoParticipante = 2)
    let filters = [`idAnfitrion.eq.${userId}`];
    if (idPlanesParticipa.length > 0) {
      filters.push(`idPlan.in.(${idPlanesParticipa.join(',')})`);
    }
    const { data: planes, error: planesError } = await supabase
      .from('Planes')
      .select('*')
      .or(filters.join(','));
    if (planesError) throw new Error(planesError.message);
    return planes;
  }

  async aceptarInvitacion(idPlan, idPerfil) {
    const { error } = await supabase
      .from('ParticipantePlan')
      .update({ estadoParticipante: 2 })
      .eq('idPlan', idPlan)
      .eq('idPerfil', idPerfil);
    if (error) throw new Error(error.message);
  }

  async declinarInvitacion(idPlan, idPerfil) {
    const { error } = await supabase
      .from('ParticipantePlan')
      .delete()
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