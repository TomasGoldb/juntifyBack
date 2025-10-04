import { supabase } from '../configs/db-config.js';

export class MetricsService {
  /**
   * Procesar eventos de métricas
   */
  static async processEvents(events) {
    let processed = 0;
    let failed = 0;

    for (const event of events) {
      try {
        await this.saveEvent(event);
        processed++;
      } catch (error) {
        console.error('Error guardando evento:', error);
        failed++;
      }
    }

    return { processed, failed };
  }

  /**
   * Guardar evento en base de datos
   */
  static async saveEvent(event) {
    const { data, error } = await supabase
      .from('user_metrics')
      .insert([{
        event_id: event.id,
        event_name: event.event,
        user_id: event.properties.userId,
        session_id: event.properties.sessionId,
        properties: event.properties,
        created_at: new Date(event.properties.timestamp)
      }]);

    if (error) throw error;
    return data;
  }

  /**
   * Obtener métricas de pantallas
   */
  static async getScreenMetrics({ startDate, endDate, userId }) {
    let query = supabase
      .from('user_metrics')
      .select('*')
      .eq('event_name', 'screen_view');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Agrupar por pantalla
    const screenStats = {};
    data.forEach(event => {
      const screen = event.properties.screen;
      if (!screenStats[screen]) {
        screenStats[screen] = {
          views: 0,
          uniqueUsers: new Set(),
          avgTime: 0,
          totalTime: 0
        };
      }
      screenStats[screen].views++;
      screenStats[screen].uniqueUsers.add(event.user_id);
    });

    // Convertir a formato de respuesta
    return Object.entries(screenStats).map(([screen, stats]) => ({
      screen,
      views: stats.views,
      uniqueUsers: stats.uniqueUsers.size,
      avgTime: stats.avgTime
    }));
  }

  /**
   * Obtener métricas de planes
   */
  static async getPlanMetrics({ startDate, endDate, userId }) {
    let query = supabase
      .from('user_metrics')
      .select('*')
      .in('event_name', ['plan_creation', 'plan_completion']);

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) throw error;

    const planStats = {
      totalCreations: 0,
      personalizadoCreations: 0,
      predefinidoCreations: 0,
      completions: 0,
      completionRate: 0,
      stepStats: {}
    };

    data.forEach(event => {
      if (event.event_name === 'plan_creation') {
        planStats.totalCreations++;
        if (event.properties.planType === 'personalizado') {
          planStats.personalizadoCreations++;
        } else if (event.properties.planType === 'predefinido') {
          planStats.predefinidoCreations++;
        }
        
        // Estadísticas por paso
        const step = event.properties.step;
        if (step) {
          if (!planStats.stepStats[step]) {
            planStats.stepStats[step] = 0;
          }
          planStats.stepStats[step]++;
        }
      } else if (event.event_name === 'plan_completion') {
        planStats.completions++;
      }
    });

    planStats.completionRate = planStats.totalCreations > 0 
      ? (planStats.completions / planStats.totalCreations) * 100 
      : 0;

    return planStats;
  }

  /**
   * Obtener métricas de rendimiento
   */
  static async getPerformanceMetrics({ startDate, endDate }) {
    let query = supabase
      .from('user_metrics')
      .select('*')
      .in('event_name', ['load_time', 'error']);

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error } = await query;
    if (error) throw error;

    const performanceStats = {
      avgLoadTime: 0,
      errorCount: 0,
      errorRate: 0,
      componentStats: {},
      totalEvents: data.length
    };

    let totalLoadTime = 0;
    let loadTimeCount = 0;

    data.forEach(event => {
      if (event.event_name === 'load_time') {
        totalLoadTime += event.properties.duration;
        loadTimeCount++;
        
        const component = event.properties.component;
        if (!performanceStats.componentStats[component]) {
          performanceStats.componentStats[component] = {
            avgTime: 0,
            count: 0,
            totalTime: 0
          };
        }
        performanceStats.componentStats[component].count++;
        performanceStats.componentStats[component].totalTime += event.properties.duration;
        performanceStats.componentStats[component].avgTime = 
          performanceStats.componentStats[component].totalTime / performanceStats.componentStats[component].count;
      } else if (event.event_name === 'error') {
        performanceStats.errorCount++;
      }
    });

    performanceStats.avgLoadTime = loadTimeCount > 0 ? totalLoadTime / loadTimeCount : 0;
    performanceStats.errorRate = data.length > 0 ? (performanceStats.errorCount / data.length) * 100 : 0;

    return performanceStats;
  }

  /**
   * Obtener métricas de usuarios
   */
  static async getUserMetrics({ startDate, endDate, userId }) {
    let query = supabase
      .from('user_metrics')
      .select('*');

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) throw error;

    const userStats = {
      totalUsers: new Set(),
      totalSessions: new Set(),
      avgSessionDuration: 0,
      totalEvents: data.length,
      userActivity: {}
    };

    let totalSessionDuration = 0;
    let sessionCount = 0;

    data.forEach(event => {
      if (event.user_id) {
        userStats.totalUsers.add(event.user_id);
      }
      if (event.session_id) {
        userStats.totalSessions.add(event.session_id);
      }

      // Calcular duración de sesión si es evento de fin de sesión
      if (event.event_name === 'session_end' && event.properties.duration) {
        totalSessionDuration += event.properties.duration;
        sessionCount++;
      }

      // Actividad por usuario
      if (event.user_id) {
        if (!userStats.userActivity[event.user_id]) {
          userStats.userActivity[event.user_id] = {
            events: 0,
            sessions: new Set(),
            lastActivity: event.created_at
          };
        }
        userStats.userActivity[event.user_id].events++;
        if (event.session_id) {
          userStats.userActivity[event.user_id].sessions.add(event.session_id);
        }
        if (new Date(event.created_at) > new Date(userStats.userActivity[event.user_id].lastActivity)) {
          userStats.userActivity[event.user_id].lastActivity = event.created_at;
        }
      }
    });

    userStats.totalUsers = userStats.totalUsers.size;
    userStats.totalSessions = userStats.totalSessions.size;
    userStats.avgSessionDuration = sessionCount > 0 ? totalSessionDuration / sessionCount : 0;

    return userStats;
  }

  /**
   * Obtener métricas de errores
   */
  static async getErrorMetrics({ startDate, endDate, userId }) {
    let query = supabase
      .from('user_metrics')
      .select('*')
      .eq('event_name', 'error');

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) throw error;

    const errorStats = {
      totalErrors: data.length,
      errorTypes: {},
      componentErrors: {},
      userErrors: {}
    };

    data.forEach(event => {
      const errorMessage = event.properties.error;
      const component = event.properties.component;
      const userId = event.user_id;

      // Tipos de error
      if (errorMessage) {
        if (!errorStats.errorTypes[errorMessage]) {
          errorStats.errorTypes[errorMessage] = 0;
        }
        errorStats.errorTypes[errorMessage]++;
      }

      // Errores por componente
      if (component) {
        if (!errorStats.componentErrors[component]) {
          errorStats.componentErrors[component] = 0;
        }
        errorStats.componentErrors[component]++;
      }

      // Errores por usuario
      if (userId) {
        if (!errorStats.userErrors[userId]) {
          errorStats.userErrors[userId] = 0;
        }
        errorStats.userErrors[userId]++;
      }
    });

    return errorStats;
  }

  /**
   * Obtener dashboard completo
   */
  static async getDashboard({ startDate, endDate, userId }) {
    const [screenMetrics, planMetrics, performanceMetrics, userMetrics, errorMetrics] = await Promise.all([
      this.getScreenMetrics({ startDate, endDate, userId }),
      this.getPlanMetrics({ startDate, endDate, userId }),
      this.getPerformanceMetrics({ startDate, endDate }),
      this.getUserMetrics({ startDate, endDate, userId }),
      this.getErrorMetrics({ startDate, endDate, userId })
    ]);

    return {
      screens: screenMetrics,
      plans: planMetrics,
      performance: performanceMetrics,
      users: userMetrics,
      errors: errorMetrics,
      generatedAt: new Date().toISOString(),
      period: {
        startDate: startDate || 'N/A',
        endDate: endDate || 'N/A'
      }
    };
  }
}
