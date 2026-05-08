import { createClient } from '@supabase/supabase-js';

// Define las variables correctamente con const y comillas
const supabaseUrl = 'https://wkjqbtmnrqbafzytrtfn.supabase.co';
const supabaseAnonKey = 'sb_publishable_R0Rs2nwtiuOyi8qBRJDH1g_L5_3HbrT';

// Ahora sí, creamos el cliente
export const supabase = createClient(supabaseUrl, supabaseAnonKey);