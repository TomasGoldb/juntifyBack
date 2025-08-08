import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();

import userController from './controllers/user-controller.js';
import planController from './controllers/plan-controller.js';
import notificacionController from './controllers/notificacion-controller.js';
import amigoController from './controllers/amigo-controller.js';
import blintController from './controllers/blint-controller.js';
import { authenticateToken } from './middlewares/authentication-middleware.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

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

// Rutas protegidas con middleware de autenticación
app.use('/api/users', authenticateToken, userController);
app.use('/api/planes', authenticateToken, planController);
app.use('/api/notificaciones', authenticateToken, notificacionController);
app.use('/api/amigos', authenticateToken, amigoController);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});