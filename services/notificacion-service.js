import { NotificacionRepository } from '../repositories/notificacion-repository.js';

export class NotificacionService {
  constructor() {
    this.notificacionRepository = new NotificacionRepository();
  }

  async agregarNotificacion(req, res) {
    const { idPerfil, textoNoti, idTipoNoti, idUsuario = null, idPlan = null } = req.body;
    if (!idPerfil || !textoNoti || !idTipoNoti) {
      return res.status(400).json({ error: 'Faltan parámetros' });
    }
    try {
      const notificacion = await this.notificacionRepository.agregarNotificacion({ idPerfil, textoNoti, idTipoNoti, idUsuario, idPlan });
      res.json({ success: true, notificacion });
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async borrarNotificacion(req, res) {
    const { idNoti, idPerfil } = req.body;
    if (!idNoti || !idPerfil) {
      return res.status(400).json({ error: 'Faltan parámetros: idNoti, idPerfil' });
    }
    try {
      await this.notificacionRepository.borrarNotificacion(idNoti, idPerfil);
      res.json({ success: true, message: 'Notificación borrada' });
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async listarNotificaciones(req, res) {
    const { idPerfil } = req.params;
    if (!idPerfil) {
      return res.status(400).json({ error: 'Falta el parámetro idPerfil' });
    }
    try {
      const notificaciones = await this.notificacionRepository.listarNotificaciones(idPerfil);
      res.json(notificaciones);
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async listarTodasNotificaciones(req, res) {
    const { idPerfil } = req.params;
    if (!idPerfil) {
      return res.status(400).json({ error: 'Falta el parámetro idPerfil' });
    }
    try {
      const notificaciones = await this.notificacionRepository.listarTodasNotificaciones(idPerfil);
      res.json(notificaciones);
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async obtenerNotificacion(req, res) {
    const { idNoti } = req.params;
    if (!idNoti) {
      return res.status(400).json({ error: 'Falta el parámetro idNoti' });
    }
    try {
      const notificacion = await this.notificacionRepository.obtenerNotificacion(idNoti);
      res.json(notificacion);
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async marcarComoLeida(req, res) {
    const { idNoti, idPerfil, leido = true } = req.body;
    if (!idNoti || !idPerfil) {
      return res.status(400).json({ error: 'Faltan parámetros: idNoti, idPerfil' });
    }
    try {
      const notificacion = await this.notificacionRepository.marcarComoLeida(idNoti, idPerfil, leido);
      res.json({ 
        success: true, 
        notificacion,
        message: leido ? 'Notificación marcada como leída' : 'Notificación marcada como no leída'
      });
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }
} 