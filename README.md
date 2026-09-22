# Byte AI — DreamByte Studios

Asistente creativo de IA con 4 temas visuales, autenticación Google y almacenamiento de conversaciones.

## Temas incluidos
1. **Liquid Glass Oscuro** — Navy + colores holográficos
2. **Liquid Glass Claro** — Misma estética en modo claro
3. **Web 2000s Oscuro** — Estilo retro azul/verde neón
4. **Web 2000s Claro** — Estilo Windows 95/98 clásico

## Configuración rápida

### 1. Supabase Anon Key
Abre `config.js` y pega tu **anon public key**:
```
Supabase Dashboard → Project Settings → API → Project API keys → anon public
```

### 2. Google Auth
1. Ve a Supabase → Authentication → Providers → Google → Enable
2. Crea credenciales OAuth en [Google Cloud Console](https://console.cloud.google.com/)
3. Añade el Client ID y Secret en Supabase
4. En Authorized redirect URIs agrega:
   `https://rzlrgqixzobuyphudxtq.supabase.co/auth/v1/callback`
   y también la URL de GitHub Pages cuando la tengas.

### 3. Modelo gratuito (Groq)
1. Crea cuenta en [console.groq.com](https://console.groq.com) (gratis)
2. Genera una API Key
3. En Supabase → Edge Functions → Secrets → New secret:
   - Name: `GROQ_API_KEY`
   - Value: tu key de Groq

### 4. Activar GitHub Pages
1. Ve al repositorio → Settings → Pages
2. Source: Deploy from a branch → `main` → `/ (root)`
3. Guarda. La web estará en:
   `https://jesusxal777-boop.github.io/Byte-AI/`

## Estructura
- `index.html` — Interfaz
- `styles.css` — 4 temas completos
- `app.js` — Lógica de auth, chat y DB
- `config.js` — Claves (no subas keys privadas)

Hecho con ❤️ por DreamByte Studios
