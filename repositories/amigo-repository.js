import { supabase } from '../configs/db-config.js';

export class AmigoRepository {
  async existeRelacion(idSolicitador, idReceptor) {
    const { data, error } = await supabase
      .from('Amigos')
      .select('*')
      .or(`and(idSolicitador.eq.${idSolicitador},idReceptor.eq.${idReceptor}),and(idSolicitador.eq.${idReceptor},idReceptor.eq.${idSolicitador})`);
    if (error) throw new Error(error.message);
    return data && data.length > 0;
  }

  async solicitarAmistad(idSolicitador, idReceptor) {
    const { error } = await supabase
      .from('Amigos')
      .insert([{ idSolicitador, idReceptor, seAceptoSolicitud: false }]);
    if (error) throw new Error(error.message);
  }

  async aceptarSolicitud(idSolicitador, idReceptor) {
    const { error } = await supabase
      .from('Amigos')
      .update({ seAceptoSolicitud: true })
      .eq('idSolicitador', idSolicitador)
      .eq('idReceptor', idReceptor)
      .eq('seAceptoSolicitud', false);
    if (error) throw new Error(error.message);
  }

  async rechazarSolicitud(idSolicitador, idReceptor) {
    const { error } = await supabase
      .from('Amigos')
      .delete()
      .eq('idSolicitador', idSolicitador)
      .eq('idReceptor', idReceptor)
      .eq('seAceptoSolicitud', false);
    if (error) throw new Error(error.message);
  }

  async eliminarAmigo(userId, amigoId) {
    const { error } = await supabase
      .from('Amigos')
      .delete()
      .or(`and(idSolicitador.eq.${userId},idReceptor.eq.${amigoId}),and(idSolicitador.eq.${amigoId},idReceptor.eq.${userId})`)
      .eq('seAceptoSolicitud', true);
    if (error) throw new Error(error.message);
  }

  async buscarUsuarios(userId, query) {
    // 1. Traer ids de amigos/pendientes
    const { data: relaciones } = await supabase
      .from('Amigos')
      .select('idSolicitador, idReceptor')
      .or(`idSolicitador.eq.${userId},idReceptor.eq.${userId}`);
    const excluidos = new Set([userId]);
    if (relaciones) {
      relaciones.forEach(r => {
        excluidos.add(r.idSolicitador);
        excluidos.add(r.idReceptor);
      });
    }
    // 2. Buscar perfiles
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, username, nombre, apellido')
      .or(`username.ilike.%${query}%,nombre.ilike.%${query}%,apellido.ilike.%${query}%`)
      .not('id', 'in', `(${[...excluidos].join(',')})`);
    if (error) throw new Error(error.message);
    return data;
  }

  async solicitudesPendientes(userId) {
    const { data, error } = await supabase
      .from('Amigos')
      .select('idSolicitador, perfiles: idSolicitador (id, username, nombre, apellido, push_token)')
      .eq('idReceptor', userId)
      .eq('seAceptoSolicitud', false);
    if (error) throw new Error(error.message);
    return data.map(row => row.perfiles);
  }
} 