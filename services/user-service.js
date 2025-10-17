import { UserRepository } from '../repositories/user-repository.js';
import { transporter } from '../configs/mailer-config.js';
import { supabase } from '../configs/db-config.js';
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
      const token = jwt.sign({ userId, id: userId, email }, SECRET_KEY, { expiresIn: '30d' });
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

  async logout(req, res) {
    try {
      // En JWT, el logout se maneja en el cliente eliminando el token
      // Este endpoint puede usarse para invalidar tokens si es necesario
      res.json({ 
        success: true, 
        message: 'Logout exitoso',
        note: 'Elimina el token del almacenamiento local'
      });
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async refreshToken(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email requerido' });
      }
      
      // Buscar el usuario por email
      const { data: user, error: userError } = await supabase.auth.admin.getUserByEmail(email);
      
      if (userError || !user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const userId = user.user.id;
      const perfil = await this.userRepository.obtenerPerfilPorId(userId);
      
      // Generar nuevo token JWT con la estructura correcta
      const token = jwt.sign({ userId, id: userId, email }, SECRET_KEY, { expiresIn: '30d' });
      
      res.json({
        success: true,
        message: 'Token actualizado',
        user: user.user,
        perfil,
        token
      });
    } catch (error) {
      res.status(500).json({ error: error.message || error });
    }
  }

  async googleAuth(req, res) {
    const { email, nombre, apellido, username, googleId, profileImage, supabaseId } = req.body;
    
    try {
      // Verificar si el usuario ya existe por email o supabaseId
      let perfil = await this.userRepository.obtenerPerfilPorEmail(email);
      
      if (!perfil && supabaseId) {
        perfil = await this.userRepository.obtenerPerfilPorId(supabaseId);
      }
      
      if (!perfil) {
        // Usuario no existe, devolver 404 para que el frontend sepa que debe registrarlo
        return res.status(404).json({ 
          error: 'Usuario no encontrado. Debe registrarse primero.',
          needsRegistration: true 
        });
      }
      
      // Usuario existe, actualizar información de Google si es necesario
      if (googleId && !perfil.googleId) {
        await this.userRepository.actualizarPerfilGoogle(perfil.idPerfil, googleId, profileImage);
      }
      
      // Generar token JWT
      const token = jwt.sign({ 
        userId: perfil.idUsuario || supabaseId, 
        id: perfil.idUsuario || supabaseId, 
        email 
      }, SECRET_KEY, { expiresIn: '30d' });
      
      res.json({
        message: 'Login con Google exitoso',
        user: { id: perfil.idUsuario || supabaseId, email },
        perfil,
        token
      });
    } catch (error) {
      console.error('Error en googleAuth:', error);
      res.status(500).json({ error: error.message || error });
    }
  }

  async googleRegister(req, res) {
    const { email, nombre, apellido, username, googleId, profileImage, supabaseId } = req.body;
    
    try {
      // Verificar si el usuario ya existe
      let perfil = await this.userRepository.obtenerPerfilPorEmail(email);
      
      if (perfil) {
        // Si ya existe, hacer login en lugar de registro
        return this.googleAuth(req, res);
      }
      
      // Crear perfil para usuario de Google (sin crear usuario en auth ya que viene de Supabase)
      perfil = await this.userRepository.insertarPerfilGoogle(
        supabaseId, 
        username, 
        nombre, 
        apellido, 
        email,
        googleId,
        profileImage
      );
      
      // Generar token JWT
      const token = jwt.sign({ 
        userId: supabaseId, 
        id: supabaseId, 
        email 
      }, SECRET_KEY, { expiresIn: '30d' });
      
      res.json({
        message: 'Registro con Google exitoso',
        user: { id: supabaseId, email },
        perfil,
        token
      });
    } catch (error) {
      console.error('Error en googleRegister:', error);
      res.status(400).json({ error: error.message || error });
    }
  }
}
