import express from 'express';
import { MetricsController } from '../controllers/metrics-controller.js';
import { authenticateToken } from '../middlewares/authentication-middleware.js';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Endpoints de métricas
router.post('/events', MetricsController.receiveEvents);
router.get('/screens', MetricsController.getScreenMetrics);
router.get('/plans', MetricsController.getPlanMetrics);
router.get('/performance', MetricsController.getPerformanceMetrics);
router.get('/users', MetricsController.getUserMetrics);
router.get('/errors', MetricsController.getErrorMetrics);
router.get('/dashboard', MetricsController.getDashboard);

export default router;
