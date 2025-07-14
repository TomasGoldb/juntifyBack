import express from 'express';
import { UserService } from '../services/user-service.js';
import { authenticateToken } from '../middlewares/authentication-middleware.js';

const router = express.Router();
const userService = new UserService();

// Registro de usuario
router.post('/registro', async (req, res) => {
  await userService.registro(req, res);
});

// Login de usuario
router.post('/login', async (req, res) => {
  await userService.login(req, res);
});

// Obtener amigos del usuario
router.get('/amigos/:userId', authenticateToken, async (req, res) => {
  await userService.obtenerAmigos(req, res);
});

export default router;
