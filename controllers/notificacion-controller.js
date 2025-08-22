import express from 'express';
import { NotificacionService } from '../services/notificacion-service.js';
import { authenticateToken } from '../middlewares/authentication-middleware.js';

const router = express.Router();
const notificacionService = new NotificacionService();

router.post('/agregar', authenticateToken, (req, res) => notificacionService.agregarNotificacion(req, res));
router.get('/todas/:idPerfil', authenticateToken, (req, res) => notificacionService.listarTodasNotificaciones(req, res));
router.get('/noti/:idNoti', authenticateToken, (req, res) => notificacionService.obtenerNotificacion(req, res));
router.put('/:idNoti/leer', authenticateToken, (req, res) => notificacionService.marcarComoLeida(req, res));
router.put('/marcar-plan-leido', authenticateToken, (req, res) => notificacionService.marcarNotificacionPlanComoLeida(req, res));
router.delete('/:idNoti', authenticateToken, (req, res) => notificacionService.borrarNotificacion(req, res));
router.get('/:idPerfil', authenticateToken, (req, res) => notificacionService.listarNotificaciones(req, res));

export default router; 