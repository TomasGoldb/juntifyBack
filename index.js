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

// Endpoints públicos
app.use('/api/users/registro', userController);
app.use('/api/users/login', userController);

// Middleware global para proteger el resto de rutas
app.use(authenticateToken);

// Rutas protegidas
app.use('/api/users', userController);
app.use('/api/planes', planController);
app.use('/api/notificaciones', notificacionController);
app.use('/api/amigos', amigoController);
app.use('/api/blint', blintController);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});