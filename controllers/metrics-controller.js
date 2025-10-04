import { MetricsService } from '../services/metrics-service.js';

export class MetricsController {
  /**
   * Recibir eventos de métricas del frontend
   */
  static async receiveEvents(req, res) {
    try {
      const { events } = req.body;
      
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Se requiere un array de eventos' 
        });
      }

      // Procesar eventos
      const results = await MetricsService.processEvents(events);
      
      res.json({
        success: true,
        processed: results.processed,
        failed: results.failed
      });
    } catch (error) {
      console.error('Error procesando métricas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener métricas de pantallas
   */
  static async getScreenMetrics(req, res) {
    try {
      const { startDate, endDate, userId } = req.query;
      
      const metrics = await MetricsService.getScreenMetrics({
        startDate,
        endDate,
        userId
      });
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error obteniendo métricas de pantallas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener métricas de planes
   */
  static async getPlanMetrics(req, res) {
    try {
      const { startDate, endDate, userId } = req.query;
      
      const metrics = await MetricsService.getPlanMetrics({
        startDate,
        endDate,
        userId
      });
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error obteniendo métricas de planes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener métricas de rendimiento
   */
  static async getPerformanceMetrics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      const metrics = await MetricsService.getPerformanceMetrics({
        startDate,
        endDate
      });
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error obteniendo métricas de rendimiento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener métricas de usuarios
   */
  static async getUserMetrics(req, res) {
    try {
      const { startDate, endDate, userId } = req.query;
      
      const metrics = await MetricsService.getUserMetrics({
        startDate,
        endDate,
        userId
      });
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error obteniendo métricas de usuarios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener dashboard de métricas
   */
  static async getDashboard(req, res) {
    try {
      const { startDate, endDate, userId } = req.query;
      
      const dashboard = await MetricsService.getDashboard({
        startDate,
        endDate,
        userId
      });
      
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      console.error('Error obteniendo dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener métricas de errores
   */
  static async getErrorMetrics(req, res) {
    try {
      const { startDate, endDate, userId } = req.query;
      
      const metrics = await MetricsService.getErrorMetrics({
        startDate,
        endDate,
        userId
      });
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Error obteniendo métricas de errores:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}
