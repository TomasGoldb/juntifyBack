import express from 'express';
import { UserService } from '../services/user-service.js';
import { authenticateToken } from '../middlewares/authentication-middleware.js';

const router = express.Router();
const userService = new UserService();

// Obtener amigos del usuario
router.get('/amigos/:userId', authenticateToken, async (req, res) => {
  await userService.obtenerAmigos(req, res);
});

export default router;
