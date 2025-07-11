import express from 'express';
import { AmigoService } from '../services/amigo-service.js';

const router = express.Router();
const amigoService = new AmigoService();

router.post('/solicitud', (req, res) => amigoService.solicitarAmistad(req, res));
router.post('/aceptar', (req, res) => amigoService.aceptarSolicitud(req, res));
router.post('/rechazar', (req, res) => amigoService.rechazarSolicitud(req, res));
router.post('/eliminar', (req, res) => amigoService.eliminarAmigo(req, res));
router.get('/buscar/:userId/:query', (req, res) => amigoService.buscarUsuarios(req, res));
router.get('/pendientes/:userId', (req, res) => amigoService.solicitudesPendientes(req, res));

export default router; 