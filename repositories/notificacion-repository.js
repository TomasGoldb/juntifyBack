import { supabase } from '../configs/db-config.js';

export class NotificacionRepository {
  async agregarNotificacion({ idPerfil, textoNoti, idTipoNoti, idUsuario, idPlan }) {
    const { data, error } = await supabase
      .from('Notificaciones')
      .insert([{ idPerfil, textoNoti, idTipoNoti, idUsuario, idPlan, leido: false }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async borrarNotificacion(idNoti, idPerfil, idPlan = null) {
    // Eliminar físicamente la notificación
    if (idNoti) {
      let query = supabase
        .from('Notificaciones')
        .delete()
        .eq('idNoti', idNoti);

      if (idPerfil) {
        query = query.eq('idPerfil', idPerfil);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return { success: true, message: 'Notificación eliminada' };
    }

    if (idPlan && idPerfil) {
      // Buscar notificación por plan + perfil y eliminar por idNoti encontrado
      const { data: notificaciones, error: searchError } = await supabase
        .from('Notificaciones')
        .select('idNoti')
        .eq('idPlan', parseInt(idPlan))
        .eq('idPerfil', String(idPerfil))
        .limit(1);

      if (searchError) throw new Error(searchError.message);
      if (!notificaciones || notificaciones.length === 0) return null;

      const foundIdNoti = notificaciones[0].idNoti;

      const { data, error } = await supabase
        .from('Notificaciones')
        .delete()
        .eq('idNoti', foundIdNoti);

      if (error) throw new Error(error.message);
      return { success: true, message: 'Notificación eliminada' };
    }

    throw new Error('Parámetros insuficientes: provea idNoti o (idPlan e idPerfil)');
  }

  async listarNotificaciones(idPerfil) {
    const { data, error } = await supabase
      .from('Notificaciones')
      .select('idNoti, textoNoti, idTipoNoti, idPerfil, idUsuario, idPlan, leido')
      .eq('idPerfil', idPerfil)
      .eq('leido', false)
      .order('idNoti', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  async listarTodasNotificaciones(idPerfil, includeRead = false) {
    let query = supabase
      .from('Notificaciones')
      .select('idNoti, textoNoti, idTipoNoti, idPerfil, idUsuario, idPlan, leido')
      .eq('idPerfil', idPerfil)
      .order('idNoti', { ascending: false });

    if (!includeRead) {
      query = query.eq('leido', false);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }

  async obtenerNotificacion(idNoti) {
    const { data, error } = await supabase
      .from('Notificaciones')
      .select('*')
      .eq('idNoti', idNoti)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async marcarComoLeida(idNoti, idPerfil, leido = true) {
    const { data, error } = await supabase
      .from('Notificaciones')
      .update({ leido })
      .eq('idNoti', idNoti)
      .eq('idPerfil', idPerfil)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async marcarNotificacionPlanComoLeida(idPlan, idPerfil, leido = true) {
    try {
      // Convertir a números si es necesario
      const planId = parseInt(idPlan);
      const perfilId = typeof idPerfil === 'string' ? idPerfil : idPerfil.toString();
      
      console.log(`=== DEBUG: marcarNotificacionPlanComoLeida ===`);
      console.log(`Plan ID: ${planId} (${typeof planId})`);
      console.log(`Perfil ID: ${perfilId} (${typeof perfilId})`);
      console.log(`Leído: ${leido} (${typeof leido})`);
      
      // Buscar la notificación
      const { data: notificaciones, error: searchError } = await supabase
        .from('Notificaciones')
        .select('*')
        .eq('idPlan', planId)
        .eq('idPerfil', perfilId);
      
      if (searchError) {
        console.log('Error al buscar notificación:', searchError.message);
        throw new Error(searchError.message);
      }
      
      console.log(`Notificaciones encontradas: ${notificaciones ? notificaciones.length : 0}`);
      
      if (!notificaciones || notificaciones.length === 0) {
        console.log('No se encontró notificación para actualizar');
        return null;
      }
      
      const notificacion = notificaciones[0];
      console.log('Notificación actual:', notificacion);
      console.log('Estado actual de leído:', notificacion.leido);
      
      // Actualizar la notificación usando el idNoti
      const { data: updatedNotif, error: updateError } = await supabase
        .from('Notificaciones')
        .update({ leido: leido })
        .eq('idNoti', notificacion.idNoti)
        .select()
        .single();
      
      if (updateError) {
        console.log('Error al actualizar notificación:', updateError.message);
        throw new Error(updateError.message);
      }
      
      console.log('Notificación actualizada exitosamente:', updatedNotif);
      console.log('Nuevo estado de leído:', updatedNotif.leido);
      console.log(`=== FIN DEBUG ===`);
      
      return updatedNotif;
    } catch (error) {
      console.log(`Error en marcarNotificacionPlanComoLeida:`, error.message);
      return null;
    }
  }
} 