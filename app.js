/* =========================================================
   BYTE AI — APP.JS
   DreamByte Studios
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =====================================================
       SUPABASE
       ===================================================== */

    if (!window.supabase) {
        console.error("Supabase JS no se cargó.");
        return;
    }

    if (
        typeof SUPABASE_URL === "undefined" ||
        typeof SUPABASE_ANON_KEY === "undefined"
    ) {
        console.error("Faltan SUPABASE_URL o SUPABASE_ANON_KEY.");
        return;
    }

    const supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

    /* =====================================================
       ELEMENTOS
       ===================================================== */

    const loginScreen = document.getElementById("login-screen");
    const appScreen = document.getElementById("app-screen");

    const googleLogin = document.getElementById("google-login");
    const guestLogin = document.getElementById("guest-login");

    const emailForm = document.getElementById("email-login-form");
    const signupButton = document.getElementById("signup-button");

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const authMessage = document.getElementById("auth-message");

    const logoutButton = document.getElementById("logout-button");
    const newChatButton = document.getElementById("new-chat");

    const chatForm = document.getElementById("chat-form");
    const messageInput = document.getElementById("message-input");
    const sendButton = document.getElementById("send-button");

    const messages = document.getElementById("messages");
    const conversationList = document.getElementById("conversation-list");
    const chatTitle = document.getElementById("chat-title");
    const accountInfo = document.getElementById("account-info");

    const settingsButton = document.getElementById("settings-button");
    const settingsPanel = document.getElementById("settings-panel");
    const closeSettings = document.getElementById("close-settings");

    const themeSelector = document.getElementById("theme-selector");
    const clearIncognito = document.getElementById("clear-incognito");

    const previewModal = document.getElementById("preview-modal");
    const previewFrame = document.getElementById("html-preview");
    const closePreview = document.getElementById("close-preview");

    const mobileMenu = document.getElementById("mobile-menu");
    const sidebar = document.getElementById("sidebar");

    /* =====================================================
       ESTADO
       ===================================================== */

    let currentUser = null;
    let isIncognito = false;

    let currentConversationId = null;
    let conversations = [];

    let sending = false;

    const LOCAL_KEY = "byte_ai_incognito_conversations";
    const THEME_KEY = "byte_ai_theme";

    /* =====================================================
       UTILIDADES
       ===================================================== */

    function setAuthMessage(text, type = "") {
        if (!authMessage) return;

        authMessage.textContent = text;
        authMessage.className = "auth-message";

        if (type) {
            authMessage.classList.add(type);
        }
    }

    function showLogin() {
        loginScreen?.classList.remove("hidden");
        appScreen?.classList.add("hidden");
    }

    function showApp() {
        loginScreen?.classList.add("hidden");
        appScreen?.classList.remove("hidden");
    }

    function escapeHTML(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function generateId() {
        return (
            Date.now().toString(36) +
            Math.random().toString(36).substring(2, 9)
        );
    }

    function getUserName(user) {
        if (!user) return "Incógnito";

        return (
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email ||
            "Usuario"
        );
    }

    /* =====================================================
       TEMA
       ===================================================== */

    function loadTheme() {
        const savedTheme =
            localStorage.getItem(THEME_KEY) ||
            "theme-liquid-glass-dark";

        document.body.className = savedTheme;

        if (themeSelector) {
            themeSelector.value = savedTheme;
        }
    }

    themeSelector?.addEventListener("change", () => {
        const theme = themeSelector.value;

        document.body.className = theme;
        localStorage.setItem(THEME_KEY, theme);
    });

    loadTheme();

    /* =====================================================
       LOCAL STORAGE / INCÓGNITO
       ===================================================== */

    function loadLocalConversations() {
        try {
            const raw = localStorage.getItem(LOCAL_KEY);

            if (!raw) {
                conversations = [];
                return;
            }

            const data = JSON.parse(raw);

            if (!Array.isArray(data)) {
                conversations = [];
                return;
            }

            // Las conversaciones locales duran 7 días.
            const now = Date.now();

            conversations = data.filter(item => {
                return (
                    item &&
                    item.createdAt &&
                    now - item.createdAt < 7 * 24 * 60 * 60 * 1000
                );
            });

            saveLocalConversations();
        } catch (error) {
            console.error("Error leyendo conversaciones locales:", error);
            conversations = [];
        }
    }

    function saveLocalConversations() {
        try {
            localStorage.setItem(
                LOCAL_KEY,
                JSON.stringify(conversations)
            );
        } catch (error) {
            console.error("No se pudo guardar el historial:", error);
        }
    }

    /* =====================================================
       CONVERSACIONES
       ===================================================== */

    function createConversation() {
        const conversation = {
            id: generateId(),
            title: "Nueva conversación",
            createdAt: Date.now(),
            messages: []
        };

        conversations.unshift(conversation);

        currentConversationId = conversation.id;

        saveConversations();

        renderConversationList();
        renderConversation();

        return conversation;
    }

    function getCurrentConversation() {
        return conversations.find(
            conversation => conversation.id === currentConversationId
        );
    }

    function saveConversations() {
        // Para incógnito todo queda exclusivamente en el navegador.
        if (isIncognito) {
            saveLocalConversations();
            return;
        }

        // También mantenemos una copia local para que la interfaz
        // no pierda el chat si se recarga.
        try {
            localStorage.setItem(
                "byte_ai_user_" + currentUser?.id,
                JSON.stringify(conversations)
            );
        } catch (error) {
            console.warn("No se pudo guardar historial local:", error);
        }
    }

    function loadUserConversations() {
        if (isIncognito) {
            loadLocalConversations();
            return;
        }

        try {
            const key = "byte_ai_user_" + currentUser?.id;
            const raw = localStorage.getItem(key);

            if (raw) {
                const parsed = JSON.parse(raw);

                if (Array.isArray(parsed)) {
                    conversations = parsed;
                    return;
                }
            }
        } catch (error) {
            console.warn("No se pudo cargar historial:", error);
        }

        conversations = [];
    }

    function renderConversationList() {
        if (!conversationList) return;

        conversationList.innerHTML = "";

        if (conversations.length === 0) {
            const empty = document.createElement("div");

            empty.className = "conversation-empty";
            empty.textContent = "No hay conversaciones todavía.";

            conversationList.appendChild(empty);
            return;
        }

        conversations.forEach(conversation => {
            const button = document.createElement("button");

            button.className =
                "conversation-item" +
                (conversation.id === currentConversationId
                    ? " active"
                    : "");

            button.textContent =
                conversation.title || "Nueva conversación";

            button.addEventListener("click", () => {
                currentConversationId = conversation.id;

                renderConversationList();
                renderConversation();

                sidebar?.classList.remove("open");
            });

            conversationList.appendChild(button);
        });
    }

    function renderConversation() {
        const conversation = getCurrentConversation();

        if (!conversation) {
            renderWelcome();
            chatTitle.textContent = "Nueva conversación";
            return;
        }

        chatTitle.textContent =
            conversation.title || "Nueva conversación";

        messages.innerHTML = "";

        if (!conversation.messages.length) {
            renderWelcome();
            return;
        }

        conversation.messages.forEach(message => {
            renderMessage(message.role, message.content);
        });

        scrollToBottom();
    }

    function renderWelcome() {
        messages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-logo">B</div>

                <h1>¿Qué hacemos hoy?</h1>

                <p>
                    Soy Byte, el asistente de DreamByte Studios.
                </p>

                <div class="suggestions">

                    <button
                        class="suggestion"
                        data-prompt="Dame ideas para un proyecto tecnológico."
                    >
                        💡 Ideas para proyectos
                    </button>

                    <button
                        class="suggestion"
                        data-prompt="Ayúdame a programar una aplicación."
                    >
                        💻 Programar una app
                    </button>

                    <button
                        class="suggestion"
                        data-prompt="Ayúdame a escribir un guion."
                    >
                        🎬 Crear un guion
                    </button>

                    <button
                        class="suggestion"
                        data-prompt="Explícame un concepto de programación de forma sencilla."
                    >
                        🧠 Aprender algo
                    </button>

                </div>
            </div>
        `;

        document.querySelectorAll(".suggestion").forEach(button => {
            button.addEventListener("click", () => {
                messageInput.value = button.dataset.prompt;
                messageInput.focus();
            });
        });
    }

    /* =====================================================
       MENSAJES
       ===================================================== */

    function renderMessage(role, content) {
        const wrapper = document.createElement("div");

        wrapper.className =
            role === "user"
                ? "message message-user"
                : "message message-assistant";

        const bubble = document.createElement("div");
        bubble.className = "message-bubble";

        if (role === "user") {
            bubble.textContent = content;
        } else {
            bubble.innerHTML = renderMarkdown(content);
        }

        wrapper.appendChild(bubble);
        messages.appendChild(wrapper);

        if (role === "assistant") {
            addCodeTools(bubble);
        }
    }

    function renderMarkdown(content) {
        if (!window.marked) {
            return escapeHTML(content).replace(/\n/g, "<br>");
        }

        marked.setOptions({
            breaks: true,
            gfm: true
        });

        const html = marked.parse(content);

        if (window.DOMPurify) {
            return DOMPurify.sanitize(html, {
                ADD_ATTR: ["target"]
            });
        }

        return html;
    }

    /* =====================================================
       CÓDIGO — COPIAR + HTML
       ===================================================== */

    function addCodeTools(container) {
        const blocks = container.querySelectorAll("pre");

        blocks.forEach(pre => {
            if (pre.dataset.enhanced === "true") return;

            pre.dataset.enhanced = "true";

            const code = pre.querySelector("code");

            if (!code) return;

            const toolbar = document.createElement("div");
            toolbar.className = "code-toolbar";

            const language =
                [...code.classList]
                    .find(className =>
                        className.startsWith("language-")
                    )
                    ?.replace("language-", "") || "";

            const languageLabel = document.createElement("span");

            languageLabel.textContent =
                language || "code";

            const actions = document.createElement("div");
            actions.className = "code-actions";

            const copyButton = document.createElement("button");

            copyButton.type = "button";
            copyButton.className = "code-action";
            copyButton.title = "Copiar código";
            copyButton.innerHTML = "⧉";

            copyButton.addEventListener("click", async () => {
                try {
                    await navigator.clipboard.writeText(
                        code.textContent
                    );

                    copyButton.textContent = "✓";

                    setTimeout(() => {
                        copyButton.textContent = "⧉";
                    }, 1500);
                } catch (error) {
                    console.error("No se pudo copiar:", error);
                }
            });

            actions.appendChild(copyButton);

            const normalizedLanguage = language.toLowerCase();

            if (
                normalizedLanguage === "html" ||
                normalizedLanguage === "htm"
            ) {
                const previewButton =
                    document.createElement("button");

                previewButton.type = "button";
                previewButton.className = "code-action";
                previewButton.title = "Ejecutar HTML";
                previewButton.innerHTML = "▶";

                previewButton.addEventListener("click", () => {
                    openHTMLPreview(code.textContent);
                });

                actions.appendChild(previewButton);
            }

            toolbar.appendChild(languageLabel);
            toolbar.appendChild(actions);

            pre.prepend(toolbar);
        });
    }

    function openHTMLPreview(html) {
        if (!previewModal || !previewFrame) return;

        previewFrame.srcdoc = html;
        previewModal.classList.remove("hidden");
    }

    closePreview?.addEventListener("click", () => {
        previewModal?.classList.add("hidden");

        if (previewFrame) {
            previewFrame.srcdoc = "";
        }
    });

    previewModal?.addEventListener("click", event => {
        if (event.target === previewModal) {
            previewModal.classList.add("hidden");

            if (previewFrame) {
                previewFrame.srcdoc = "";
            }
        }
    });

    /* =====================================================
       SCROLL
       ===================================================== */

    function scrollToBottom() {
        requestAnimationFrame(() => {
            messages.scrollTop = messages.scrollHeight;
        });
    }

    /* =====================================================
       LOGIN — GOOGLE
       ===================================================== */

    googleLogin?.addEventListener("click", async () => {
        setAuthMessage("Abriendo Google...");

        googleLogin.disabled = true;

        try {
            const redirectTo =
                window.location.origin +
                window.location.pathname;

            const { error } =
                await supabaseClient.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                        redirectTo
                    }
                });

            if (error) {
                throw error;
            }
        } catch (error) {
            console.error(error);

            setAuthMessage(
                "No se pudo iniciar sesión con Google: " +
                (error.message || "Error desconocido"),
                "error"
            );

            googleLogin.disabled = false;
        }
    });

    /* =====================================================
       LOGIN — CORREO
       ===================================================== */

    emailForm?.addEventListener("submit", async event => {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) return;

        setAuthMessage("Iniciando sesión...");

        const submitButton =
            emailForm.querySelector('button[type="submit"]');

        if (submitButton) submitButton.disabled = true;

        try {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) {
                throw error;
            }

            if (data?.user) {
                currentUser = data.user;
                isIncognito = false;

                enterApplication();
            }
        } catch (error) {
            console.error(error);

            setAuthMessage(
                translateAuthError(error),
                "error"
            );
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });

    /* =====================================================
       REGISTRO
       ===================================================== */

    signupButton?.addEventListener("click", async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            setAuthMessage(
                "Escribe primero tu correo y una contraseña."
            );
            return;
        }

        if (password.length < 6) {
            setAuthMessage(
                "La contraseña debe tener al menos 6 caracteres.",
                "error"
            );
            return;
        }

        setAuthMessage("Creando cuenta...");

        signupButton.disabled = true;

        try {
            const { data, error } =
                await supabaseClient.auth.signUp({
                    email,
                    password
                });

            if (error) {
                throw error;
            }

            if (data?.session && data?.user) {
                currentUser = data.user;
                isIncognito = false;

                enterApplication();
            } else {
                setAuthMessage(
                    "Cuenta creada. Revisa tu correo para confirmar la cuenta."
                );
            }
        } catch (error) {
            console.error(error);

            setAuthMessage(
                translateAuthError(error),
                "error"
            );
        } finally {
            signupButton.disabled = false;
        }
    });

    /* =====================================================
       INCÓGNITO
       ===================================================== */

    guestLogin?.addEventListener("click", async () => {
        setAuthMessage("Entrando como incógnito...");

        guestLogin.disabled = true;

        try {
            /*
             * Supabase Anonymous Auth crea una sesión temporal
             * con JWT. Por eso tu Edge Function `chat`, que
             * tiene verify_jwt=true, puede seguir protegida.
             */

            const { data, error } =
                await supabaseClient.auth.signInAnonymously();

            if (error) {
                throw error;
            }

            if (!data?.user || !data?.session) {
                throw new Error(
                    "Supabase no devolvió una sesión anónima."
                );
            }

            currentUser = data.user;
            isIncognito = true;

            enterApplication();
        } catch (error) {
            console.error(error);

            setAuthMessage(
                "No se pudo entrar como incógnito: " +
                (error.message || "Error desconocido"),
                "error"
            );
        } finally {
            guestLogin.disabled = false;
        }
    });

    /* =====================================================
       SESIÓN EXISTENTE
       ===================================================== */

    async function restoreSession() {
        try {
            const { data, error } =
                await supabaseClient.auth.getSession();

            if (error) {
                console.error(error);
                showLogin();
                return;
            }

            const session = data?.session;

            if (!session?.user) {
                showLogin();
                return;
            }

            currentUser = session.user;

            /*
             * Los usuarios anónimos de Supabase tienen
             * is_anonymous dentro de app_metadata.
             */
            isIncognito =
                currentUser.is_anonymous === true ||
                currentUser.app_metadata?.provider === "anonymous";

            enterApplication();
        } catch (error) {
            console.error("Error restaurando sesión:", error);
            showLogin();
        }
    }

    supabaseClient.auth.onAuthStateChange(
        (_event, session) => {
            if (!session?.user) {
                return;
            }

            currentUser = session.user;

            isIncognito =
                currentUser.is_anonymous === true ||
                currentUser.app_metadata?.provider === "anonymous";
        }
    );

    /* =====================================================
       ENTRAR A LA APP
       ===================================================== */

    function enterApplication() {
        showApp();

        loadUserConversations();

        if (conversations.length === 0) {
            createConversation();
        } else {
            currentConversationId = conversations[0].id;

            renderConversationList();
            renderConversation();
        }

        updateAccountInfo();
    }

    function updateAccountInfo() {
        if (!accountInfo) return;

        if (isIncognito) {
            accountInfo.innerHTML = `
                <strong>👻 Modo incógnito</strong>
                <small>
                    Las conversaciones se guardan temporalmente
                    en este navegador.
                </small>
            `;

            return;
        }

        const name = getUserName(currentUser);

        accountInfo.innerHTML = `
            <strong>${escapeHTML(name)}</strong>
            <small>
                ${escapeHTML(currentUser?.email || "")}
            </small>
        `;
    }

    /* =====================================================
       LOGOUT
       ===================================================== */

    logoutButton?.addEventListener("click", async () => {
        try {
            await supabaseClient.auth.signOut();
        } catch (error) {
            console.error(error);
        }

        currentUser = null;
        isIncognito = false;
        currentConversationId = null;
        conversations = [];

        showLogin();

        emailInput.value = "";
        passwordInput.value = "";

        setAuthMessage("");
    });

    /* =====================================================
       NUEVA CONVERSACIÓN
       ===================================================== */

    newChatButton?.addEventListener("click", () => {
        createConversation();

        sidebar?.classList.remove("open");

        messageInput?.focus();
    });

    /* =====================================================
       ENVIAR MENSAJE
       ===================================================== */

    chatForm?.addEventListener("submit", async event => {
        event.preventDefault();

        if (sending) return;

        const content = messageInput.value.trim();

        if (!content) return;

        const conversation =
            getCurrentConversation() ||
            createConversation();

        if (!conversation) return;

        sending = true;

        sendButton.disabled = true;
        messageInput.disabled = true;

        /*
         * Primer mensaje = título automático.
         */
        if (conversation.messages.length === 0) {
            conversation.title =
                content.length > 40
                    ? content.substring(0, 40) + "…"
                    : content;

            chatTitle.textContent = conversation.title;
        }

        conversation.messages.push({
            role: "user",
            content
        });

        messageInput.value = "";

        renderConversationList();
        renderConversation();

        saveConversations();

        const typing = showTypingIndicator();

        try {
            const history = conversation.messages.map(message => ({
                role: message.role,
                content: message.content
            }));

            const response =
                await supabaseClient.functions.invoke(
                    "chat",
                    {
                        body: {
                            messages: history
                        }
                    }
                );

            if (response.error) {
                throw response.error;
            }

            const data = response.data;

            const answer =
                extractAIResponse(data);

            if (!answer) {
                throw new Error(
                    "Byte no devolvió ningún mensaje."
                );
            }

            conversation.messages.push({
                role: "assistant",
                content: answer
            });

            saveConversations();

            typing.remove();

            renderConversationList();
            renderConversation();

        } catch (error) {
            console.error("Error del chat:", error);

            typing.remove();

            const errorText =
                "No pude conectarme con Byte en este momento.\n\n" +
                "Error: " +
                (error.message || "Error desconocido");

            conversation.messages.push({
                role: "assistant",
                content: errorText
            });

            saveConversations();

            renderConversation();
        } finally {
            sending = false;

            sendButton.disabled = false;
            messageInput.disabled = false;

            messageInput.focus();
        }
    });

    /* =====================================================
       RESPUESTA DE LA EDGE FUNCTION
       ===================================================== */

    function extractAIResponse(data) {
        if (!data) return "";

        /*
         * Formato actual de tu función:
         * {
         *   choices: [
         *     {
         *       message: {
         *         content: "..."
         *       }
         *     }
         *   ]
         * }
         */

        if (
            data.choices &&
            data.choices[0]?.message?.content
        ) {
            return data.choices[0].message.content;
        }

        /*
         * Compatibilidad por si la función devuelve:
         * { content: "..." }
         */

        if (typeof data.content === "string") {
            return data.content;
        }

        /*
         * Compatibilidad adicional.
         */

        if (
            data.message &&
            typeof data.message.content === "string"
        ) {
            return data.message.content;
        }

        return "";
    }

    /* =====================================================
       TYPING
       ===================================================== */

    function showTypingIndicator() {
        const wrapper = document.createElement("div");

        wrapper.className =
            "message message-assistant typing-message";

        wrapper.innerHTML = `
            <div class="message-bubble typing-bubble">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;

        messages.appendChild(wrapper);

        scrollToBottom();

        return wrapper;
    }

    /* =====================================================
       TEXTAREA
       ===================================================== */

    messageInput?.addEventListener("input", () => {
        messageInput.style.height = "auto";

        messageInput.style.height =
            Math.min(messageInput.scrollHeight, 180) + "px";
    });

    messageInput?.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();

            chatForm.requestSubmit();
        }
    });

    /* =====================================================
       SETTINGS
       ===================================================== */

    settingsButton?.addEventListener("click", () => {
        settingsPanel?.classList.remove("hidden");
    });

    closeSettings?.addEventListener("click", () => {
        settingsPanel?.classList.add("hidden");
    });

    /* =====================================================
       BORRAR HISTORIAL LOCAL
       ===================================================== */

    clearIncognito?.addEventListener("click", () => {
        const confirmed = confirm(
            "¿Quieres borrar las conversaciones guardadas en este navegador?"
        );

        if (!confirmed) return;

        localStorage.removeItem(LOCAL_KEY);

        if (isIncognito) {
            conversations = [];
            currentConversationId = null;

            createConversation();
        }

        setAuthMessage("");
    });

    /* =====================================================
       MENÚ MÓVIL
       ===================================================== */

    mobileMenu?.addEventListener("click", () => {
        sidebar?.classList.toggle("open");
    });

    /* =====================================================
       ERRORES DE AUTENTICACIÓN
       ===================================================== */

    function translateAuthError(error) {
        const message =
            String(error?.message || "").toLowerCase();

        if (message.includes("invalid login credentials")) {
            return "Correo o contraseña incorrectos.";
        }

        if (message.includes("email not confirmed")) {
            return "Primero confirma tu correo electrónico.";
        }

        if (message.includes("user already registered")) {
            return "Ese correo ya tiene una cuenta.";
        }

        if (message.includes("password")) {
            return (
                error.message ||
                "La contraseña no es válida."
            );
        }

        return (
            error?.message ||
            "No se pudo completar la operación."
        );
    }

    /* =====================================================
       INICIO
       ===================================================== */

    restoreSession();
});
