import { supabase } from '../configs/db-config.js';

export class PlanRepository {
  async #getPlanType(planTypeId) {
    const { data, error } = await supabase
      .from('plan_types')
      .select('*')
      .eq('id', planTypeId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async #getPlanStateById(stateId) {
    const { data, error } = await supabase
      .from('plan_states')
      .select('*')
      .eq('id', stateId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async #getPlanStateByCode(planTypeId, code) {
    const { data, error } = await supabase
      .from('plan_states')
      .select('*')
      .eq('plan_type_id', planTypeId)
      .eq('code', code)
      .single();
    if (error) throw new Error('Estado inválido para el tipo de plan');
    return data;
  }

  async #getPlanStateBySlug(planTypeId, slug) {
    const { data, error } = await supabase
      .from('plan_states')
      .select('*')
      .eq('plan_type_id', planTypeId)
      .eq('slug', slug)
      .single();
    if (error) throw new Error('Estado inválido para el tipo de plan');
    return data;
  }

  #isValidTransition(planTypeId, currentCode, nextCode) {
    // Reglas: Predefinido (1): 0->1->2 (terminal 2)
    //         Personalizado (2): 0->1->2->3 (terminal 3)
    if (planTypeId === 1) {
      if (currentCode === 0 && nextCode === 1) return true;
      if (currentCode === 1 && nextCode === 2) return true;
      return currentCode === nextCode; // idempotencia
    }
    if (planTypeId === 2) {
      if (currentCode === 0 && nextCode === 1) return true;
      if (currentCode === 1 && nextCode === 2) return true;
      if (currentCode === 2 && nextCode === 3) return true;
      return currentCode === nextCode;
    }
    return false;
  }

  async #expandPlan(planRow) {
    if (!planRow) return null;
    const planType = await this.#getPlanType(planRow.plan_type_id);
    const planState = await this.#getPlanStateById(planRow.plan_state_id);
    return {
      ...planRow,
      tipoPlan: { id: planType.id, slug: planType.slug, name: planType.name },
      estado: { id: planState.id, code: planState.code, slug: planState.slug, name: planState.name }
    };
  }
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

  async iniciarPlan(idPlan, currentUserId) {
    console.log('[iniciarPlan] idPlan:', idPlan, 'currentUserId:', currentUserId, 'type currentUserId:', typeof currentUserId);
    
    // 1) Traer datos mínimos del plan
    const { data: plan, error: getError } = await supabase
      .from('Planes')
      .select('idPlan, idAnfitrion, plan_type_id, plan_state_id, inicioPlan')
      .eq('idPlan', idPlan)
      .single();
    if (getError || !plan) throw new Error('Plan no encontrado');

    console.log('[iniciarPlan] plan completo:', plan);
    console.log('[iniciarPlan] plan.idAnfitrion:', plan.idAnfitrion, 'type plan.idAnfitrion:', typeof plan.idAnfitrion);

    // 2) Validar permisos: solo el anfitrión puede iniciar
    // Convertir ambos a string para comparación segura
    const anfitrionStr = String(plan.idAnfitrion);
    const currentUserStr = String(currentUserId);
    
    console.log('[iniciarPlan] Comparación:');
    console.log('  - anfitrionStr:', anfitrionStr, '(tipo:', typeof anfitrionStr, ')');
    console.log('  - currentUserStr:', currentUserStr, '(tipo:', typeof currentUserStr, ')');
    console.log('  - Son iguales?', anfitrionStr === currentUserStr);
    
    if (anfitrionStr !== currentUserStr) {
      console.log('[iniciarPlan] No autorizado - anfitrionStr:', anfitrionStr, 'currentUserStr:', currentUserStr);
      throw new Error('No autorizado para iniciar este plan');
    }

    // Obtener estado actual
    const currentState = await this.#getPlanStateById(plan.plan_state_id);
    // Para compatibilidad, iniciarPlan avanza un paso si aplica (0->1 o 1->2 para predefinido; 0->1 o 1->2 para personalizado)
    const nextCode = currentState.code + 1;
    const allowed = this.#isValidTransition(plan.plan_type_id, currentState.code, nextCode);
    if (!allowed) return await this.#expandPlan(plan);
    const nextState = await this.#getPlanStateByCode(plan.plan_type_id, nextCode);
    const { data: updated, error: updError } = await supabase
      .from('Planes')
      .update({
        plan_state_id: nextState.id,
        inicioPlan: plan.inicioPlan ?? new Date().toISOString()
      })
      .eq('idPlan', idPlan)
      .select()
      .single();
    if (updError) throw new Error(updError.message);
    return await this.#expandPlan(updated);
  }

  async obtenerPlan(idPlan) {
    const { data, error } = await supabase
      .from('Planes')
      .select('*')
      .eq('idPlan', idPlan)
      .single();
    if (error) throw new Error(error.message);
    return await this.#expandPlan(data);
  }

  async detallePlan(idPlan, currentUserId) {
    // 1. Traer el plan
    const { data: plan, error: planError } = await supabase
      .from('Planes')
      .select('*')
      .eq('idPlan', idPlan)
      .single();
    if (planError || !plan) throw new Error('Plan no encontrado');
    // 2. Traer los participantes con perfil y ubicación de salida
    const { data: participantes, error: partError } = await supabase
      .from('ParticipantePlan')
      .select('idPerfil, estadoParticipante, idLugarSalida, perfiles: idPerfil (id, nombre, username, foto)')
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
      anfitrion: row.idPerfil === plan.idAnfitrion,
      idLugarSalida: row.idLugarSalida || null // Incluir ubicación de salida
    }));

    // 4. Determinar el estado del usuario actual dentro del plan
    const miParticipacion = participantes.find(p => p.idPerfil === currentUserId);
    const miEstadoParticipante = miParticipacion?.estadoParticipante ?? (currentUserId === plan.idAnfitrion ? 1 : null);

    const expanded = await this.#expandPlan(plan);
    return { ...expanded, participantes: participantesList, miEstadoParticipante };
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
    
    // 2. Buscar todos los planes donde es anfitrión o participante
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
    
    // 4. Obtener los planes con participantes y perfiles en una sola consulta
    const { data: planes, error: planesError } = await supabase
      .from('Planes')
      .select(`
        idPlan, nombrePlan, descPlan, idLugar, inicioPlan, finPlan, idAnfitrion, plan_type_id, plan_state_id, fechaCreacion,
        participantes:ParticipantePlan (
          idPerfil,
          estadoParticipante,
          perfil:perfiles (
            id, nombre, username, foto
          )
        )
      `)
      .or(filters.join(','))
      .order('fechaCreacion', { ascending: false })
      .range(offset, offset + limit - 1);
    if (planesError) throw new Error(planesError.message);
    
    // 5. Mapear los datos para el frontend
    const planesConParticipantes = [];
    for (const plan of planes) {
      const expanded = await this.#expandPlan(plan);
      planesConParticipantes.push({
        idPlan: expanded.idPlan,
        nombrePlan: expanded.nombrePlan,
        descPlan: expanded.descPlan,
        idLugar: expanded.idLugar,
        inicioPlan: expanded.inicioPlan,
        finPlan: expanded.finPlan,
        idAnfitrion: expanded.idAnfitrion,
        tipoPlan: expanded.tipoPlan,
        estado: expanded.estado,
        fechaCreacion: expanded.fechaCreacion,
        participantes: (plan.participantes || []).map(p => ({
          id: p.idPerfil,
          nombre: p.perfil?.nombre,
          username: p.perfil?.username,
          avatarUrl: p.perfil?.foto,
          estadoParticipante: p.estadoParticipante
        }))
      });
    }
    
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

  async aceptarInvitacion(idPlan, idPerfil, idLugarSalida = null) {
    const updateData = { 
      estadoParticipante: 1 
    };
    
    // Agregar ubicación de salida si se proporciona
    if (idLugarSalida) {
      updateData.idLugarSalida = idLugarSalida;
    }
    
    const { error } = await supabase
      .from('ParticipantePlan')
      .update(updateData)
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

  async cambiarEstadoPlan(idPlan, currentUserId, nuevoEstado) {
    // 1) Traer datos mínimos del plan
    const { data: plan, error: getError } = await supabase
      .from('Planes')
      .select('idPlan, idAnfitrion, plan_type_id, plan_state_id')
      .eq('idPlan', idPlan)
      .single();
    if (getError || !plan) throw new Error('Plan no encontrado');
    // 2) Validar permisos: solo el anfitrión puede cambiar el estado
    if (String(plan.idAnfitrion) !== String(currentUserId)) {
      throw new Error('No autorizado para cambiar el estado de este plan');
    }
    // 3) Resolver destino por code o slug
    const currentState = await this.#getPlanStateById(plan.plan_state_id);
    let targetState;
    if (typeof nuevoEstado === 'number') {
      targetState = await this.#getPlanStateByCode(plan.plan_type_id, nuevoEstado);
    } else if (typeof nuevoEstado === 'string') {
      const maybeNum = Number(nuevoEstado);
      if (!Number.isNaN(maybeNum)) {
        targetState = await this.#getPlanStateByCode(plan.plan_type_id, maybeNum);
      } else {
        targetState = await this.#getPlanStateBySlug(plan.plan_type_id, nuevoEstado);
      }
    } else if (nuevoEstado && typeof nuevoEstado === 'object') {
      if (nuevoEstado.code !== undefined) {
        targetState = await this.#getPlanStateByCode(plan.plan_type_id, nuevoEstado.code);
      } else if (nuevoEstado.slug) {
        targetState = await this.#getPlanStateBySlug(plan.plan_type_id, nuevoEstado.slug);
      }
    }
    if (!targetState) throw new Error('Formato de estado no soportado');

    // 4) Validar transición
    if (!this.#isValidTransition(plan.plan_type_id, currentState.code, targetState.code)) {
      throw new Error('Transición de estado inválida');
    }

    // 5) Actualizar el estado
    const { data: updated, error: updError } = await supabase
      .from('Planes')
      .update({ plan_state_id: targetState.id })
      .eq('idPlan', idPlan)
      .select()
      .single();
    if (updError) throw new Error(updError.message);
    return await this.#expandPlan(updated);
  }

  async votarLugar(idPlan, idPerfil, idLugar) {
    // Inserta o actualiza el voto del usuario para el plan
    // Si ya existe, actualiza el idLugar
    const { data, error } = await supabase
      .from('VotosLugar')
      .upsert({ idPlan, idPerfil, idLugar, fechaVoto: new Date().toISOString() }, { onConflict: ['idPlan', 'idPerfil'] })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async estadoVotacion(idPlan) {
    // 1. Obtener todos los votos para el plan
    const { data: votos, error: votosError } = await supabase
      .from('VotosLugar')
      .select('idPerfil, idLugar')
      .eq('idPlan', idPlan);
    if (votosError) throw new Error(votosError.message);
    // 2. Contar votos por lugar
    const conteo = {};
    votos.forEach(v => {
      conteo[v.idLugar] = (conteo[v.idLugar] || 0) + 1;
    });
    // 3. Obtener participantes del plan
    const { data: participantes, error: partError } = await supabase
      .from('ParticipantePlan')
      .select('idPerfil, perfiles: idPerfil (nombre, username, foto)')
      .eq('idPlan', idPlan);
    if (partError) throw new Error(partError.message);
    // 4. Quién votó y quién no
    const idsQueVotaron = new Set(votos.map(v => v.idPerfil));
    const listaParticipantes = participantes.map(p => ({
      idPerfil: p.idPerfil,
      nombre: p.perfiles?.nombre,
      username: p.perfiles?.username,
      foto: p.perfiles?.foto,
      voto: votos.find(v => v.idPerfil === p.idPerfil)?.idLugar || null
    }));
    // 5. Lugar ganador
    let lugarGanador = null;
    let maxVotos = 0;
    for (const [idLugar, cantidad] of Object.entries(conteo)) {
      if (cantidad > maxVotos) {
        maxVotos = cantidad;
        lugarGanador = idLugar;
      }
    }
    return {
      votos,
      conteo,
      participantes: listaParticipantes,
      lugarGanador,
      maxVotos
    };
  }

  async finalizarVotacion(idPlan, currentUserId) {
    // 1. Traer datos mínimos del plan
    const { data: plan, error: getError } = await supabase
      .from('Planes')
      .select('idPlan, idAnfitrion, plan_type_id, plan_state_id')
      .eq('idPlan', idPlan)
      .single();
    if (getError || !plan) throw new Error('Plan no encontrado');
    if (String(plan.idAnfitrion) !== String(currentUserId)) {
      throw new Error('No autorizado para finalizar la votación de este plan');
    }
    // 2. Obtener votos
    const { data: votos, error: votosError } = await supabase
      .from('VotosLugar')
      .select('idLugar')
      .eq('idPlan', idPlan);
    if (votosError) throw new Error(votosError.message);
    // 3. Calcular lugar ganador
    const conteo = {};
    votos.forEach(v => {
      conteo[v.idLugar] = (conteo[v.idLugar] || 0) + 1;
    });
    let lugarGanador = null;
    let maxVotos = 0;
    for (const [idLugar, cantidad] of Object.entries(conteo)) {
      if (cantidad > maxVotos) {
        maxVotos = cantidad;
        lugarGanador = idLugar;
      }
    }
    if (!lugarGanador) throw new Error('No hay votos registrados');
    // 4. Actualizar el plan con el lugar ganador y avanzar al siguiente estado válido
    const currentState = await this.#getPlanStateById(plan.plan_state_id);
    const nextCode = currentState.code + 1; // personalizado: 2->3
    const allowed = this.#isValidTransition(plan.plan_type_id, currentState.code, nextCode);
    const updates = { idLugar: lugarGanador };
    if (allowed) {
      const nextState = await this.#getPlanStateByCode(plan.plan_type_id, nextCode);
      updates.plan_state_id = nextState.id;
    }
    const { data: updated, error: updError } = await supabase
      .from('Planes')
      .update(updates)
      .eq('idPlan', idPlan)
      .select()
      .single();
    if (updError) throw new Error(updError.message);
    return await this.#expandPlan(updated);
  }
} 