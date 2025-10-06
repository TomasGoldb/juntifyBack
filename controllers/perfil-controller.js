import express from 'express';
import { PerfilService } from '../services/perfil-service.js';
import { authenticateToken } from '../middlewares/authentication-middleware.js';
import { validateProfilePhotoUpdate, rateLimitPhotoUpdates, logPhotoOperation } from '../middlewares/profile-photo-middleware.js';

const router = express.Router();
const perfilService = new PerfilService();

/**
 * GET /api/perfiles/:userId
 * Obtiene el perfil de un usuario
 */
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verificar que el usuario autenticado pueda ver este perfil
    // (por ahora permitimos que vean su propio perfil y el de sus amigos)
    if (req.user.id !== userId) {
      // TODO: Verificar si son amigos
      // Por ahora solo permitimos ver el propio perfil
      return res.status(403).json({ 
        error: 'No autorizado para ver este perfil' 
      });
    }
    
    const perfil = await perfilService.obtenerPerfil(userId);
    res.json(perfil);
    
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

/**
 * PUT /api/perfiles/:userId/foto
 * Actualiza la foto de perfil de un usuario
 */
router.put('/:userId/foto', 
  authenticateToken,
  logPhotoOperation,
  rateLimitPhotoUpdates,
  validateProfilePhotoUpdate,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { foto } = req.body;
      
      const resultado = await perfilService.actualizarFoto(userId, foto);
      
      res.json({
        success: true,
        message: 'Foto de perfil actualizada correctamente',
        data: resultado
      });
      
    } catch (error) {
      console.error('Error actualizando foto de perfil:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: error.message 
      });
    }
  }
);

/**
 * DELETE /api/perfiles/:userId/foto
 * Elimina la foto de perfil de un usuario
 */
router.delete('/:userId/foto',
  authenticateToken,
  logPhotoOperation,
  rateLimitPhotoUpdates,
  async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Verificar que el usuario autenticado sea el propietario
      if (req.user.id !== userId) {
        return res.status(403).json({ 
          error: 'No autorizado para modificar este perfil' 
        });
      }
      
      const resultado = await perfilService.eliminarFoto(userId);
      
      res.json({
        success: true,
        message: 'Foto de perfil eliminada correctamente',
        data: resultado
      });
      
    } catch (error) {
      console.error('Error eliminando foto de perfil:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: error.message 
      });
    }
  }
);

/**
 * PUT /api/perfiles/:userId
 * Actualiza los datos del perfil de un usuario
 */
router.put('/:userId',
  authenticateToken,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const datosActualizacion = req.body;
      
      // Verificar que el usuario autenticado sea el propietario
      if (req.user.id !== userId) {
        return res.status(403).json({ 
          error: 'No autorizado para modificar este perfil' 
        });
      }
      
      // Remover campos que no se deben actualizar directamente
      delete datosActualizacion.id;
      delete datosActualizacion.created_at;
      
      const resultado = await perfilService.actualizarPerfil(userId, datosActualizacion);
      
      res.json({
        success: true,
        message: 'Perfil actualizado correctamente',
        data: resultado
      });
      
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        message: error.message 
      });
    }
  }
);

export default router;
