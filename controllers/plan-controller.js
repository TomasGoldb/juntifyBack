import express from 'express';
import { PlanService } from '../services/plan-service.js';
import { authenticateToken } from '../middlewares/authentication-middleware.js';

const router = express.Router();
const planService = new PlanService();

router.post('/crear', authenticateToken, (req, res) => planService.crearPlan(req, res));
router.get('/:idPlan', authenticateToken, (req, res) => planService.obtenerPlan(req, res));
router.get('/:idPlan/detalle', authenticateToken, (req, res) => planService.detallePlan(req, res));
router.get('/usuario/:userId', authenticateToken, (req, res) => planService.planesDeUsuario(req, res));
router.post('/aceptar-invitacion', authenticateToken, (req, res) => planService.aceptarInvitacion(req, res));
router.post('/declinar-invitacion', authenticateToken, (req, res) => planService.declinarInvitacion(req, res));
router.delete('/:idPlan', authenticateToken, (req, res) => planService.eliminarPlan(req, res));

export default router; 