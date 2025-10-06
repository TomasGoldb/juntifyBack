import { PerfilRepository } from '../repositories/perfil-repository.js';

export class PerfilService {
  constructor() {
    this.perfilRepository = new PerfilRepository();
  }

  /**
   * Obtiene el perfil completo de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Datos del perfil
   */
  async obtenerPerfil(userId) {
    try {
      if (!userId) {
        throw new Error('ID de usuario es requerido');
      }

      const perfil = await this.perfilRepository.obtenerPorId(userId);
      
      if (!perfil) {
        throw new Error('Perfil no encontrado');
      }

      // Remover campos sensibles si es necesario
      const { ...perfilPublico } = perfil;
      
      return perfilPublico;
      
    } catch (error) {
      console.error('Error en PerfilService.obtenerPerfil:', error);
      throw error;
    }
  }

  /**
   * Actualiza la foto de perfil de un usuario
   * @param {string} userId - ID del usuario
   * @param {string} fotoUrl - URL de la nueva foto
   * @returns {Promise<Object>} Perfil actualizado
   */
  async actualizarFoto(userId, fotoUrl) {
    try {
      if (!userId) {
        throw new Error('ID de usuario es requerido');
      }

      // Validar que el perfil existe
      const perfilExistente = await this.perfilRepository.obtenerPorId(userId);
      if (!perfilExistente) {
        throw new Error('Perfil no encontrado');
      }

      // Actualizar la foto
      const perfilActualizado = await this.perfilRepository.actualizarFoto(userId, fotoUrl);
      
      console.log(`Foto de perfil actualizada para usuario ${userId}: ${fotoUrl}`);
      
      return perfilActualizado;
      
    } catch (error) {
      console.error('Error en PerfilService.actualizarFoto:', error);
      throw error;
    }
  }

  /**
   * Elimina la foto de perfil de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Perfil actualizado
   */
  async eliminarFoto(userId) {
    try {
      if (!userId) {
        throw new Error('ID de usuario es requerido');
      }

      // Validar que el perfil existe
      const perfilExistente = await this.perfilRepository.obtenerPorId(userId);
      if (!perfilExistente) {
        throw new Error('Perfil no encontrado');
      }

      // Eliminar la foto (establecer como null)
      const perfilActualizado = await this.perfilRepository.actualizarFoto(userId, null);
      
      console.log(`Foto de perfil eliminada para usuario ${userId}`);
      
      return perfilActualizado;
      
    } catch (error) {
      console.error('Error en PerfilService.eliminarFoto:', error);
      throw error;
    }
  }

  /**
   * Actualiza los datos del perfil de un usuario
   * @param {string} userId - ID del usuario
   * @param {Object} datosActualizacion - Datos a actualizar
   * @returns {Promise<Object>} Perfil actualizado
   */
  async actualizarPerfil(userId, datosActualizacion) {
    try {
      if (!userId) {
        throw new Error('ID de usuario es requerido');
      }

      if (!datosActualizacion || Object.keys(datosActualizacion).length === 0) {
        throw new Error('Datos de actualización son requeridos');
      }

      // Validar que el perfil existe
      const perfilExistente = await this.perfilRepository.obtenerPorId(userId);
      if (!perfilExistente) {
        throw new Error('Perfil no encontrado');
      }

      // Validar campos permitidos
      const camposPermitidos = ['nombre', 'apellido', 'username', 'foto', 'preferencias', 'configuracion'];
      const datosLimpios = {};
      
      Object.keys(datosActualizacion).forEach(campo => {
        if (camposPermitidos.includes(campo)) {
          datosLimpios[campo] = datosActualizacion[campo];
        }
      });

      if (Object.keys(datosLimpios).length === 0) {
        throw new Error('No hay campos válidos para actualizar');
      }

      // Validar username único si se está actualizando
      if (datosLimpios.username && datosLimpios.username !== perfilExistente.username) {
        const existeUsername = await this.perfilRepository.existeUsername(datosLimpios.username, userId);
        if (existeUsername) {
          throw new Error('El nombre de usuario ya está en uso');
        }
      }

      // Actualizar el perfil
      const perfilActualizado = await this.perfilRepository.actualizar(userId, datosLimpios);
      
      console.log(`Perfil actualizado para usuario ${userId}:`, Object.keys(datosLimpios));
      
      return perfilActualizado;
      
    } catch (error) {
      console.error('Error en PerfilService.actualizarPerfil:', error);
      throw error;
    }
  }

  /**
   * Busca perfiles por nombre de usuario o nombre
   * @param {string} query - Término de búsqueda
   * @param {string} userId - ID del usuario que busca (para excluir de resultados)
   * @param {number} limit - Límite de resultados
   * @returns {Promise<Array>} Lista de perfiles encontrados
   */
  async buscarPerfiles(query, userId, limit = 10) {
    try {
      if (!query || query.trim().length < 2) {
        throw new Error('La búsqueda debe tener al menos 2 caracteres');
      }

      const perfiles = await this.perfilRepository.buscar(query.trim(), userId, limit);
      
      // Remover información sensible de los resultados
      return perfiles.map(perfil => ({
        id: perfil.id,
        username: perfil.username,
        nombre: perfil.nombre,
        apellido: perfil.apellido,
        foto: perfil.foto
      }));
      
    } catch (error) {
      console.error('Error en PerfilService.buscarPerfiles:', error);
      throw error;
    }
  }
}
