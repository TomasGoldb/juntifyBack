process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import fetch from 'node-fetch';
global.fetch = fetch;

import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer'

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { sendPushNotification } from './sendPushNotification.js'; // Ajusta la ruta según corresponda

// Configura tus credenciales de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = 3000;

app.use(express.json()); // para poder leer JSON en POST y PUT

// --- ENDPOINTS ---

app.get('/', (req, res) => {
  res.json('Bienvenido a la API de Juntify');
});

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 465,
  secure: true, // true para puerto 465
  auth: {
      user: process.env.BREVO_USER, // tu correo verificado en Brevo
      pass: process.env.BREVO_PASS  // la clave SMTP
  }
});

app.post('/mandar-mail', async (req, res) => {
  const { to, subject, message } = req.body;

  try {
      await transporter.sendMail({
          from: `"TuiTui" <${process.env.BREVO_USER}>`,
          to,
          subject,
          text: message
      });
      res.send('Email enviado con éxito');
  } catch (error) {
      console.error(error);
      res.status(500).send('Error al enviar el correo');
  }
});







// Registro de usuario
app.post('/registro', async (req, res) => {
  const { email, password, username, nombre, apellido } = req.body;
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
  if (authError) {
    console.error('Error al crear el usuario:', authError);
    return res.status(400).json({ error: authError.message ?? authError ?? 'Error desconocido en Auth' });
  }
  const userId = authData.user.id;
  const { error: profileError } = await supabase.from('perfiles').insert([{ id: userId, username, nombre, apellido }]);
  if (profileError) {
    console.error('Error al insertar en perfiles:', profileError);
    return res.status(400).json({ error: profileError.message ?? profileError ?? 'Error desconocido en perfiles' });
  }
  const { data: perfil, error: fetchError } = await supabase.from('perfiles').select('*').eq('id', userId).single();
  if (fetchError) {
    console.error('Error al obtener el perfil:', fetchError);
    return res.status(400).json({ error: fetchError.message ?? fetchError });
  }
  res.json({
    message: 'Usuario registrado exitosamente. Revisa tu correo para confirmar.',
    user: authData.user,
    perfil
  });
});

// Consulta de planes de prueba
app.get('/pruebaPlanes', async (req, res) => {
  const { data, error } = await supabase.from('Planes').select();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Guardar/exponer push token de un usuario
app.post('/api/push-token', async (req, res) => {
  const { userId, expoPushToken } = req.body;
  const { error } = await supabase.from('perfiles').update({ push_token: expoPushToken }).eq('id', userId);
  if (error) {
    console.error('Error actualizando token:', error);
    return res.status(500).json({ error: 'Error al guardar token' });
  }
  res.json({ success: true });
});

// Login de usuario
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) {
    console.error('Error al iniciar sesión:', authError);
    return res.status(401).json({ error: authError.message });
  }
  const userId = authData.user.id;
  const { data: perfilData, error: perfilError } = await supabase.from('perfiles').select('*').eq('id', userId).single();
  if (perfilError) {
    console.error('Error al obtener perfil:', perfilError);
    return res.status(500).json({ error: 'No se pudo obtener el perfil del usuario' });
  }
  res.json({
    message: 'Login exitoso',
    user: authData.user,
    perfil: perfilData
  });
});

// Obtener amigos del usuario
app.get('/amigos/:userId', async (req, res) => {
  const { userId } = req.params;
  // Paso 1: Obtener relaciones aceptadas
  const { data: relaciones, error } = await supabase
    .from('Amigos')
    .select('idSolicitador, idReceptor')
    .eq('seAceptoSolicitud', true)
    .or(`idSolicitador.eq.${userId},idReceptor.eq.${userId}`);

  if (error) {
    console.error('Error en consulta de amigos:', error);
    return res.status(500).json({ error: error.message });
  }

  // Paso 2: Sacar los IDs de los amigos
  const amigoIds = relaciones.map(row => row.idSolicitador === userId ? row.idReceptor : row.idSolicitador);
  if (amigoIds.length === 0) return res.json([]);

  // Paso 3: Obtener perfiles de esos amigos
  const { data: perfiles, error: errorPerfiles } = await supabase.from('perfiles').select('*').in('id', amigoIds);
  if (errorPerfiles) {
    console.error('Error al obtener perfiles de amigos:', errorPerfiles);
    return res.status(500).json({ error: errorPerfiles.message });
  }
  res.json(perfiles);
});

// Enviar notificación push
app.post('/enviar-notificacion', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Falta el token' });
  try {
    await sendPushNotification(token, '¡Hola!', 'Esta es una notificación desde el backend');
    res.json({ success: true });
  } catch (err) {
    console.error('Error al enviar notificación:', err);
    res.status(500).json({ error: 'Error interno al enviar notificación' });
  }
});

// CREAR PLAN (AJUSTADO A TU BASE DE DATOS)
app.post('/crear-plan', async (req, res) => {
  try {
    const {
      nombrePlan,
      descPlan,
      idLugar,
      inicioPlan,
      finPlan,
      idAnfitrion,
      participantes // array de uuid de perfiles
    } = req.body;

    // 1. Insertar el plan
    const { data: planData, error: planError } = await supabase
      .from('Planes')
      .insert([{
        nombrePlan,
        descPlan,
        idLugar,
        fechaCreacion: new Date().toISOString(),
        inicioPlan,
        finPlan,
        idAnfitrion
      }])
      .select()
      .single();

    if (planError) return res.status(400).json({ error: planError.message });

    // 2. Insertar participantes (incluye anfitrión)
    const idPlan = planData.idPlan;
    const participantesSet = new Set(participantes);
    participantesSet.add(idAnfitrion);
    const participantesRows = Array.from(participantesSet).map(idPerfil => ({
      idPlan,
      idPerfil
    }));

    const { error: partError } = await supabase.from('ParticipantePlan').insert(participantesRows);
    if (partError) return res.status(400).json({ error: partError.message });

    res.json({ success: true, plan: planData });
  } catch (err) {
    console.error('Error al crear plan:', err);
    res.status(500).json({ error: 'Error interno al crear plan' });
  }
});

// --- FIN ENDPOINTS ---

  
  
  




// ENVIAR SOLICITUD DE AMISTAD
app.post('/amigos/solicitud', async (req, res) => {
  const { idSolicitador, idReceptor } = req.body;
  if(idSolicitador === idReceptor) return res.status(400).json({error:'No puedes agregarte a ti mismo'});
  // Verifica si ya existe una relación (pendiente o aceptada)
  const { data: existe, error: errorExiste } = await supabase
    .from('Amigos')
    .select('*')
    .or(`and(idSolicitador.eq.${idSolicitador},idReceptor.eq.${idReceptor}),and(idSolicitador.eq.${idReceptor},idReceptor.eq.${idSolicitador})`);
  if (existe && existe.length > 0) return res.status(400).json({ error: 'Ya existe una solicitud o son amigos' });
  const { error } = await supabase
    .from('Amigos')
    .insert([{ idSolicitador, idReceptor, seAceptoSolicitud: false }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: 'Solicitud enviada' });
});

// LISTAR SOLICITUDES PENDIENTES PARA UN USUARIO (donde él es receptor)
app.get('/amigos/pendientes/:userId', async (req, res) => {
  const { userId } = req.params;
  const { data, error } = await supabase
    .from('Amigos')
    .select('idSolicitador, perfiles: idSolicitador (id, username, nombre, apellido, push_token)')
    .eq('idReceptor', userId)
    .eq('seAceptoSolicitud', false);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(row => row.perfiles));
});

// LISTAR AMIGOS ACEPTADOS PARA UN USUARIO (donde él es solicitador o receptor y seAceptoSolicitud=true)
app.get('/amigos/:userId', async (req, res) => {
  const { userId } = req.params;
  // Buscar amigos donde userId es solicitador o receptor Y seAceptoSolicitud = true
  const { data, error } = await supabase
    .from('Amigos')
    .select('idSolicitador, idReceptor, seAceptoSolicitud')
    .or(`idSolicitador.eq.${userId},idReceptor.eq.${userId}`)
    .eq('seAceptoSolicitud', true);
  if (error) return res.status(500).json({ error: error.message });

  // Sacar el id del amigo (el otro)
  const amigosIds = data.map(row => row.idSolicitador === userId ? row.idReceptor : row.idSolicitador);
  // Buscar sus perfiles
  const { data: perfiles, error: errorPerfiles } = await supabase
    .from('perfiles')
    .select('*')
    .in('id', amigosIds);
  if (errorPerfiles) return res.status(500).json({ error: errorPerfiles.message });
  res.json(perfiles);
});

// ACEPTAR SOLICITUD (solo puede aceptar el receptor)
app.post('/amigos/aceptar', async (req, res) => {
  const { idSolicitador, idReceptor } = req.body;
  const { error } = await supabase
    .from('Amigos')
    .update({ seAceptoSolicitud: true })
    .eq('idSolicitador', idSolicitador)
    .eq('idReceptor', idReceptor)
    .eq('seAceptoSolicitud', false);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: 'Solicitud aceptada' });
});

// RECHAZAR SOLICITUD (elimina la fila, solo si está pendiente)
app.post('/amigos/rechazar', async (req, res) => {
  const { idSolicitador, idReceptor } = req.body;
  const { error } = await supabase
    .from('Amigos')
    .delete()
    .eq('idSolicitador', idSolicitador)
    .eq('idReceptor', idReceptor)
    .eq('seAceptoSolicitud', false);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: 'Solicitud rechazada' });
});

// ELIMINAR AMIGO (puede cualquiera de los dos)
app.post('/amigos/eliminar', async (req, res) => {
  const { userId, amigoId } = req.body;
  const { error } = await supabase
    .from('Amigos')
    .delete()
    .or(`and(idSolicitador.eq.${userId},idReceptor.eq.${amigoId}),and(idSolicitador.eq.${amigoId},idReceptor.eq.${userId})`)
    .eq('seAceptoSolicitud', true);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: 'Amigo eliminado' });
});

// BUSCAR USUARIOS por nombre o username (para agregar amigos, excluyendo el propio y los ya amigos/pendientes)
app.get('/amigos/buscar/:userId/:query', async (req, res) => {
  const { userId, query } = req.params;
  // 1. Traer ids de amigos/pendientes
  const { data: relaciones } = await supabase
    .from('Amigos')
    .select('idSolicitador, idReceptor')
    .or(`idSolicitador.eq.${userId},idReceptor.eq.${userId})`);
  const excluidos = new Set([userId]);
  if (relaciones) {
    relaciones.forEach(r => {
      excluidos.add(r.idSolicitador);
      excluidos.add(r.idReceptor);
    });
  }
  // 2. Buscar perfiles
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, username, nombre, apellido')
    .or(`username.ilike.%${query}%,nombre.ilike.%${query}%,apellido.ilike.%${query}%`)
    .not('id', 'in', `(${[...excluidos].join(',')})`);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});



// AGREGAR una notificación a un usuario
app.post('/notificaciones/agregar', async (req, res) => {
  const { idPerfil, textoNoti, idTipoNoti,idUsuario=null,idPlan=null } = req.body;
  if (!idPerfil || !textoNoti || !idTipoNoti) { 
    return res.status(400).json({ error: 'Faltan parámetros' });
  }
  const { data, error } = await supabase
    .from('Notificaciones')
    .insert([{ idPerfil, textoNoti, idTipoNoti, idUsuario, idPlan }])
    .select()
    .single();
  if (error) {
    console.error('Error al agregar notificación:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true, notificacion: data });
});

// BORRAR una notificación de un usuario
app.delete('/notificaciones/borrar', async (req, res) => {
  const { idNoti, idPerfil } = req.body;
  if (!idNoti || !idPerfil) {
    return res.status(400).json({ error: 'Faltan parámetros: idNoti, idPerfil' });
  }
  // Solo deja borrar si la notificación pertenece a ese perfil (seguridad)
  const { error } = await supabase
    .from('Notificaciones')
    .delete()
    .eq('idNoti', idNoti)
    .eq('idPerfil', idPerfil);
  if (error) {
    console.error('Error al borrar notificación:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true, message: 'Notificación borrada' });
});

// Obtener todas las notificaciones de un usuario (ordenadas por idNoti descendente)
app.get('/notificaciones/:idPerfil', async (req, res) => {
  const { idPerfil } = req.params;
  if (!idPerfil) {
    return res.status(400).json({ error: 'Falta el parámetro idPerfil' });
  }
  const { data, error } = await supabase
    .from('Notificaciones')
    .select('idNoti, textoNoti, idTipoNoti, idPerfil')
    .eq('idPerfil', idPerfil)
    .order('idNoti', { ascending: false });
  if (error) {
    console.error('Error al listar notificaciones:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

app.get('/notificaciones/noti/:idNoti', async (req, res) => {
  const { idNoti } = req.params;
  if (!idNoti) {
    return res.status(400).json({ error: 'Falta el parámetro idNoti' });
  }
  const { data, error } = await supabase
    .from('Notificaciones')
    .select('*')
    .eq('idNoti', idNoti)
    .single();
  if (error) {
    console.error('Error al obtener la notificación:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Aceptar invitación a plan
// Espera: { idPlan, idPerfil } en el body
app.post('/planes/aceptar-invitacion', async (req, res) => {
  const { idPlan, idPerfil } = req.body;
  if (!idPlan || !idPerfil) {
    return res.status(400).json({ error: 'Faltan parámetros: idPlan, idPerfil' });
  }

  // Actualiza el registro de ParticipantePlan para marcarlo como aceptado
  const { error } = await supabase
    .from('ParticipantePlan')
    .update({ aceptado: true }) // Asume que tienes un campo "aceptado" boolean en ParticipantePlan
    .eq('idPlan', idPlan)
    .eq('idPerfil', idPerfil);

  if (error) {
    console.error('Error al aceptar invitación:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true, message: 'Invitación aceptada' });
});

// Rechazar invitación a plan
// Espera: { idPlan, idPerfil } en el body
app.post('/planes/declinar-invitacion', async (req, res) => {
  const { idPlan, idPerfil } = req.body;
  if (!idPlan || !idPerfil) {
    return res.status(400).json({ error: 'Faltan parámetros: idPlan, idPerfil' });
  }

  // Elimina el registro de ParticipantePlan (el usuario rechaza la invitación)
  const { error } = await supabase
    .from('ParticipantePlan')
    .delete()
    .eq('idPlan', idPlan)
    .eq('idPerfil', idPerfil);

  if (error) {
    console.error('Error al rechazar invitación:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true, message: 'Invitación rechazada' });
});

  
app.put('/perfiles/:id/foto', async (req, res) => {
  const { id } = req.params;
  const { foto } = req.body; // debería ser la URL pública
  const { error } = await supabase.from('perfiles').update({ foto }).eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Obtener un plan por su idPlan
app.get('/planes/:idPlan', async (req, res) => {
  const { idPlan } = req.params;
  if (!idPlan) {
    return res.status(400).json({ error: 'Falta el parámetro idPlan' });
  }
  const { data, error } = await supabase
    .from('Planes')
    .select('*')
    .eq('idPlan', idPlan)
    .single();
  if (error) {
    console.error('Error al obtener el plan:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Obtener todos los planes donde el usuario es participante (aceptado) o anfitrión
app.get('/mis-planes/:userId', async (req, res) => {
  const { userId } = req.params;
  // 1. Buscar idPlanes donde el usuario participa y aceptó
  const { data: participaciones, error: partError } = await supabase
    .from('ParticipantePlan')
    .select('idPlan')
    .eq('idPerfil', userId)
    .eq('aceptado', true);

  if (partError) return res.status(500).json({ error: partError.message });

  const idPlanesParticipa = participaciones.map(p => p.idPlan);

  // 2. Buscar todos los planes donde es anfitrión o participante (aceptado)
  let filters = [`idAnfitrion.eq.${userId}`];
  if (idPlanesParticipa.length > 0) {
    filters.push(`idPlan.in.(${idPlanesParticipa.join(',')})`);
  }

  const { data: planes, error: planesError } = await supabase
    .from('Planes')
    .select('*')
    .or(filters.join(','));

  if (planesError) return res.status(500).json({ error: planesError.message });

  res.json(planes);
});
  
// Eliminar un plan y sus participantes
app.delete('/planes/:idPlan', async (req, res) => {
  const { idPlan } = req.params;

  try {
    // 1. Eliminar los participantes del plan
    const { error: partError } = await supabase
      .from('ParticipantePlan')
      .delete()
      .eq('idPlan', idPlan);

    if (partError) {
      console.error('Error al eliminar participantes:', partError);
      return res.status(500).json({ error: 'Error al eliminar participantes del plan' });
    }

    // 2. Eliminar el plan
    const { error: planError } = await supabase
      .from('Planes')
      .delete()
      .eq('idPlan', idPlan);

    if (planError) {
      console.error('Error al eliminar plan:', planError);
      return res.status(500).json({ error: 'Error al eliminar el plan' });
    }

    res.status(204).send(); // Eliminado correctamente, sin contenido
  } catch (err) {
    console.error('Error general al eliminar plan:', err);
    res.status(500).json({ error: 'Error interno al eliminar el plan' });
  }
});

// Trae todos los datos de un plan: info del plan, participantes (con perfil) y el idLugar
app.get('/planes/:idPlan/detalle', async (req, res) => {
  const { idPlan } = req.params;

  // 1. Traer el plan
  const { data: plan, error: planError } = await supabase
    .from('Planes')
    .select('*')
    .eq('idPlan', idPlan)
    .single();

  if (planError || !plan) {
    return res.status(404).json({ error: 'Plan no encontrado' });
  }

  // 2. Traer los participantes con perfil
  const { data: participantes, error: partError } = await supabase
    .from('ParticipantePlan')
    .select('idPerfil, perfiles: idPerfil (id, nombre, username, foto)')
    .eq('idPlan', idPlan);

  if (partError) {
    return res.status(500).json({ error: 'Error al obtener participantes' });
  }

  // 3. Armar la lista de participantes con datos útiles
  const participantesList = participantes.map(row => ({
    id: row.idPerfil,
    nombre: row.perfiles?.nombre,
    username: row.perfiles?.username,
    avatarUrl: row.perfiles?.foto,
  }));

  // 4. Devolver todo junto
  res.json({
    ...plan,
    participantes: participantesList,
    // El campo idLugar lo devuelves tal cual, el frontend decide si es place_id o dirección
    // Si quieres expandir el lugar desde el backend, avísame y te armo el fetch a Google Places aquí también
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});