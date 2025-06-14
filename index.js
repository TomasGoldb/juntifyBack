process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import fetch from 'node-fetch';
global.fetch = fetch;

import dotenv from 'dotenv';
dotenv.config();

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



  
  
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});