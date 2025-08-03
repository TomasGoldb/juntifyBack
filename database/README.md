# Base de Datos - Juntify

## Cambios en la tabla ParticipantePlan

### Modificación del campo de estado

Se ha modificado la tabla `ParticipantePlan` para cambiar el campo booleano `aceptado` por un entero `estadoParticipante` que permite un mejor control del estado de participación:

- **0**: Pendiente - El usuario no ha aceptado ni rechazado la invitación
- **1**: Aceptado - El usuario ha aceptado la invitación
- **2**: Rechazado - El usuario ha rechazado la invitación

### Estructura actualizada

```sql
-- Tabla ParticipantePlan
CREATE TABLE ParticipantePlan (
  idPlan INTEGER REFERENCES Planes(idPlan),
  idPerfil INTEGER REFERENCES Perfiles(id),
  estadoParticipante INTEGER DEFAULT 0, -- 0: pendiente, 1: aceptado, 2: rechazado
  PRIMARY KEY (idPlan, idPerfil)
);
```

### Nuevas funcionalidades

1. **Creación de planes**: Al crear un plan, el anfitrión se agrega automáticamente con `estadoParticipante = 1` (aceptado), mientras que los demás participantes se agregan con `estadoParticipante = 0` (pendiente).

2. **Aceptar invitación**: Cambia el estado de 0 a 1.

3. **Rechazar invitación**: Cambia el estado de 0 a 2 (en lugar de eliminar el registro).

4. **Invitaciones pendientes**: Nuevo endpoint para obtener planes donde el usuario tiene invitaciones pendientes.

5. **Estado de participación**: Nuevo endpoint para consultar el estado de participación de un usuario en un plan específico.

### Endpoints actualizados

- `GET /planes/usuario/:userId` - Planes donde el usuario es anfitrión o participante aceptado
- `GET /planes/usuario/:userId/invitaciones-pendientes` - Planes con invitaciones pendientes
- `GET /planes/:idPlan/participacion/:idPerfil` - Estado de participación de un usuario
- `POST /planes/aceptar-invitacion` - Aceptar invitación (estado = 1)
- `POST /planes/declinar-invitacion` - Rechazar invitación (estado = 2)

### Ventajas del nuevo sistema

1. **Mejor trazabilidad**: Se mantiene el historial de todas las invitaciones
2. **Estados más claros**: Tres estados distintos en lugar de solo aceptado/no aceptado
3. **Flexibilidad**: Permite implementar funcionalidades como "reconsiderar" una invitación rechazada
4. **Análisis**: Facilita el análisis de tasas de aceptación/rechazo de invitaciones
