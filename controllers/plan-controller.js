import express from 'express';
import { PlanService } from '../services/plan-service.js';
import { authenticateToken } from '../middlewares/authentication-middleware.js';

const router = express.Router();
const planService = new PlanService();

router.post('/crear', (req, res) => planService.crearPlan(req, res));
router.post('/aceptar-invitacion', (req, res) => planService.aceptarInvitacion(req, res));
router.post('/declinar-invitacion', (req, res) => planService.declinarInvitacion(req, res));
router.post('/:idPlan/iniciar', authenticateToken, (req, res) => planService.iniciarPlan(req, res));
router.post('/:idPlan/votar-lugar', authenticateToken, (req, res) => planService.votarLugar(req, res));
router.post('/:idPlan/finalizar-votacion', authenticateToken, (req, res) => planService.finalizarVotacion(req, res));
router.patch('/:idPlan/estado', authenticateToken, (req, res) => planService.cambiarEstadoPlan(req, res));

router.get('/usuario/:userId', (req, res) => planService.planesDeUsuario(req, res));
router.get('/usuario/:userId/mas', (req, res) => planService.cargarMasPlanes(req, res));
router.get('/usuario/:userId/invitaciones-pendientes', (req, res) => planService.invitacionesPendientes(req, res));
router.get('/:idPlan/detalle', (req, res) => planService.detallePlan(req, res));
router.get('/:idPlan/participacion/:idPerfil', (req, res) => planService.obtenerEstadoParticipacion(req, res));
router.get('/:idPlan', (req, res) => planService.obtenerPlan(req, res));
router.get('/:idPlan/votacion', authenticateToken, (req, res) => planService.estadoVotacion(req, res));

router.delete('/:idPlan', (req, res) => planService.eliminarPlan(req, res));

export default router; 