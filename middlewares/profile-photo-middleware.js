import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;

/**
 * Valida que la URL de la foto sea válida y segura
 * @param {string} fotoUrl - URL de la foto a validar
 * @returns {Object} { isValid: boolean, error?: string }
 */
function validatePhotoUrl(fotoUrl) {
  if (!fotoUrl || typeof fotoUrl !== 'string') {
    return { isValid: false, error: 'URL de foto es requerida' };
  }

  // Verificar que sea de nuestro Supabase Storage
  const expectedPrefix = `${SUPABASE_URL}/storage/v1/object/public/perfiles/`;
  if (!fotoUrl.startsWith(expectedPrefix)) {
    return { isValid: false, error: 'URL de foto debe ser de nuestro storage' };
  }

  // Extraer nombre del archivo
  const fileName = fotoUrl.split('/').pop();
  if (!fileName) {
    return { isValid: false, error: 'Nombre de archivo inválido' };
  }

  // Validar patrón del nombre: user_{userId}_{timestamp}.{ext}
  const filePattern = /^user_[a-zA-Z0-9-]+_\d+\.(jpg|jpeg|png|webp)$/i;
  if (!filePattern.test(fileName)) {
    return { isValid: false, error: 'Formato de nombre de archivo inválido' };
  }

  return { isValid: true };
}

/**
 * Extrae el userId del nombre del archivo
 * @param {string} fotoUrl - URL de la foto
 * @returns {string|null} userId extraído o null si no es válido
 */
function extractUserIdFromPhotoUrl(fotoUrl) {
  try {
    const fileName = fotoUrl.split('/').pop();
    const match = fileName.match(/^user_([a-zA-Z0-9-]+)_\d+\./);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Middleware para validar actualización de foto de perfil
 */
export function validateProfilePhotoUpdate(req, res, next) {
  const { userId } = req.params;
  const { foto } = req.body;

  // Verificar que el usuario autenticado sea el propietario
  if (req.user?.id !== userId) {
    return res.status(403).json({ 
      error: 'No autorizado para modificar este perfil' 
    });
  }

  // Si no hay foto, continuar (puede ser eliminación)
  if (!foto) {
    return next();
  }

  // Validar URL de la foto
  const validation = validatePhotoUrl(foto);
  if (!validation.isValid) {
    return res.status(400).json({ error: validation.error });
  }

  // Verificar que el userId en la URL coincida con el del archivo
  const fileUserId = extractUserIdFromPhotoUrl(foto);
  if (fileUserId !== userId) {
    return res.status(400).json({ 
      error: 'La foto no pertenece a este usuario' 
    });
  }

  next();
}

/**
 * Middleware para rate limiting de actualizaciones de foto
 */
const photoUpdateAttempts = new Map();

export function rateLimitPhotoUpdates(req, res, next) {
  const userId = req.user?.id;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minuto
  const maxAttempts = 3; // máximo 3 actualizaciones por minuto

  if (!userId) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  const userAttempts = photoUpdateAttempts.get(userId) || [];
  
  // Filtrar intentos dentro de la ventana de tiempo
  const recentAttempts = userAttempts.filter(
    timestamp => now - timestamp < windowMs
  );

  if (recentAttempts.length >= maxAttempts) {
    return res.status(429).json({ 
      error: 'Demasiadas actualizaciones de foto. Intenta de nuevo en un minuto.' 
    });
  }

  // Agregar el intento actual
  recentAttempts.push(now);
  photoUpdateAttempts.set(userId, recentAttempts);

  // Limpiar intentos antiguos periódicamente
  if (Math.random() < 0.1) { // 10% de probabilidad
    cleanupOldAttempts(windowMs);
  }

  next();
}

/**
 * Limpia intentos antiguos del rate limiting
 */
function cleanupOldAttempts(windowMs) {
  const now = Date.now();
  
  for (const [userId, attempts] of photoUpdateAttempts.entries()) {
    const recentAttempts = attempts.filter(
      timestamp => now - timestamp < windowMs
    );
    
    if (recentAttempts.length === 0) {
      photoUpdateAttempts.delete(userId);
    } else {
      photoUpdateAttempts.set(userId, recentAttempts);
    }
  }
}

/**
 * Middleware para logging de operaciones de foto
 */
export function logPhotoOperation(req, res, next) {
  const { userId } = req.params;
  const { foto } = req.body;
  const operation = req.method;
  const userAgent = req.headers['user-agent'];
  const ip = req.ip || req.connection.remoteAddress;

  console.log(`[PHOTO_OP] ${operation} - Usuario: ${userId}, IP: ${ip}`);
  
  if (foto) {
    const fileName = foto.split('/').pop();
    console.log(`[PHOTO_OP] Archivo: ${fileName}`);
  }

  next();
}

/**
 * Middleware para validar tamaño de payload
 */
export function validatePayloadSize(req, res, next) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    return res.status(413).json({
      error: 'Payload demasiado grande. Máximo 10MB permitido.'
    });
  }
  
  next();
}

/**
 * Middleware para validar formato de userId
 */
export function validateUserId(req, res, next) {
  const { userId } = req.params;
  
  if (!userId) {
    return res.status(400).json({ error: 'ID de usuario es requerido' });
  }
  
  // Validar formato UUID (Supabase usa UUIDs)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(userId)) {
    return res.status(400).json({ error: 'Formato de ID de usuario inválido' });
  }
  
  next();
}
