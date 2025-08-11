import express from 'express';
import { DireccionService } from '../services/direccion-service.js';

const router = express.Router();
const direccionService = new DireccionService();

// Crear una dirección
router.post('/', (req, res) => direccionService.crear(req, res));
// Alias: crear/agregar
router.post('/agregar', (req, res) => direccionService.crear(req, res));

// Listar direcciones del usuario autenticado
router.get('/', (req, res) => direccionService.listar(req, res));
// Alias: listar
router.get('/listar', (req, res) => direccionService.listar(req, res));

// Obtener detalle de una dirección del usuario autenticado
router.get('/:idDireccion', (req, res) => direccionService.detalle(req, res));
// Alias: detalle
router.get('/detalle/:idDireccion', (req, res) => direccionService.detalle(req, res));

// Eliminar una dirección del usuario autenticado
router.delete('/:idDireccion', (req, res) => direccionService.eliminar(req, res));
// Alias: eliminar
router.delete('/eliminar/:idDireccion', (req, res) => direccionService.eliminar(req, res));

// Diagnóstico de rutas y entorno (no expone secretos)
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Direcciones router activo',
    basePaths: ['/api/direcciones', '/api/direccion'],
    env: {
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_KEY,
    }
  });
});

export default router;


