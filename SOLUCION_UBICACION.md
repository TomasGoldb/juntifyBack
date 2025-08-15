# Solución para el Error de Ubicación

## Problema
Al iniciar un plan, aparece el error:
```
Error: Could not find the function public.actualizar_ubicacion_participante(p_bateria, p_idPerfil, p_idPlan, p_latitude, p_longitude) in the schema cache
```

## Causa
La función `actualizar_ubicacion_participante` y la tabla `UbicacionParticipante` no existen en la base de datos de producción.

## Solución

### Opción 1: Ejecutar el Script SQL (Recomendado)

1. Ve a tu panel de Supabase
2. Abre el SQL Editor
3. Copia y pega el contenido del archivo `database/crear_ubicacion_tracking_final.sql`
4. Ejecuta el script

**Nota:** Este script maneja correctamente las políticas de PostgreSQL y evita errores de sintaxis.

### Opción 2: Solución Temporal (Ya implementada)

El código ya ha sido modificado para manejar este error de forma elegante:
- Si la función no existe, usa operaciones SQL directas
- Si la tabla no existe, continúa sin actualizar ubicación
- No interrumpe el flujo principal de iniciar el plan

## Verificación

Después de ejecutar el script SQL, deberías ver en los logs:
```
[UbicacionRepository] Función encontrada y ejecutada correctamente
```

En lugar de:
```
[UbicacionRepository] Función no encontrada, usando operaciones SQL directas
```

## Funcionalidad

Una vez solucionado, el sistema podrá:
- Actualizar ubicaciones en tiempo real de los participantes
- Mostrar ubicaciones en el mapa durante el plan
- Rastrear la batería del dispositivo

## Nota
La funcionalidad de iniciar plan ya funciona correctamente. El error de ubicación es solo para la funcionalidad adicional de tracking en tiempo real. 