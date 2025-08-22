import { PlanRepository } from '../repositories/plan-repository.js';
import { NotificacionRepository } from '../repositories/notificacion-repository.js';
import { supabase } from '../configs/db-config.js';

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
      const idPlanParam = req.params.idPlan;
      const parsed = parseInt(idPlanParam);
      const idPlan = Number.isNaN(parsed) ? idPlanParam : parsed;
      const currentUserId = req.user?.idPerfil || req.user?.id || req.user?.userId || null;
      console.log('[detallePlan] idPlanParam=', idPlanParam, 'parsed=', idPlan, 'currentUserId=', currentUserId);
      const detalle = await this.planRepository.detallePlan(idPlan, currentUserId);
      if (!detalle) return res.status(404).json({ error: 'Plan no encontrado' });
      res.json(detalle);
    } catch (err) {
      console.error('[detallePlan] Error:', err);
      res.status(500).json({ error: err.message || 'No se pudo cargar el plan' });
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
      const { idPlan, idPerfil, idLugarSalida } = req.body;
      
      // 1. Aceptar la invitación con ubicación de salida
      await this.planRepository.aceptarInvitacion(idPlan, idPerfil, idLugarSalida);
      
      // 2. Marcar la notificación como leída usando la misma función de borrar
      try {
        const notificacion = await this.notificacionRepository.borrarNotificacion(null, idPerfil, idPlan);
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
      
      // 2. Marcar la notificación como leída usando la misma función de borrar
      try {
        const notificacion = await this.notificacionRepository.borrarNotificacion(null, idPerfil, idPlan);
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

  async iniciarPlan(req, res) {
    try {
      console.log('[iniciarPlan] req.user completo:', req.user);
      console.log('[iniciarPlan] req.user.userId:', req.user?.userId);
      console.log('[iniciarPlan] req.user.id:', req.user?.id);
      console.log('[iniciarPlan] req.user.idPerfil:', req.user?.idPerfil);
      console.log('[iniciarPlan] req.user.email:', req.user?.email);
      console.log('[iniciarPlan] Todos los campos de req.user:', Object.keys(req.user || {}));
      
      // Intentar obtener el userId de diferentes campos
      let currentUserId = req.user?.idPerfil || req.user?.id || req.user?.userId || null;
      
      // Si no encontramos userId, intentar obtenerlo del email
      if (!currentUserId && req.user?.email) {
        console.log('[iniciarPlan] Intentando obtener userId del email:', req.user.email);
        try {
          // Buscar el perfil por email
          const { data: perfil, error } = await supabase
            .from('perfiles')
            .select('id')
            .eq('email', req.user.email)
            .single();
          
          if (!error && perfil) {
            currentUserId = perfil.id;
            console.log('[iniciarPlan] userId obtenido del email:', currentUserId);
          }
        } catch (emailError) {
          console.log('[iniciarPlan] Error obteniendo userId del email:', emailError);
        }
      }
      
      console.log('[iniciarPlan] currentUserId final:', currentUserId, 'tipo:', typeof currentUserId);
      
      if (!currentUserId) {
        console.log('[iniciarPlan] ERROR: currentUserId es null o undefined');
        console.log('[iniciarPlan] req.user disponible:', req.user);
        console.log('[iniciarPlan] Campos disponibles:', Object.keys(req.user || {}));
        return res.status(403).json({ 
          error: 'No se pudo identificar al usuario',
          debug: {
            user: req.user,
            availableFields: Object.keys(req.user || {}),
            userId: req.user?.userId,
            id: req.user?.id,
            idPerfil: req.user?.idPerfil
          }
        });
      }
      
      const plan = await this.planRepository.iniciarPlan(req.params.idPlan, currentUserId);
      res.json({ success: true, message: 'Plan iniciado', plan });
    } catch (err) {
      const message = err.message || err;
      const status = message.includes('No autorizado') ? 403 : 400;
      console.log('[iniciarPlan] Error:', message, 'Status:', status);
      res.status(status).json({ error: message });
    }
  }

  async cambiarEstadoPlan(req, res) {
    try {
      const { estado } = req.body;
      const idPlan = req.params.idPlan;
      const currentUserId = req.user?.idPerfil || req.user?.id || req.user?.userId || null;
      if (!currentUserId) {
        return res.status(403).json({ error: 'No se pudo identificar al usuario' });
      }
      const result = await this.planRepository.cambiarEstadoPlan(idPlan, currentUserId, estado);
      res.json({ success: true, plan: result });
    } catch (err) {
      res.status(400).json({ error: err.message || err });
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

  async votarLugar(req, res) {
    try {
      const idPlan = req.params.idPlan;
      const { idLugar } = req.body;
      const currentUserId = req.user?.idPerfil || req.user?.id || req.user?.userId || null;
      if (!currentUserId) {
        return res.status(403).json({ error: 'No se pudo identificar al usuario' });
      }
      const result = await this.planRepository.votarLugar(idPlan, currentUserId, idLugar);
      res.json({ success: true, voto: result });
    } catch (err) {
      res.status(400).json({ error: err.message || err });
    }
  }

  async estadoVotacion(req, res) {
    try {
      const idPlan = req.params.idPlan;
      const currentUserId = req.user?.idPerfil || req.user?.id || req.user?.userId || null;
      if (!currentUserId) {
        return res.status(403).json({ error: 'No se pudo identificar al usuario' });
      }
      const result = await this.planRepository.estadoVotacion(idPlan);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message || err });
    }
  }

  async finalizarVotacion(req, res) {
    try {
      const idPlan = req.params.idPlan;
      const currentUserId = req.user?.idPerfil || req.user?.id || req.user?.userId || null;
      if (!currentUserId) {
        return res.status(403).json({ error: 'No se pudo identificar al usuario' });
      }
      const result = await this.planRepository.finalizarVotacion(idPlan, currentUserId);
      res.json({ success: true, plan: result });
    } catch (err) {
      res.status(400).json({ error: err.message || err });
    }
  }
} 