import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wkjqbtmnrqbafzytrtfn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFidG1ucnFiYWZ6eXRydGZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNjkwNTEsImV4cCI6MjA5Mzg0NTA1MX0.FVAh5nO7m0ixIuEM--uQqy3lRBYpz3L4GqodSDOmGkc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);