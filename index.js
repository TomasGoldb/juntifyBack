process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import fetch from 'node-fetch';
global.fetch = fetch;

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { sendPushNotification } from './sendPushNotification.js'; // o la ruta que corresponda

// Configura tus credenciales de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = 3000;

app.use(express.json()); // para poder leer JSON en POST y PUT






app.get('/', (req, res) => {
    res.json('Bienvenido a la API de Juntify');
});

app.post('/registro', async (req, res) => {
    const { email, password, username, nombre, apellido } = req.body;

  // Paso 1: Crear el usuario en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (authError) {
    console.error('Error al crear el usuario:', authError);
    return res.status(400).json({ error: authError.message ?? authError ?? 'Error desconocido en Auth' });
  }




  const userId = authData.user.id;

  // Paso 2: Insertar los datos adicionales en la tabla profiles
  const { error: profileError } = await supabase.from('perfiles').insert([
    {
      id: userId,
      username,
      nombre,
      apellido
    }
  ]);
  console.log('profileError:', profileError);
  console.log(profileError)
  if (profileError) {
  console.error('Error al insertar en profiles:', profileError);
  return res.status(400).json({ error: profileError.message ?? profileError ?? 'Error desconocido en profiles' });
}

  res.json({
    message: 'Usuario registrado exitosamente. Revisa tu correo para confirmar.',
    user: authData.user
  });
});
app.get('/pruebaPlanes', async (req, res) => {
    const { data, error } = await supabase.from('Planes').select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });


  app.post('/enviar-notificacion', async (req, res) => {
    const { token } = req.body;
  
    if (!token) {
      return res.status(400).json({ error: 'Falta el token' });
    }
  
    try {
      await sendPushNotification(token, '¡Hola!', 'Esta es una notificación desde el backend');
      res.json({ success: true });
    } catch (err) {
      console.error('Error al enviar notificación:', err);
      res.status(500).json({ error: 'Error interno al enviar notificación' });
    }
  });

  app.post('/api/push-token', async (req, res) => {
    const { userId, expoPushToken } = req.body;
  
    const { error } = await supabase
      .from('perfiles')
      .update({ push_token: expoPushToken })
      .eq('id', userId);
  
    if (error) {
      console.error('Error actualizando token:', error);
      return res.status(500).json({ error: 'Error al guardar token' });
    }
  
    res.json({ success: true });
  });

  app.post('/login', async (req, res) => {
    const { email, password } = req.body;
  
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
  
    if (authError) {
      console.error('Error al iniciar sesión:', authError);
      return res.status(401).json({ error: authError.message });
    }
  
    const userId = authData.user.id;
  
    const { data: perfilData, error: perfilError } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', userId)
      .single();
  
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
  
  
  
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });

