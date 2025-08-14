import { supabase } from '../configs/db-config.js';

export class UbicacionRepository {
  async actualizarUbicacion(idPlan, idPerfil, latitude, longitude, bateria = 100) {
    const { error } = await supabase.rpc('actualizar_ubicacion_participante', {
      p_idPlan: idPlan,
      p_idPerfil: idPerfil,
      p_latitude: latitude,
      p_longitude: longitude,
      p_bateria: bateria
    });
    
    if (error) throw new Error(error.message);
  }

  async obtenerUbicacionesParticipantes(idPlan) {
    const { data, error } = await supabase
      .from('UbicacionParticipante')
      .select(`
        "idPlan",
        "idPerfil",
        latitude,
        longitude,
        timestamp,
        bateria,
        perfiles: "idPerfil" (
          id,
          nombre,
          username,
          foto
        )
      `)
      .eq('idPlan', idPlan)
      .order('timestamp', { ascending: false });

    if (error) throw new Error(error.message);
    
    // Transformar los datos para que sean más fáciles de usar en el frontend
    return data.map(item => ({
      id: item.idPerfil,
      nombre: item.perfiles?.nombre || `Usuario ${item.idPerfil}`,
      username: item.perfiles?.username || `user_${item.idPerfil}`,
      avatarUrl: item.perfiles?.foto || null,
      ubicacion: {
        latitude: parseFloat(item.latitude),
        longitude: parseFloat(item.longitude),
        timestamp: item.timestamp
      },
      bateria: item.bateria
    }));
  }

  async obtenerUbicacionUsuario(idPlan, idPerfil) {
    const { data, error } = await supabase
      .from('UbicacionParticipante')
      .select('*')
      .eq('idPlan', idPlan)
      .eq('idPerfil', idPerfil)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async eliminarUbicacion(idPlan, idPerfil) {
    const { error } = await supabase
      .from('UbicacionParticipante')
      .delete()
      .eq('idPlan', idPlan)
      .eq('idPerfil', idPerfil);

    if (error) throw new Error(error.message);
  }

  async limpiarUbicacionesAntiguas() {
    // Eliminar ubicaciones más antiguas de 24 horas
    const { error } = await supabase
      .from('UbicacionParticipante')
      .delete()
      .lt('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) throw new Error(error.message);
  }
}
