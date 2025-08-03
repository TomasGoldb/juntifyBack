import { PlanRepository } from '../repositories/plan-repository.js';

export class PlanService {
  constructor() {
    this.planRepository = new PlanRepository();
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
      const detalle = await this.planRepository.detallePlan(req.params.idPlan);
      if (!detalle) return res.status(404).json({ error: 'Plan no encontrado' });
      res.json(detalle);
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  }

  async planesDeUsuario(req, res) {
    try {
      const planes = await this.planRepository.planesDeUsuario(req.params.userId);
      res.json(planes);
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
      await this.planRepository.aceptarInvitacion(req.body.idPlan, req.body.idPerfil);
      res.json({ success: true, message: 'Invitación aceptada' });
    } catch (err) {
      res.status(500).json({ error: err.message || err });
    }
  }

  async declinarInvitacion(req, res) {
    try {
      await this.planRepository.declinarInvitacion(req.body.idPlan, req.body.idPerfil);
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