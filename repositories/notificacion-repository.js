import { supabase } from '../configs/db-config.js';

export class NotificacionRepository {
  async agregarNotificacion({ idPerfil, textoNoti, idTipoNoti, idUsuario, idPlan }) {
    const { data, error } = await supabase
      .from('Notificaciones')
      .insert([{ idPerfil, textoNoti, idTipoNoti, idUsuario, idPlan }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async borrarNotificacion(idNoti, idPerfil) {
    const { error } = await supabase
      .from('Notificaciones')
      .delete()
      .eq('idNoti', idNoti)
      .eq('idPerfil', idPerfil);
    if (error) throw new Error(error.message);
  }

  async listarNotificaciones(idPerfil) {
    const { data, error } = await supabase
      .from('Notificaciones')
      .select('idNoti, textoNoti, idTipoNoti, idPerfil, leido')
      .eq('idPerfil', idPerfil)
      .eq('leido', false)
      .order('idNoti', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  async listarTodasNotificaciones(idPerfil) {
    const { data, error } = await supabase
      .from('Notificaciones')
      .select('idNoti, textoNoti, idTipoNoti, idPerfil, leido')
      .eq('idPerfil', idPerfil)
      .order('idNoti', { ascending: false });
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
      const { data, error } = await supabase
        .from('Notificaciones')
        .update({ leido })
        .eq('idPlan', idPlan)
        .eq('idPerfil', idPerfil)
        .select();
      
      if (error) throw new Error(error.message);
      
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      // Si no encuentra la notificación, no es un error crítico
      console.log(`No se encontró notificación para plan ${idPlan} y perfil ${idPerfil}:`, error.message);
      return null;
    }
  }
} 