import express from 'express';
import { NotificacionService } from '../services/notificacion-service.js';

const router = express.Router();
const notificacionService = new NotificacionService();

router.post('/agregar', (req, res) => notificacionService.agregarNotificacion(req, res));
router.delete('/borrar', (req, res) => notificacionService.borrarNotificacion(req, res));
router.get('/:idPerfil', (req, res) => notificacionService.listarNotificaciones(req, res));
router.get('/todas/:idPerfil', (req, res) => notificacionService.listarTodasNotificaciones(req, res));
router.get('/noti/:idNoti', (req, res) => notificacionService.obtenerNotificacion(req, res));
router.put('/marcar-leida', (req, res) => notificacionService.marcarComoLeida(req, res));

export default router; 