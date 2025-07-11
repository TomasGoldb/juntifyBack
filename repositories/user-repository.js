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
      .select('idSolicitador, idReceptor')
      .eq('seAceptoSolicitud', true)
      .or(`idSolicitador.eq.${userId},idReceptor.eq.${userId}`);
    if (error) throw new Error(error.message ?? error);
    // Paso 2: Sacar los IDs de los amigos
    const amigoIds = relaciones.map(row => row.idSolicitador === userId ? row.idReceptor : row.idSolicitador);
    if (amigoIds.length === 0) return [];
    // Paso 3: Obtener perfiles de esos amigos
    const { data: perfiles, error: errorPerfiles } = await supabase.from('perfiles').select('*').in('id', amigoIds);
    if (errorPerfiles) throw new Error(errorPerfiles.message ?? errorPerfiles);
    return perfiles;
  }
}
