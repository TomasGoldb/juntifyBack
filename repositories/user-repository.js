import { supabase } from '../configs/db-config.js';

export class UserRepository {
  async crearUsuario(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message ?? error);
    return data;
  }

  async insertarPerfil(userId, username, nombre, apellido) {
    const { error } = await supabase.from('perfiles').insert([{ id: userId, username, nombre, apellido }]);
    if (error) throw new Error(error.message ?? error);
  }

  async obtenerPerfilPorId(userId) {
    const { data, error } = await supabase.from('perfiles').select('*').eq('id', userId).single();
    if (error) throw new Error(error.message ?? error);
    return data;
  }

  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message ?? error);
    return data;
  }

  async obtenerAmigos(userId) {
    // Paso 1: Obtener relaciones aceptadas
    const { data: relaciones, error } = await supabase
      .from('Amigos')
      .select('idSolicitador, idReceptor, fecha_amigo')
      .eq('seAceptoSolicitud', true)
      .or(`idSolicitador.eq.${userId},idReceptor.eq.${userId}`);
    if (error) throw new Error(error.message ?? error);
    // Paso 2: Sacar los IDs de los amigos y mapear la fecha
    const amigosInfo = relaciones.map(row => ({
      id: row.idSolicitador === userId ? row.idReceptor : row.idSolicitador,
      fecha_amigo: row.fecha_amigo
    }));
    if (amigosInfo.length === 0) return [];
    // Paso 3: Obtener perfiles de esos amigos
    const { data: perfiles, error: errorPerfiles } = await supabase.from('perfiles').select('*').in('id', amigosInfo.map(a => a.id));
    if (errorPerfiles) throw new Error(errorPerfiles.message ?? errorPerfiles);
    // Paso 4: Unir perfil y fecha_amigo
    return perfiles.map(perfil => {
      const info = amigosInfo.find(a => a.id === perfil.id);
      return { ...perfil, fecha_amigo: info ? info.fecha_amigo : null };
    });
  }
}
