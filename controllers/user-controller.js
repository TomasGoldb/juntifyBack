import express from 'express';
import { UserService } from '../services/user-service.js';

const router = express.Router();
const userService = new UserService();

// Obtener amigos del usuario
router.get('/amigos/:userId', async (req, res) => {
  await userService.obtenerAmigos(req, res);
});

export default router;
