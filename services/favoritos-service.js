import { FavoritosRepository } from '../repositories/favoritos-repository.js';

export class FavoritosService {
  constructor() {
    this.repo = new FavoritosRepository();
  }

  async upsertLugar(req, res) {
    try {
      const lugar = await this.repo.upsertLugar(req.body || {});
      res.json({ success: true, lugar });
    } catch (err) {
      res.status(400).json({ error: err.message || err });
    }
  }

  async agregarFavorito(req, res) {
    try {
      const currentUserId = req.user?.idPerfil || req.user?.id || req.user?.userId || null;
      if (!currentUserId) return res.status(403).json({ error: 'No se pudo identificar al usuario' });
      const { idLugar } = req.body || {};
      if (!idLugar) return res.status(400).json({ error: 'idLugar es requerido' });
      const fav = await this.repo.agregarFavorito(currentUserId, idLugar);
      res.json({ success: true, favorito: fav });
    } catch (err) {
      res.status(400).json({ error: err.message || err });
    }
  }

  async eliminarFavorito(req, res) {
    try {
      const currentUserId = req.user?.idPerfil || req.user?.id || req.user?.userId || null;
      if (!currentUserId) return res.status(403).json({ error: 'No se pudo identificar al usuario' });
      const { idLugar } = req.body || req.query || {};
      const idLugarParam = req.params?.idLugar || idLugar;
      if (!idLugarParam) return res.status(400).json({ error: 'idLugar es requerido' });
      await this.repo.eliminarFavorito(currentUserId, idLugarParam);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message || err });
    }
  }

  async listarFavoritos(req, res) {
    try {
      const currentUserId = req.user?.idPerfil || req.user?.id || req.user?.userId || null;
      if (!currentUserId) return res.status(403).json({ error: 'No se pudo identificar al usuario' });
      const lista = await this.repo.listarFavoritos(currentUserId);
      res.json({ success: true, favoritos: lista });
    } catch (err) {
      res.status(400).json({ error: err.message || err });
    }
  }
}


