import express from 'express';
import { FavoritosService } from '../services/favoritos-service.js';
import { authenticateToken } from '../middlewares/authentication-middleware.js';

const router = express.Router();
const service = new FavoritosService();

// Todas requieren auth
router.use(authenticateToken);

// Upsert de un lugar (para asegurar existencia antes de favorito)
router.post('/lugares/upsert', (req, res) => service.upsertLugar(req, res));

// Agregar a favoritos
router.post('/', (req, res) => service.agregarFavorito(req, res));

// Eliminar de favoritos
router.delete('/:idLugar', (req, res) => service.eliminarFavorito(req, res));

// Listar favoritos del usuario autenticado
router.get('/', (req, res) => service.listarFavoritos(req, res));

export default router;


