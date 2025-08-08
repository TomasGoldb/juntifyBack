import express from 'express';
import { DireccionService } from '../services/direccion-service.js';

const router = express.Router();
const direccionService = new DireccionService();

// Crear una dirección
router.post('/', (req, res) => direccionService.crear(req, res));

// Listar direcciones del usuario autenticado
router.get('/', (req, res) => direccionService.listar(req, res));

// Obtener detalle de una dirección del usuario autenticado
router.get('/:idDireccion', (req, res) => direccionService.detalle(req, res));

// Eliminar una dirección del usuario autenticado
router.delete('/:idDireccion', (req, res) => direccionService.eliminar(req, res));

export default router;


