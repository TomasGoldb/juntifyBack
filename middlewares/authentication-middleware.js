import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'supersecreto';

export function authenticateToken(req, res, next) {
  // Verificar diferentes formas de enviar el token
  let token = null;
  
  // 1. Verificar Authorization header (Bearer token)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  
  // 2. Verificar si el token viene en el header sin 'Bearer '
  if (!token && authHeader) {
    token = authHeader;
  }
  
  // 3. Verificar si el token viene en query parameters (para debugging)
  if (!token && req.query.token) {
    token = req.query.token;
  }
  
  // 4. Verificar si el token viene en el body (para debugging)
  if (!token && req.body && req.body.token) {
    token = req.body.token;
  }

  // Debug logging
  console.log('Auth Debug:', {
    hasAuthHeader: !!authHeader,
    authHeader: authHeader,
    hasToken: !!token,
    url: req.url,
    method: req.method
  });

  if (!token) {
    return res.status(401).json({ 
      error: 'Token no proporcionado',
      message: 'Asegúrate de incluir el token en el header Authorization: Bearer <token>',
      debug: {
        hasAuthHeader: !!authHeader,
        authHeader: authHeader ? 'presente' : 'ausente'
      }
    });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.log('JWT Error:', err.message);
      return res.status(403).json({ 
        error: 'Token inválido',
        message: err.message
      });
    }
    req.user = user;
    next();
  });
}
