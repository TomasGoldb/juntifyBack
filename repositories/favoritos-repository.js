import { supabase } from '../configs/db-config.js';

export class FavoritosRepository {
  async upsertLugar({ idLugar, nombre, direccion, latitud, longitud, rating, foto_url }) {
    const upsertRow = { idLugar, nombre, direccion, latitud, longitud, rating, foto_url };
    const { data, error } = await supabase
      .from('Lugares')
      .upsert([upsertRow], { onConflict: 'idLugar' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async agregarFavorito(idPerfil, idLugar) {
    const { data, error } = await supabase
      .from('Favoritos')
      .upsert({ IdPerfil: idPerfil, IdLugar: idLugar }, { onConflict: ['IdPerfil', 'IdLugar'] })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async eliminarFavorito(idPerfil, idLugar) {
    const { error } = await supabase
      .from('Favoritos')
      .delete()
      .eq('IdPerfil', idPerfil)
      .eq('IdLugar', idLugar);
    if (error) throw new Error(error.message);
  }

  async listarFavoritos(idPerfil) {
    const { data, error } = await supabase
      .from('Favoritos')
      .select('id, IdLugar, Lugares:IdLugar(idLugar, nombre, foto_url, rating)')
      .eq('IdPerfil', idPerfil);
    if (error) throw new Error(error.message);
    return data || [];
  }
}


