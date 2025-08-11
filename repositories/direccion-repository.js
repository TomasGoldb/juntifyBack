import { supabase } from '../configs/db-config.js';

export class DireccionRepository {
  async crearDireccion(idLugar, idUsuario, alias = null) {
    const { data, error } = await supabase
      .from('Direcciones')
      .insert([{ idLugar, idUsuario, alias }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async obtenerDireccionesPorUsuario(idUsuario) {
    const { data, error } = await supabase
      .from('Direcciones')
      .select('*')
      .eq('idUsuario', idUsuario)
      .order('id', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  async obtenerDireccionPorId(idDireccion, idUsuario) {
    const { data, error } = await supabase
      .from('Direcciones')
      .select('*')
      .eq('id', idDireccion)
      .eq('idUsuario', idUsuario)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async eliminarDireccion(idDireccion, idUsuario) {
    const { error } = await supabase
      .from('Direcciones')
      .delete()
      .eq('id', idDireccion)
      .eq('idUsuario', idUsuario);
    if (error) throw new Error(error.message);
  }
}


