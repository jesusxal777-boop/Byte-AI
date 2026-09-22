// ===== BYTE AI - App =====
const { createClient } = supabase;

let sb;
let currentUser = null;
let currentConversationId = null;
let messagesCache = [];

// Init
document.addEventListener("DOMContentLoaded", () => {
  if (SUPABASE_ANON_KEY === "PEGA_AQUI_TU_ANON_KEY") {
    alert("Por favor configura tu SUPABASE_ANON_KEY en config.js");
  }
  sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Theme
  const savedTheme = localStorage.getItem("byte-theme") || "liquid-glass-dark";
  setTheme(savedTheme);
  document.getElementById("theme-select").value = savedTheme;
  document.getElementById("theme-select").addEventListener("change", (e) => {
    setTheme(e.target.value);
    localStorage.setItem("byte-theme", e.target.value);
  });

  // Auth check
  sb.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      currentUser = session.user;
      showChat();
    } else {
      showLogin();
    }
  });

  sb.auth.onAuthStateChange((_event, session) => {
    if (session) {
      currentUser = session.user;
      showChat();
    } else {
      currentUser = null;
      showLogin();
    }
  });

  // Buttons
  document.getElementById("btn-google").addEventListener("click", signInWithGoogle);
  document.getElementById("btn-logout").addEventListener("click", signOut);
  document.getElementById("btn-new-chat").addEventListener("click", newConversation);
  document.getElementById("btn-send").addEventListener("click", sendMessage);
  document.getElementById("user-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
});

function setTheme(theme) {
  document.body.className = "theme-" + theme;
}

function showLogin() {
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("chat-screen").classList.add("hidden");
}

function showChat() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("chat-screen").classList.remove("hidden");

  // User info
  const meta = currentUser.user_metadata || {};
  document.getElementById("user-name").textContent = meta.full_name || meta.name || currentUser.email?.split("@")[0] || "Usuario";
  document.getElementById("user-avatar").src = meta.avatar_url || "https://api.dicebear.com/7.x/identicon/svg?seed=" + currentUser.id;

  loadConversations();
}

async function signInWithGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname
    }
  });
  if (error) alert("Error al iniciar sesión: " + error.message);
}

async function signOut() {
  await sb.auth.signOut();
}

async function loadConversations() {
  const { data, error } = await sb
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  const list = document.getElementById("conversations-list");
  list.innerHTML = "";

  if (error || !data) return;

  data.forEach((c) => {
    const div = document.createElement("div");
    div.className = "conv-item" + (c.id === currentConversationId ? " active" : "");
    div.textContent = c.title || "Conversación";
    div.onclick = () => openConversation(c.id, c.title);
    list.appendChild(div);
  });
}

async function newConversation() {
  const { data, error } = await sb
    .from("conversations")
    .insert({ user_id: currentUser.id, title: "Nueva conversación" })
    .select()
    .single();

  if (error) {
    console.error(error);
    return;
  }
  currentConversationId = data.id;
  messagesCache = [];
  document.getElementById("messages").innerHTML = "";
  document.getElementById("chat-title").textContent = data.title;
  loadConversations();
}

async function openConversation(id, title) {
  currentConversationId = id;
  document.getElementById("chat-title").textContent = title || "Conversación";
  loadConversations();

  const { data } = await sb
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  messagesCache = data || [];
  renderMessages();
}

function renderMessages() {
  const container = document.getElementById("messages");
  container.innerHTML = "";
  messagesCache.forEach((m) => {
    const div = document.createElement("div");
    div.className = "message " + m.role;
    div.innerHTML = `<div class="role">${m.role === "user" ? "Tú" : "Byte AI"}</div>${escapeHtml(m.content)}`;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function sendMessage() {
  const input = document.getElementById("user-input");
  const text = input.value.trim();
  if (!text) return;

  if (!currentConversationId) {
    await newConversation();
  }

  input.value = "";
  input.style.height = "auto";

  // Add user message
  const userMsg = { role: "user", content: text };
  messagesCache.push(userMsg);
  renderMessages();

  // Save user message
  await sb.from("messages").insert({
    conversation_id: currentConversationId,
    role: "user",
    content: text
  });

  // Update title if first message
  if (messagesCache.filter(m => m.role === "user").length === 1) {
    const title = text.slice(0, 40) + (text.length > 40 ? "..." : "");
    await sb.from("conversations").update({ title, updated_at: new Date().toISOString() }).eq("id", currentConversationId);
    document.getElementById("chat-title").textContent = title;
    loadConversations();
  }

  // Show typing
  const typing = document.createElement("div");
  typing.className = "message assistant";
  typing.id = "typing";
  typing.innerHTML = `<div class="role">Byte AI</div><div class="typing"><span></span><span></span><span></span></div>`;
  document.getElementById("messages").appendChild(typing);
  document.getElementById("messages").scrollTop = document.getElementById("messages").scrollHeight;

  document.getElementById("btn-send").disabled = true;

  try {
    const history = messagesCache.map(m => ({ role: m.role, content: m.content }));

    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ messages: history })
    });

    const data = await res.json();
    let reply = "Lo siento, no pude generar una respuesta.";

    if (data.choices && data.choices[0]?.message?.content) {
      reply = data.choices[0].message.content;
    } else if (data.error) {
      reply = "Error: " + data.error + " (¿Configuraste GROQ_API_KEY en Supabase?)";
    }

    // Remove typing
    document.getElementById("typing")?.remove();

    messagesCache.push({ role: "assistant", content: reply });
    renderMessages();

    await sb.from("messages").insert({
      conversation_id: currentConversationId,
      role: "assistant",
      content: reply
    });

    await sb.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", currentConversationId);

  } catch (err) {
    document.getElementById("typing")?.remove();
    const errMsg = "Error de conexión: " + err.message;
    messagesCache.push({ role: "assistant", content: errMsg });
    renderMessages();
  }

  document.getElementById("btn-send").disabled = false;
}

// Auto-resize textarea
document.getElementById("user-input")?.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = Math.min(this.scrollHeight, 150) + "px";
});
