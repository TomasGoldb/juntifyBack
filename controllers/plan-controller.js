import express from 'express';
import { PlanService } from '../services/plan-service.js';

const router = express.Router();
const planService = new PlanService();

router.post('/crear', (req, res) => planService.crearPlan(req, res));
router.get('/:idPlan', (req, res) => planService.obtenerPlan(req, res));
router.get('/:idPlan/detalle', (req, res) => planService.detallePlan(req, res));
router.get('/usuario/:userId', (req, res) => planService.planesDeUsuario(req, res));
router.get('/usuario/:userId/mas', (req, res) => planService.cargarMasPlanes(req, res));
router.get('/usuario/:userId/invitaciones-pendientes', (req, res) => planService.invitacionesPendientes(req, res));
router.get('/:idPlan/participacion/:idPerfil', (req, res) => planService.obtenerEstadoParticipacion(req, res));
router.post('/aceptar-invitacion', (req, res) => planService.aceptarInvitacion(req, res));
router.post('/declinar-invitacion', (req, res) => planService.declinarInvitacion(req, res));
router.delete('/:idPlan', (req, res) => planService.eliminarPlan(req, res));

export default router; 