// Configuración centralizada de Supabase
const SUPABASE_CONFIG = {
  url: "https://chvxckbilgyjyoncdcyb.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNodnhja2JpbGd5anlvbmNkY3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNzQwMjQsImV4cCI6MjA3Mjk1MDAyNH0.dtT5B8IVS641TZFYu1TkabidVHRw1ZucxCvOaqFMJns"
};

// Crear cliente de Supabase
const createSupabaseClient = () => {
  return window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
};