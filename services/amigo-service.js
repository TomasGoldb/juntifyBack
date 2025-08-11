import { AmigoRepository } from '../repositories/amigo-repository.js';

export class AmigoService {
  constructor() {
    this.amigoRepository = new AmigoRepository();
  }

  getArgentinaIsoNow() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(now);
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    // Argentina (Buenos Aires) es UTC-03:00 sin DST
    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}-03:00`;
  }

  async solicitarAmistad(req, res) {
    const { idSolicitador, idReceptor } = req.body;
    if (idSolicitador === idReceptor) return res.status(400).json({ error: 'No puedes agregarte a ti mismo' });
    try {
      const existe = await this.amigoRepository.existeRelacion(idSolicitador, idReceptor);
      if (existe) return res.status(400).json({ error: 'Ya existe una solicitud o son amigos' });
      await this.amigoRepository.solicitarAmistad(idSolicitador, idReceptor);
      res.json({ success: true, message: 'Solicitud enviada' });
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async aceptarSolicitud(req, res) {
    const { idSolicitador, idReceptor } = req.body;
    const fechaActual = this.getArgentinaIsoNow();
    console.log(fechaActual);
    try {
      await this.amigoRepository.aceptarSolicitud(idSolicitador, idReceptor, fechaActual);
      res.json({ success: true, message: 'Solicitud aceptada' });
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async rechazarSolicitud(req, res) {
    const { idSolicitador, idReceptor } = req.body;
    try {
      await this.amigoRepository.rechazarSolicitud(idSolicitador, idReceptor);
      res.json({ success: true, message: 'Solicitud rechazada' });
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async eliminarAmigo(req, res) {
    const { userId, amigoId } = req.body;
    try {
      await this.amigoRepository.eliminarAmigo(userId, amigoId);
      res.json({ success: true, message: 'Amigo eliminado' });
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async buscarUsuarios(req, res) {
    const { userId, query } = req.params;
    try {
      const usuarios = await this.amigoRepository.buscarUsuarios(userId, query);
      res.json(usuarios);
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async solicitudesPendientes(req, res) {
    const { userId } = req.params;
    try {
      const pendientes = await this.amigoRepository.solicitudesPendientes(userId);
      res.json(pendientes);
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }
} 