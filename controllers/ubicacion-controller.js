import express from 'express';
import { UbicacionService } from '../services/ubicacion-service.js';
import { authenticateToken } from '../middlewares/authentication-middleware.js';

const router = express.Router();
const ubicacionService = new UbicacionService();

// Rutas para ubicación en tiempo real
router.post('/planes/:idPlan/ubicacion', authenticateToken, (req, res) => ubicacionService.actualizarUbicacion(req, res));
router.get('/planes/:idPlan/participantes-ubicacion', authenticateToken, (req, res) => ubicacionService.obtenerUbicacionesParticipantes(req, res));
router.delete('/planes/:idPlan/ubicacion', authenticateToken, (req, res) => ubicacionService.eliminarUbicacion(req, res));

// Ruta para limpiar ubicaciones antiguas (puede ser llamada por un cron job)
router.post('/ubicacion/limpiar', authenticateToken, (req, res) => ubicacionService.limpiarUbicacionesAntiguas(req, res));

export default router;
