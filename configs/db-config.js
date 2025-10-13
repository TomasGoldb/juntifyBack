process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://example.supabase.co';
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'example-key';

if (!process.env.SUPABASE_URL) {
  console.warn('[DB] SUPABASE_URL no configurada. Usando valor por defecto para pruebas.');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[DB] SUPABASE_SERVICE_ROLE_KEY no configurada. Intentando usar SUPABASE_KEY/SUPABASE_ANON_KEY, pero las operaciones privilegiadas pueden fallar.');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
