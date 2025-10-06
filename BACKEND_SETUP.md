# Configuración del Backend para Fotos de Perfil - Juntify

## Endpoints Implementados

El backend ya tiene implementados los siguientes endpoints para la funcionalidad de fotos de perfil:

### 1. Actualizar Foto de Perfil
```
PUT /api/perfiles/{userId}/foto
```

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: application/json`

**Body:**
```json
{
  "foto": "https://supabase-url/storage/v1/object/public/perfiles/user_123_1234567890.jpg"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Foto de perfil actualizada correctamente",
  "data": {
    "id": "user-id",
    "foto": "nueva-url-foto",
    "nombre": "Juan",
    "apellido": "Pérez",
    "username": "usuario123"
  }
}
```

### 2. Obtener Perfil
```
GET /api/perfiles/{userId}
```

**Headers:**
- `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "id": "user-id",
  "username": "usuario123",
  "nombre": "Juan",
  "apellido": "Pérez",
  "foto": "https://supabase-url/storage/v1/object/public/perfiles/user_123_1234567890.jpg",
  "created_at": "2024-01-01T00:00:00Z",
  "ultima_actividad": "2024-01-01T12:00:00Z"
}
```

### 3. Eliminar Foto de Perfil
```
DELETE /api/perfiles/{userId}/foto
```

**Headers:**
- `Authorization: Bearer {token}`

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Foto de perfil eliminada correctamente",
  "data": {
    "id": "user-id",
    "foto": null
  }
}
```

### 4. Actualizar Perfil Completo
```
PUT /api/perfiles/{userId}
```

**Headers:**
- `Authorization: Bearer {token}`
- `Content-Type: application/json`

**Body:**
```json
{
  "nombre": "Juan Carlos",
  "apellido": "Pérez García",
  "username": "juancarlos123"
}
```

## Archivos Implementados

### Controladores
- `controllers/perfil-controller.js` - Maneja las rutas HTTP de perfiles

### Servicios
- `services/perfil-service.js` - Lógica de negocio para perfiles

### Repositorios
- `repositories/perfil-repository.js` - Acceso a datos de Supabase

### Middlewares
- `middlewares/profile-photo-middleware.js` - Validaciones y seguridad

## Configuración de Supabase Storage

### 1. Variables de Entorno Requeridas
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

### 2. Configuración del Bucket
1. Crear bucket llamado `perfiles` en Supabase Storage
2. Configurar como público para lectura
3. Aplicar las políticas de seguridad del archivo `supabase-storage-config.sql`

### 3. Políticas de Seguridad Implementadas
- **Lectura pública**: Cualquiera puede ver las fotos de perfil
- **Escritura restringida**: Solo el propietario puede subir/actualizar/eliminar su foto
- **Validación por nombre**: Los archivos deben seguir el patrón `user_{userId}_{timestamp}.jpg`
- **Rate limiting**: Máximo 3 actualizaciones por minuto por usuario
- **Validación de URL**: Solo acepta URLs de nuestro Supabase Storage

## Validaciones Implementadas

### 1. Autenticación y Autorización
- JWT token requerido para todos los endpoints
- Solo el propietario puede modificar su perfil
- Validación de formato UUID para userId

### 2. Validación de URLs de Foto
- Debe ser de nuestro dominio Supabase
- Formato de archivo válido: `user_{userId}_{timestamp}.(jpg|jpeg|png|webp)`
- El userId en el nombre del archivo debe coincidir con el usuario autenticado

### 3. Rate Limiting
- Máximo 3 actualizaciones de foto por minuto por usuario
- Limpieza automática de intentos antiguos

### 4. Logging y Monitoreo
- Log de todas las operaciones de foto
- Información de IP y User-Agent
- Timestamps para auditoría

## Estructura de la Base de Datos

La tabla `perfiles` ya existe con la siguiente estructura:

```sql
CREATE TABLE public.perfiles (
  id uuid NOT NULL,
  username text NOT NULL UNIQUE,
  nombre text NOT NULL,
  apellido text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  push_token text,
  foto text,  -- Campo para la URL de la foto de perfil
  ultima_actividad timestamp with time zone DEFAULT now(),
  preferencias jsonb DEFAULT '{}'::jsonb,
  configuracion jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT perfiles_pkey PRIMARY KEY (id),
  CONSTRAINT perfiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
```

## Cómo Probar los Endpoints

### 1. Obtener Token de Autenticación
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@ejemplo.com", "password": "password123"}'
```

### 2. Actualizar Foto de Perfil
```bash
curl -X PUT http://localhost:3000/api/perfiles/{userId}/foto \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"foto": "https://supabase-url/storage/v1/object/public/perfiles/user_123_1234567890.jpg"}'
```

### 3. Obtener Perfil
```bash
curl -X GET http://localhost:3000/api/perfiles/{userId} \
  -H "Authorization: Bearer {token}"
```

## Consideraciones de Seguridad

1. **Autenticación JWT**: Todos los endpoints requieren token válido
2. **Autorización**: Solo el propietario puede modificar su perfil
3. **Validación de entrada**: URLs y formatos de archivo validados
4. **Rate limiting**: Previene abuso de la funcionalidad
5. **Logging**: Auditoría completa de operaciones
6. **Sanitización**: Campos permitidos controlados

## Troubleshooting

### Error: "No autorizado para modificar este perfil"
- Verificar que el token JWT sea válido
- Confirmar que el userId en la URL coincida con el usuario autenticado

### Error: "URL de foto debe ser de nuestro storage"
- Verificar que la URL comience con el dominio de Supabase correcto
- Confirmar que apunte al bucket 'perfiles'

### Error: "Formato de nombre de archivo inválido"
- El archivo debe seguir el patrón: `user_{userId}_{timestamp}.(jpg|jpeg|png|webp)`
- Verificar que el userId en el nombre coincida con el usuario

### Error: "Demasiadas actualizaciones de foto"
- El usuario ha excedido el límite de 3 actualizaciones por minuto
- Esperar un minuto antes de intentar nuevamente

## Próximos Pasos

1. **Configurar Supabase Storage**: Ejecutar el script SQL de configuración
2. **Probar endpoints**: Usar las rutas implementadas desde el frontend
3. **Monitorear logs**: Verificar que las operaciones se registren correctamente
4. **Optimizar**: Ajustar rate limits según necesidades de producción
