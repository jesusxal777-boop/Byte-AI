// ===== CONFIGURACIÓN BYTE AI =====
// Reemplaza estos valores con los de tu proyecto Supabase

const SUPABASE_URL = "https://rzlrgqixzobuyphudxtq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6bHJncWl4em9idXlwaHVkeHRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMzQwNTAsImV4cCI6MjEwNTYxMDA1MH0.FOZmtajaNeknM2TM-phiFzzCwa10ecsK_iMxBNC1Kkg"; // Ve a Supabase → Project Settings → API → anon public

// La Edge Function de chat ya está desplegada.
// Para activar el modelo real:
// 1. Crea cuenta gratis en https://console.groq.com
// 2. Genera una API Key
// 3. En Supabase → Edge Functions → Secrets → agrega GROQ_API_KEY = tu_key
