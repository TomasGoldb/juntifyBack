import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { supabase } from './configs/db-config.js';
dotenv.config();

import userController from './controllers/user-controller.js';
import planController from './controllers/plan-controller.js';
import notificacionController from './controllers/notificacion-controller.js';
import amigoController from './controllers/amigo-controller.js';
import blintController from './controllers/blint-controller.js';
import direccionController from './controllers/direccion-controller.js';
import ubicacionController from './controllers/ubicacion-controller.js';
import { authenticateToken } from './middlewares/authentication-middleware.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors({
  origin: true, // Permite todas las origenes
  credentials: true, // Permite cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token']
}));

app.get('/', (req, res) => {
  res.json('Bienvenido a la API de Juntify. La mayoría de los endpoints requieren autenticación con JWT.');
});

// Endpoint de prueba simple
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Servidor funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Endpoints públicos (login y registro)
import { UserService } from './services/user-service.js';
const userService = new UserService();
app.post('/api/users/registro', (req, res) => userService.registro(req, res));
app.post('/api/users/login', (req, res) => userService.login(req, res));
app.use('/api/blint', blintController);

// Endpoint de prueba para verificar autenticación
app.get('/api/test-auth', authenticateToken, (req, res) => {
  res.json({ 
    success: true, 
    message: 'Autenticación exitosa',
    user: req.user,
    userId: req.user?.userId,
    id: req.user?.id,
    idPerfil: req.user?.idPerfil
  });
});

// Endpoint de debug para ver qué headers están llegando
app.get('/api/debug-headers', (req, res) => {
  res.json({
    headers: req.headers,
    authorization: req.headers['authorization'],
    xAuthToken: req.headers['x-auth-token'],
    method: req.method,
    url: req.url
  });
});

// Endpoint de prueba simple para planes (sin autenticación temporalmente)
app.get('/api/planes-test/:idPlan/detalle', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Endpoint de prueba funcionando',
    idPlan: req.params.idPlan,
    headers: req.headers
  });
});

// Endpoint de debug para iniciar plan (temporal)
app.post('/api/planes-debug/:idPlan/iniciar', authenticateToken, async (req, res) => {
  try {
    console.log('[DEBUG] Endpoint de debug iniciar plan');
    console.log('[DEBUG] req.user:', req.user);
    console.log('[DEBUG] req.params.idPlan:', req.params.idPlan);
    
    // Importar el servicio de planes
    import('./services/plan-service.js').then(({ PlanService }) => {
      const planService = new PlanService();
      planService.iniciarPlan(req, res);
    });
  } catch (error) {
    console.error('[DEBUG] Error en endpoint debug:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint de debug para ver datos del plan
app.get('/api/planes-debug/:idPlan/datos', authenticateToken, async (req, res) => {
  try {
    console.log('[DEBUG] Consultando datos del plan');
    console.log('[DEBUG] req.user:', req.user);
    console.log('[DEBUG] req.params.idPlan:', req.params.idPlan);
    
    // Importar el repositorio de planes
    import('./repositories/plan-repository.js').then(({ PlanRepository }) => {
      const planRepository = new PlanRepository();
      
      // Obtener datos básicos del plan
      supabase
        .from('Planes')
        .select('idPlan, idAnfitrion, estado, inicioPlan')
        .eq('idPlan', req.params.idPlan)
        .single()
        .then(({ data: plan, error }) => {
          if (error) {
            console.log('[DEBUG] Error obteniendo plan:', error);
            res.status(404).json({ error: 'Plan no encontrado' });
            return;
          }
          
          console.log('[DEBUG] Plan encontrado:', plan);
          console.log('[DEBUG] Tipo de idAnfitrion:', typeof plan.idAnfitrion);
          console.log('[DEBUG] Tipo de userId:', typeof req.user.userId);
          
          res.json({
            plan,
            user: req.user,
            comparison: {
              idAnfitrion: plan.idAnfitrion,
              userId: req.user.userId,
              id: req.user.id,
              idPerfil: req.user.idPerfil,
              isEqual: plan.idAnfitrion === req.user.userId,
              isEqualAsString: String(plan.idAnfitrion) === String(req.user.userId)
            }
          });
        });
    });
  } catch (error) {
    console.error('[DEBUG] Error en endpoint debug datos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint de prueba para iniciar plan (sin base de datos)
app.post('/api/planes-test/:idPlan/iniciar', authenticateToken, (req, res) => {
  try {
    console.log('[TEST] Endpoint de prueba para iniciar plan');
    console.log('[TEST] req.user:', req.user);
    console.log('[TEST] req.params.idPlan:', req.params.idPlan);
    
    const currentUserId = req.user?.idPerfil || req.user?.id || req.user?.userId || null;
    console.log('[TEST] currentUserId:', currentUserId);
    
    if (!currentUserId) {
      return res.status(403).json({ error: 'No se pudo identificar al usuario' });
    }
    
    // Simular un plan de prueba
    const planTest = {
      idPlan: req.params.idPlan,
      idAnfitrion: currentUserId, // Asumir que el usuario es anfitrión para la prueba
      estado: 1,
      inicioPlan: new Date().toISOString()
    };
    
    console.log('[TEST] Plan de prueba:', planTest);
    console.log('[TEST] Comparación:', String(planTest.idAnfitrion) === String(currentUserId));
    
    res.json({ 
      success: true, 
      message: 'Plan iniciado (prueba)', 
      plan: { ...planTest, estado: 2 },
      debug: {
        currentUserId,
        idAnfitrion: planTest.idAnfitrion,
        comparison: String(planTest.idAnfitrion) === String(currentUserId)
      }
    });
  } catch (error) {
    console.error('[TEST] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rutas protegidas
app.use('/api/users', userController);
app.use('/api/planes', planController);
app.use('/api/notificaciones', notificacionController);
app.use('/api/amigos', amigoController);
// Direcciones (protegidas con autenticación)
app.use('/api/direcciones', authenticateToken, direccionController);
// Alias singular para compatibilidad
app.use('/api/direccion', authenticateToken, direccionController);
// Ubicación en tiempo real
app.use('/api', ubicacionController);


app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});