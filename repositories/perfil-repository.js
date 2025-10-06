import { supabase } from '../configs/db-config.js';

export class PerfilRepository {
  
  /**
   * Obtiene un perfil por su ID
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object|null>} Perfil encontrado o null
   */
  async obtenerPorId(userId) {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No encontrado
          return null;
        }
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error en PerfilRepository.obtenerPorId:', error);
      throw error;
    }
  }

  /**
   * Actualiza la foto de perfil de un usuario
   * @param {string} userId - ID del usuario
   * @param {string|null} fotoUrl - URL de la foto o null para eliminar
   * @returns {Promise<Object>} Perfil actualizado
   */
  async actualizarFoto(userId, fotoUrl) {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .update({ 
          foto: fotoUrl,
          ultima_actividad: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error en PerfilRepository.actualizarFoto:', error);
      throw error;
    }
  }

  /**
   * Actualiza los datos de un perfil
   * @param {string} userId - ID del usuario
   * @param {Object} datosActualizacion - Datos a actualizar
   * @returns {Promise<Object>} Perfil actualizado
   */
  async actualizar(userId, datosActualizacion) {
    try {
      // Agregar timestamp de última actividad
      const datosConTimestamp = {
        ...datosActualizacion,
        ultima_actividad: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('perfiles')
        .update(datosConTimestamp)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error en PerfilRepository.actualizar:', error);
      throw error;
    }
  }

  /**
   * Verifica si un username ya existe (excluyendo un usuario específico)
   * @param {string} username - Username a verificar
   * @param {string} excludeUserId - ID del usuario a excluir de la búsqueda
   * @returns {Promise<boolean>} True si existe, false si no
   */
  async existeUsername(username, excludeUserId = null) {
    try {
      let query = supabase
        .from('perfiles')
        .select('id')
        .eq('username', username);

      if (excludeUserId) {
        query = query.neq('id', excludeUserId);
      }

      const { data, error } = await query.limit(1);

      if (error) {
        throw new Error(error.message);
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error en PerfilRepository.existeUsername:', error);
      throw error;
    }
  }

  /**
   * Busca perfiles por nombre de usuario, nombre o apellido
   * @param {string} query - Término de búsqueda
   * @param {string} excludeUserId - ID del usuario a excluir de los resultados
   * @param {number} limit - Límite de resultados
   * @returns {Promise<Array>} Lista de perfiles encontrados
   */
  async buscar(query, excludeUserId = null, limit = 10) {
    try {
      let supabaseQuery = supabase
        .from('perfiles')
        .select('id, username, nombre, apellido, foto')
        .or(`username.ilike.%${query}%,nombre.ilike.%${query}%,apellido.ilike.%${query}%`)
        .limit(limit);

      if (excludeUserId) {
        supabaseQuery = supabaseQuery.neq('id', excludeUserId);
      }

      const { data, error } = await supabaseQuery;

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error en PerfilRepository.buscar:', error);
      throw error;
    }
  }

  /**
   * Obtiene múltiples perfiles por sus IDs
   * @param {Array<string>} userIds - Array de IDs de usuarios
   * @returns {Promise<Array>} Lista de perfiles encontrados
   */
  async obtenerMultiples(userIds) {
    try {
      if (!userIds || userIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('perfiles')
        .select('id, username, nombre, apellido, foto')
        .in('id', userIds);

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    } catch (error) {
      console.error('Error en PerfilRepository.obtenerMultiples:', error);
      throw error;
    }
  }

  /**
   * Actualiza la última actividad de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<void>}
   */
  async actualizarUltimaActividad(userId) {
    try {
      const { error } = await supabase
        .from('perfiles')
        .update({ ultima_actividad: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error en PerfilRepository.actualizarUltimaActividad:', error);
      // No lanzamos el error porque es una operación secundaria
    }
  }

  /**
   * Obtiene estadísticas básicas de un perfil
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Estadísticas del perfil
   */
  async obtenerEstadisticas(userId) {
    try {
      // Obtener cantidad de amigos
      const { count: cantidadAmigos, error: errorAmigos } = await supabase
        .from('Amigos')
        .select('*', { count: 'exact', head: true })
        .or(`idSolicitador.eq.${userId},idReceptor.eq.${userId}`)
        .eq('seAceptoSolicitud', true);

      if (errorAmigos) {
        console.error('Error obteniendo cantidad de amigos:', errorAmigos);
      }

      // Obtener cantidad de planes creados
      const { count: cantidadPlanes, error: errorPlanes } = await supabase
        .from('Planes')
        .select('*', { count: 'exact', head: true })
        .eq('idAnfitrion', userId);

      if (errorPlanes) {
        console.error('Error obteniendo cantidad de planes:', errorPlanes);
      }

      return {
        amigos: cantidadAmigos || 0,
        planesCreados: cantidadPlanes || 0
      };
    } catch (error) {
      console.error('Error en PerfilRepository.obtenerEstadisticas:', error);
      return {
        amigos: 0,
        planesCreados: 0
      };
    }
  }
}
