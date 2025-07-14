import { UserRepository } from '../repositories/user-repository.js';
import { transporter } from '../configs/mailer-config.js';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET;

export class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  async registro(req, res) {
    const { email, password, username, nombre, apellido } = req.body;
    try {
      const authData = await this.userRepository.crearUsuario(email, password);
      const userId = authData.user.id;
      await this.userRepository.insertarPerfil(userId, username, nombre, apellido);
      const perfil = await this.userRepository.obtenerPerfilPorId(userId);
      res.json({
        message: 'Usuario registrado exitosamente. Revisa tu correo para confirmar.',
        user: authData.user,
        perfil
      });
    } catch (error) {
      res.status(400).json({ error: error.message || error });
    }
  }

  async login(req, res) {
    const { email, password } = req.body;
    try {
      const authData = await this.userRepository.login(email, password);
      const userId = authData.user.id;
      const perfil = await this.userRepository.obtenerPerfilPorId(userId);
      // Generar token JWT
      const token = jwt.sign({ userId, email }, SECRET_KEY, { expiresIn: '8h' });
      res.json({
        message: 'Login exitoso',
        user: authData.user,
        perfil,
        token
      });
    } catch (error) {
      res.status(401).json({ error: error.message || error });
    }
  }

  async obtenerAmigos(req, res) {
    const { userId } = req.params;
    try {
      const amigos = await this.userRepository.obtenerAmigos(userId);
      res.json(amigos);
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }
}
