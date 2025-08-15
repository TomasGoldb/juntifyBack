import { supabase } from '../configs/db-config.js';

export class UbicacionRepository {
  async actualizarUbicacion(idPlan, idPerfil, latitude, longitude, bateria = 100) {
    try {
      // Primero intentar usar la función si existe
      const { error: rpcError } = await supabase.rpc('actualizar_ubicacion_participante', {
        p_idPlan: idPlan,
        p_idPerfil: idPerfil,
        p_latitude: latitude,
        p_longitude: longitude,
        p_bateria: bateria
      });
      
      if (!rpcError) {
        return; // La función existe y funcionó
      }
      
      // Si la función no existe, usar operaciones SQL directas
      console.log('[UbicacionRepository] Función no encontrada, usando operaciones SQL directas');
      
      // Verificar si la tabla existe
      const { error: tableError } = await supabase
        .from('UbicacionParticipante')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.log('[UbicacionRepository] Tabla UbicacionParticipante no existe, saltando actualización de ubicación');
        return; // La tabla no existe, no hacer nada
      }
      
      // Intentar insertar primero
      const { error: insertError } = await supabase
        .from('UbicacionParticipante')
        .insert({
          idPlan: idPlan,
          idPerfil: idPerfil,
          latitude: latitude,
          longitude: longitude,
          bateria: bateria,
          timestamp: new Date().toISOString()
        });
      
      if (!insertError) {
        return; // Insert exitoso
      }
      
      // Si el insert falla por conflicto, hacer update
      if (insertError.code === '23505') { // Código de error de conflicto único
        const { error: updateError } = await supabase
          .from('UbicacionParticipante')
          .update({
            latitude: latitude,
            longitude: longitude,
            bateria: bateria,
            timestamp: new Date().toISOString()
          })
          .eq('idPlan', idPlan)
          .eq('idPerfil', idPerfil);
        
        if (updateError) throw new Error(updateError.message);
      } else {
        throw new Error(insertError.message);
      }
      
    } catch (error) {
      console.error('[UbicacionRepository] Error actualizando ubicación:', error);
      // No lanzar error para no interrumpir el flujo principal
      console.log('[UbicacionRepository] Continuando sin actualizar ubicación');
    }
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
