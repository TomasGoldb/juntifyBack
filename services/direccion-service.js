import { DireccionRepository } from '../repositories/direccion-repository.js';

export class DireccionService {
  constructor() {
    this.direccionRepository = new DireccionRepository();
  }

  async crear(req, res) {
    const { idLugar, alias } = req.body;
    const idUsuario = req.user?.userId;
    if (!idUsuario) return res.status(401).json({ error: 'Usuario no autenticado' });
    if (!idLugar) return res.status(400).json({ error: 'idLugar es requerido' });
    try {
      const direccion = await this.direccionRepository.crearDireccion(idLugar, idUsuario, alias);
      res.json({ success: true, direccion });
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async listar(req, res) {
    const idUsuario = req.user?.userId;
    if (!idUsuario) return res.status(401).json({ error: 'Usuario no autenticado' });
    try {
      const direcciones = await this.direccionRepository.obtenerDireccionesPorUsuario(idUsuario);
      res.json(direcciones);
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async detalle(req, res) {
    const idUsuario = req.user?.userId;
    const { idDireccion } = req.params;
    if (!idUsuario) return res.status(401).json({ error: 'Usuario no autenticado' });
    try {
      const direccion = await this.direccionRepository.obtenerDireccionPorId(Number(idDireccion), idUsuario);
      res.json(direccion);
    } catch (error) {
      res.status(404).json({ error: error.message || error });
    }
  }

  async eliminar(req, res) {
    const idUsuario = req.user?.userId;
    const { idDireccion } = req.params;
    if (!idUsuario) return res.status(401).json({ error: 'Usuario no autenticado' });
    try {
      await this.direccionRepository.eliminarDireccion(Number(idDireccion), idUsuario);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }
}


