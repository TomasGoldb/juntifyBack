import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();

import userController from './controllers/user-controller.js';
import planController from './controllers/plan-controller.js';
import notificacionController from './controllers/notificacion-controller.js';
import amigoController from './controllers/amigo-controller.js';
import blintController from './controllers/blint-controller.js';
import direccionController from './controllers/direccion-controller.js';
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
    user: req.user 
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

// Rutas protegidas
app.use('/api/users', userController);
app.use('/api/planes', planController);
app.use('/api/notificaciones', notificacionController);
app.use('/api/amigos', amigoController);


app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});