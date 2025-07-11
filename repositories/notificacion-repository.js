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
      .select('idNoti, textoNoti, idTipoNoti, idPerfil')
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
} 