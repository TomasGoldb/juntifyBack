import { PlanRepository } from '../repositories/plan-repository.js';
import { NotificacionRepository } from '../repositories/notificacion-repository.js';

export class PlanService {
  constructor() {
    this.planRepository = new PlanRepository();
    this.notificacionRepository = new NotificacionRepository();
  }

  async crearPlan(req, res) {
    try {
      const plan = await this.planRepository.crearPlan(req.body);
      res.json({ success: true, plan });
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  }

  async obtenerPlan(req, res) {
    try {
      const plan = await this.planRepository.obtenerPlan(req.params.idPlan);
      if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
      res.json(plan);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  }

  async detallePlan(req, res) {
    try {
      const currentUserId = req.user?.userId;
      const detalle = await this.planRepository.detallePlan(req.params.idPlan, currentUserId);
      if (!detalle) return res.status(404).json({ error: 'Plan no encontrado' });
      res.json(detalle);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  }

  async planesDeUsuario(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      
      const resultado = await this.planRepository.planesDeUsuario(req.params.userId, limit, offset);
      res.json(resultado);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  }

  async cargarMasPlanes(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      
      const resultado = await this.planRepository.planesDeUsuario(req.params.userId, limit, offset);
      res.json(resultado);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  }

  async invitacionesPendientes(req, res) {
    try {
      const invitaciones = await this.planRepository.invitacionesPendientes(req.params.userId);
      res.json(invitaciones);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  }

  async obtenerEstadoParticipacion(req, res) {
    try {
      const estado = await this.planRepository.obtenerEstadoParticipacion(
        req.params.idPlan, 
        req.params.idPerfil
      );
      res.json({ estadoParticipante: estado });
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  }

  async aceptarInvitacion(req, res) {
    try {
      const { idPlan, idPerfil } = req.body;
      
      // 1. Aceptar la invitación
      await this.planRepository.aceptarInvitacion(idPlan, idPerfil);
      
      // 2. Marcar la notificación como leída
      try {
        const notificacion = await this.notificacionRepository.marcarNotificacionPlanComoLeida(idPlan, idPerfil, true);
        if (notificacion) {
          console.log(`Notificación marcada como leída para plan ${idPlan} y perfil ${idPerfil}`);
        } else {
          console.log(`No se encontró notificación para marcar como leída (plan ${idPlan}, perfil ${idPerfil})`);
        }
      } catch (notifError) {
        console.log('Error al marcar notificación como leída:', notifError.message);
        // No fallamos si no se puede marcar la notificación
      }
      
      res.json({ success: true, message: 'Invitación aceptada' });
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  }

  async declinarInvitacion(req, res) {
    try {
      const { idPlan, idPerfil } = req.body;
      
      // 1. Rechazar la invitación
      await this.planRepository.declinarInvitacion(idPlan, idPerfil);
      
      // 2. Marcar la notificación como leída
      try {
        const notificacion = await this.notificacionRepository.marcarNotificacionPlanComoLeida(idPlan, idPerfil, true);
        if (notificacion) {
          console.log(`Notificación marcada como leída para plan ${idPlan} y perfil ${idPerfil}`);
        } else {
          console.log(`No se encontró notificación para marcar como leída (plan ${idPlan}, perfil ${idPerfil})`);
        }
      } catch (notifError) {
        console.log('Error al marcar notificación como leída:', notifError.message);
        // No fallamos si no se puede marcar la notificación
      }
      
      res.json({ success: true, message: 'Invitación rechazada' });
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  }

  async eliminarPlan(req, res) {
    try {
      await this.planRepository.eliminarPlan(req.params.idPlan);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  }
} 