import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'supersecreto';

export function authenticateToken(req, res, next) {
  // Debug: Log todos los headers para ver qué está llegando
  console.log('=== AUTH DEBUG ===');
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  console.log('Headers:', Object.keys(req.headers));
  console.log('Authorization header:', req.headers['authorization']);
  console.log('x-auth-token header:', req.headers['x-auth-token']);
  console.log('==================');  
  
  // Verificar diferentes formas de enviar el token
  let token = null;
  
  // 1. Verificar Authorization header (Bearer token)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
    console.log('Token encontrado en Authorization header (Bearer)');
  }
  
  // 2. Verificar si el token viene en el header sin 'Bearer '
  if (!token && authHeader) {
    token = authHeader;
    console.log('Token encontrado en Authorization header (sin Bearer)');
  }
  
  // 3. Verificar si el token viene en x-auth-token header
  if (!token && req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
    console.log('Token encontrado en x-auth-token header');
  }
  
  // 4. Verificar si el token viene en query parameters (para debugging)
  if (!token && req.query.token) {
    token = req.query.token;
    console.log('Token encontrado en query parameters');
  }
  
  // 5. Verificar si el token viene en el body (para debugging)
  if (!token && req.body && req.body.token) {
    token = req.body.token;
    console.log('Token encontrado en body');
  }

  if (!token) {
    console.log('NO SE ENCONTRÓ TOKEN');
    return res.status(401).json({ 
      error: 'Token no proporcionado',
      message: 'Asegúrate de incluir el token en el header Authorization: Bearer <token>',
      debug: {
        hasAuthHeader: !!authHeader,
        authHeader: authHeader ? 'presente' : 'ausente',
        hasXAuthToken: !!req.headers['x-auth-token'],
        headersDisponibles: Object.keys(req.headers).filter(h => h.toLowerCase().includes('auth')),
        url: req.url,
        method: req.method
      }
    });
  }

  console.log('Token encontrado, verificando...');
  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.log('Error verificando token:', err.message);
      return res.status(403).json({ 
        error: 'Token inválido',
        message: err.message
      });
    }
      console.log('Token válido, usuario:', user);
  console.log('Campos del token:', Object.keys(user));
  console.log('userId:', user.userId);
  console.log('id:', user.id);
  console.log('email:', user.email);
  req.user = user;
  next();
  });
}
