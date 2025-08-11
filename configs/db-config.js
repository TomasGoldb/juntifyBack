process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[DB] Variables de entorno faltantes para Supabase. Verifica SUPABASE_URL y SUPABASE_KEY');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
