import { UbicacionRepository } from '../repositories/ubicacion-repository.js';
import { supabase } from '../configs/db-config.js';
import { getIO } from '../configs/socket.js';

export class UbicacionService {
  constructor() {
    this.ubicacionRepository = new UbicacionRepository();
  }

  async actualizarUbicacion(req, res) {
    try {
      const { idPlan } = req.params;
      const { latitude, longitude, bateria = 100 } = req.body;
      const currentUserId = req.user?.userId;

      // Validar que el usuario participe en el plan
      const { data: participacion, error: partError } = await supabase
        .from('ParticipantePlan')
        .select('estadoParticipante')
        .eq('idPlan', idPlan)
        .eq('idPerfil', currentUserId)
        .single();

      if (partError || !participacion) {
        return res.status(403).json({ error: 'No tienes permisos para actualizar ubicación en este plan' });
      }

      if (participacion.estadoParticipante !== 1) {
        return res.status(403).json({ error: 'Solo los participantes aceptados pueden compartir ubicación' });
      }

      await this.ubicacionRepository.actualizarUbicacion(idPlan, currentUserId, latitude, longitude, bateria);

      // Emitir actualización en tiempo real a la sala del plan
      const io = getIO();
      if (io) {
        io.to(`plan-${idPlan}`).emit('ubicacion-actualizada', {
          idPlan: Number(idPlan),
          participante: {
            id: currentUserId,
            ubicacion: { latitude, longitude, timestamp: new Date().toISOString() },
            bateria
          }
        });
      }

      res.json({ success: true, message: 'Ubicación actualizada correctamente' });
    } catch (error) {
      console.error('Error actualizando ubicación:', error);
      // No fallar completamente si hay error de ubicación
      res.json({ success: true, message: 'Plan iniciado correctamente (ubicación no disponible)' });
    }
  }

  async obtenerUbicacionesParticipantes(req, res) {
    try {
      const { idPlan } = req.params;
      const currentUserId = req.user?.userId;

      // Validar que el usuario participe en el plan
      const { data: participacion, error: partError } = await supabase
        .from('ParticipantePlan')
        .select('estadoParticipante')
        .eq('idPlan', idPlan)
        .eq('idPerfil', currentUserId)
        .single();

      if (partError || !participacion) {
        return res.status(403).json({ error: 'No tienes permisos para ver ubicaciones de este plan' });
      }

      const participantes = await this.ubicacionRepository.obtenerUbicacionesParticipantes(idPlan);
      
      res.json({ 
        success: true, 
        participantes,
        message: 'Ubicaciones obtenidas correctamente' 
      });
    } catch (error) {
      console.error('Error obteniendo ubicaciones:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async eliminarUbicacion(req, res) {
    try {
      const { idPlan } = req.params;
      const currentUserId = req.user?.userId;

      await this.ubicacionRepository.eliminarUbicacion(idPlan, currentUserId);
      
      res.json({ success: true, message: 'Ubicación eliminada correctamente' });
    } catch (error) {
      console.error('Error eliminando ubicación:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async limpiarUbicacionesAntiguas(req, res) {
    try {
      await this.ubicacionRepository.limpiarUbicacionesAntiguas();
      
      res.json({ success: true, message: 'Ubicaciones antiguas limpiadas correctamente' });
    } catch (error) {
      console.error('Error limpiando ubicaciones:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
}
