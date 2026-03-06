import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ixgnyxuqdeeihuphdmfo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4Z255eHVxZGVlaWh1cGhkbWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NzMzNTEsImV4cCI6MjA4ODM0OTM1MX0.07yCq-QjGaDtorfFpp_vPkckt7BbKCPy9UxNJhYx5Ak';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
