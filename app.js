document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    if (!window.supabase) {
        console.error("Supabase no se cargó.");
        return;
    }

    const supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

    const $ = id => document.getElementById(id);

    const loginScreen = $("login-screen");
    const appScreen = $("app-screen");

    const googleLogin = $("google-login");
    const guestLogin = $("guest-login");
    const emailForm = $("email-login-form");
    const signupButton = $("signup-button");

    const emailInput = $("email");
    const passwordInput = $("password");
    const authMessage = $("auth-message");

    const sidebar = $("sidebar");
    const sidebarOverlay = $("sidebar-overlay");
    const closeSidebar = $("close-sidebar");
    const mobileMenu = $("mobile-menu");
    const desktopToggle = $("desktop-sidebar-toggle");

    const newChat = $("new-chat");
    const conversationList = $("conversation-list");

    const accountInfo = $("account-info");
    const logoutButton = $("logout-button");

    const chatTitle = $("chat-title");
    const messages = $("messages");

    const chatForm = $("chat-form");
    const messageInput = $("message-input");
    const sendButton = $("send-button");

    const settingsButton = $("settings-button");
    const settingsPanel = $("settings-panel");
    const closeSettings = $("close-settings");

    const themeSelector = $("theme-selector");
    const clearIncognito = $("clear-incognito");

    const previewModal = $("preview-modal");
    const previewFrame = $("html-preview");
    const closePreview = $("close-preview");

    let currentUser = null;
    let isIncognito = false;
    let conversations = [];
    let currentConversationId = null;
    let sending = false;

    const THEME_KEY = "byte_theme";
    const SIDEBAR_KEY = "byte_sidebar";
    const LOCAL_GUEST_KEY = "byte_incognito_chats";

    /* =====================================================
       THEME
    ===================================================== */

    const savedTheme =
        localStorage.getItem(THEME_KEY) ||
        "theme-liquid-glass-dark";

    document.body.className = savedTheme;
    themeSelector.value = savedTheme;

    themeSelector.addEventListener("change", () => {
        document.body.className = themeSelector.value;
        localStorage.setItem(THEME_KEY, themeSelector.value);
    });

    /* =====================================================
       SIDEBAR
    ===================================================== */

    function openSidebar() {
        sidebar.classList.add("open");
        sidebarOverlay.classList.add("visible");
    }

    function closeSidebarPanel() {
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("visible");
    }

    function toggleDesktopSidebar() {
        const hidden = document.body.classList.toggle(
            "sidebar-collapsed"
        );

        localStorage.setItem(
            SIDEBAR_KEY,
            hidden ? "closed" : "open"
        );
    }

    mobileMenu.addEventListener("click", openSidebar);
    closeSidebar.addEventListener("click", closeSidebarPanel);
    sidebarOverlay.addEventListener("click", closeSidebarPanel);

    desktopToggle.addEventListener(
        "click",
        toggleDesktopSidebar
    );

    if (localStorage.getItem(SIDEBAR_KEY) === "closed") {
        document.body.classList.add("sidebar-collapsed");
    }

    /* =====================================================
       AUTH MESSAGE
    ===================================================== */

    function authStatus(text, type = "") {
        authMessage.textContent = text;
        authMessage.className = "auth-message";

        if (type) {
            authMessage.classList.add(type);
        }
    }

    /* =====================================================
       AUTH
    ===================================================== */

    googleLogin.addEventListener("click", async () => {
        googleLogin.disabled = true;
        authStatus("Abriendo Google...");

        try {
            const { error } =
                await supabaseClient.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                        redirectTo:
                            window.location.origin +
                            window.location.pathname
                    }
                });

            if (error) throw error;

        } catch (error) {
            console.error(error);

            authStatus(
                "No se pudo iniciar sesión con Google: " +
                error.message,
                "error"
            );

            googleLogin.disabled = false;
        }
    });

    emailForm.addEventListener("submit", async event => {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) return;

        authStatus("Iniciando sesión...");

        try {
            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password
                });

            if (error) throw error;

            currentUser = data.user;
            isIncognito = false;

            enterApp();

        } catch (error) {
            console.error(error);

            authStatus(
                translateAuthError(error),
                "error"
            );
        }
    });

    signupButton.addEventListener("click", async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            authStatus(
                "Escribe tu correo y contraseña primero.",
                "error"
            );
            return;
        }

        authStatus("Creando cuenta...");

        try {
            const { data, error } =
                await supabaseClient.auth.signUp({
                    email,
                    password
                });

            if (error) throw error;

            if (data.session) {
                currentUser = data.user;
                isIncognito = false;

                enterApp();
            } else {
                authStatus(
                    "Cuenta creada. Revisa tu correo para confirmar la cuenta."
                );
            }

        } catch (error) {
            authStatus(
                translateAuthError(error),
                "error"
            );
        }
    });

    guestLogin.addEventListener("click", async () => {
        guestLogin.disabled = true;
        authStatus("Entrando como incógnito...");

        try {
            const { data, error } =
                await supabaseClient.auth.signInAnonymously();

            if (error) throw error;

            currentUser = data.user;
            isIncognito = true;

            enterApp();

        } catch (error) {
            console.error(error);

            authStatus(
                "No se pudo iniciar como incógnito: " +
                error.message,
                "error"
            );
        }

        guestLogin.disabled = false;
    });

    async function restoreSession() {
        const { data } =
            await supabaseClient.auth.getSession();

        if (!data.session) {
            loginScreen.classList.remove("hidden");
            appScreen.classList.add("hidden");
            return;
        }

        currentUser = data.session.user;

        isIncognito =
            currentUser.is_anonymous === true ||
            currentUser.app_metadata?.provider === "anonymous";

        enterApp();
    }

    supabaseClient.auth.onAuthStateChange(
        (_event, session) => {
            if (!session?.user) return;

            currentUser = session.user;

            isIncognito =
                currentUser.is_anonymous === true ||
                currentUser.app_metadata?.provider === "anonymous";
        }
    );

    function enterApp() {
        loginScreen.classList.add("hidden");
        appScreen.classList.remove("hidden");

        loadConversations();
        updateAccount();
    }

    /* =====================================================
       CONVERSATIONS
    ===================================================== */

    function storageKey() {
        if (isIncognito) {
            return LOCAL_GUEST_KEY;
        }

        return "byte_chats_" + currentUser.id;
    }

    function loadConversations() {
        try {
            const raw = localStorage.getItem(storageKey());

            conversations = raw
                ? JSON.parse(raw)
                : [];

            if (!Array.isArray(conversations)) {
                conversations = [];
            }

        } catch {
            conversations = [];
        }

        if (!conversations.length) {
            createConversation();
            return;
        }

        currentConversationId =
            conversations[0].id;

        renderConversationList();
        renderConversation();
    }

    function saveConversations() {
        localStorage.setItem(
            storageKey(),
            JSON.stringify(conversations)
        );
    }

    function createConversation() {
        const conversation = {
            id:
                Date.now().toString(36) +
                Math.random().toString(36).slice(2),
            title: "Nueva conversación",
            createdAt: Date.now(),
            messages: []
        };

        conversations.unshift(conversation);

        currentConversationId =
            conversation.id;

        saveConversations();

        renderConversationList();
        renderConversation();
    }

    function currentConversation() {
        return conversations.find(
            c => c.id === currentConversationId
        );
    }

    newChat.addEventListener("click", () => {
        createConversation();
        messageInput.focus();
        closeSidebarPanel();
    });

    function renderConversationList() {
        conversationList.innerHTML = "";

        conversations.forEach(conversation => {
            const button =
                document.createElement("button");

            button.className =
                "conversation-item" +
                (
                    conversation.id ===
                    currentConversationId
                        ? " active"
                        : ""
                );

            button.type = "button";

            button.innerHTML = `
                <span class="conversation-icon">▱</span>
                <span class="conversation-title">
                    ${escapeHTML(
                        conversation.title ||
                        "Nueva conversación"
                    )}
                </span>
            `;

            button.addEventListener("click", () => {
                currentConversationId =
                    conversation.id;

                renderConversationList();
                renderConversation();

                closeSidebarPanel();
            });

            conversationList.appendChild(button);
        });
    }

    /* =====================================================
       MESSAGE RENDERING
    ===================================================== */

    function renderConversation() {
        const conversation =
            currentConversation();

        messages.innerHTML = "";

        if (!conversation ||
            conversation.messages.length === 0) {
            renderWelcome();
            chatTitle.textContent =
                conversation?.title ||
                "Nueva conversación";
            return;
        }

        chatTitle.textContent =
            conversation.title;

        conversation.messages.forEach(message => {
            renderMessage(
                message.role,
                message.content
            );
        });

        scrollBottom();
    }

    function renderMessage(role, content) {
        const row =
            document.createElement("div");

        row.className =
            "message-row " +
            (role === "user"
                ? "user-row"
                : "assistant-row");

        const bubble =
            document.createElement("article");

        bubble.className =
            "message-bubble " +
            (role === "user"
                ? "user-bubble"
                : "assistant-bubble");

        if (role === "user") {
            bubble.textContent = content;
        } else {
            bubble.innerHTML =
                markdown(content);

            enhanceCodeBlocks(bubble);
        }

        row.appendChild(bubble);
        messages.appendChild(row);
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

        document
            .querySelectorAll(".suggestion")
            .forEach(button => {
                button.addEventListener(
                    "click",
                    () => {
                        messageInput.value =
                            button.dataset.prompt;

                        messageInput.focus();
                    }
                );
            });
    }

    /* =====================================================
       MARKDOWN
    ===================================================== */

    function markdown(content) {
        if (!window.marked) {
            return escapeHTML(content)
                .replace(/\n/g, "<br>");
        }

        const html =
            marked.parse(content, {
                breaks: true,
                gfm: true
            });

        return window.DOMPurify
            ? DOMPurify.sanitize(html)
            : html;
    }

    /* =====================================================
       CODE BLOCKS
    ===================================================== */

    function enhanceCodeBlocks(container) {
        container
            .querySelectorAll("pre")
            .forEach(pre => {

                if (pre.dataset.ready) return;

                pre.dataset.ready = "true";

                const code =
                    pre.querySelector("code");

                if (!code) return;

                const language =
                    [...code.classList]
                        .find(c =>
                            c.startsWith("language-")
                        )
                        ?.replace("language-", "")
                        .toUpperCase() ||
                    "CODE";

                const toolbar =
                    document.createElement("div");

                toolbar.className =
                    "code-toolbar";

                const label =
                    document.createElement("span");

                label.textContent = language;

                const actions =
                    document.createElement("div");

                actions.className =
                    "code-actions";

                const copy =
                    document.createElement("button");

                copy.type = "button";
                copy.className = "code-action";
                copy.title = "Copiar código";
                copy.textContent = "⧉";

                copy.addEventListener(
                    "click",
                    async () => {

                        try {
                            await navigator.clipboard.writeText(
                                code.textContent
                            );

                            copy.textContent = "✓";

                            setTimeout(
                                () => {
                                    copy.textContent = "⧉";
                                },
                                1200
                            );

                        } catch (error) {
                            console.error(error);
                        }
                    }
                );

                actions.appendChild(copy);

                const lang =
                    language.toLowerCase();

                if (
                    lang === "HTML" ||
                    lang === "HTM"
                ) {
                    const run =
                        document.createElement("button");

                    run.type = "button";
                    run.className =
                        "code-action";

                    run.title =
                        "Ejecutar HTML";

                    run.textContent = "▶";

                    run.addEventListener(
                        "click",
                        () => {
                            openPreview(
                                code.textContent
                            );
                        }
                    );

                    actions.appendChild(run);
                }

                toolbar.appendChild(label);
                toolbar.appendChild(actions);

                pre.prepend(toolbar);
            });
    }

    /* =====================================================
       HTML PREVIEW
    ===================================================== */

    function openPreview(html) {
        previewFrame.srcdoc = html;
        previewModal.classList.remove("hidden");
    }

    closePreview.addEventListener(
        "click",
        () => {
            previewModal.classList.add("hidden");
            previewFrame.srcdoc = "";
        }
    );

    previewModal.addEventListener(
        "click",
        event => {
            if (event.target === previewModal) {
                previewModal.classList.add("hidden");
                previewFrame.srcdoc = "";
            }
        }
    );

    /* =====================================================
       CHAT
    ===================================================== */

    chatForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            if (sending) return;

            const text =
                messageInput.value.trim();

            if (!text) return;

            const conversation =
                currentConversation();

            if (!conversation) return;

            sending = true;

            sendButton.disabled = true;
            messageInput.disabled = true;

            if (
                conversation.messages.length === 0
            ) {
                conversation.title =
                    text.length > 45
                        ? text.slice(0, 45) + "…"
                        : text;
            }

            conversation.messages.push({
                role: "user",
                content: text
            });

            messageInput.value = "";
            messageInput.style.height = "auto";

            saveConversations();

            renderConversationList();
            renderConversation();

            const typing =
                showTyping();

            try {

                const history =
                    conversation.messages.map(
                        message => ({
                            role: message.role,
                            content: message.content
                        })
                    );

                const {
                    data,
                    error
                } =
                    await supabaseClient.functions.invoke(
                        "chat",
                        {
                            body: {
                                messages: history
                            }
                        }
                    );

                if (error) throw error;

                const answer =
                    data?.choices?.[0]?.message?.content ||
                    data?.content ||
                    data?.message?.content;

                if (!answer) {
                    throw new Error(
                        "La respuesta de Byte estaba vacía."
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

                console.error(
                    "Error en Byte:",
                    error
                );

                typing.remove();

                conversation.messages.push({
                    role: "assistant",
                    content:
                        "No pude conectarme con Byte en este momento.\n\n" +
                        "**Error:** `" +
                        (error.message ||
                            "Error desconocido") +
                        "`"
                });

                saveConversations();
                renderConversation();

            } finally {

                sending = false;

                sendButton.disabled = false;
                messageInput.disabled = false;

                messageInput.focus();
            }
        }
    );

    function showTyping() {
        const row =
            document.createElement("div");

        row.className =
            "message-row assistant-row";

        row.innerHTML = `
            <article class="message-bubble assistant-bubble typing-bubble">
                <span></span>
                <span></span>
                <span></span>
            </article>
        `;

        messages.appendChild(row);

        scrollBottom();

        return row;
    }

    /* =====================================================
       INPUT
    ===================================================== */

    messageInput.addEventListener(
        "input",
        () => {
            messageInput.style.height = "auto";

            messageInput.style.height =
                Math.min(
                    messageInput.scrollHeight,
                    180
                ) + "px";
        }
    );

    messageInput.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {
                event.preventDefault();
                chatForm.requestSubmit();
            }
        }
    );

    /* =====================================================
       SETTINGS
    ===================================================== */

    settingsButton.addEventListener(
        "click",
        () => {
            settingsPanel.classList.remove(
                "hidden"
            );
        }
    );

    closeSettings.addEventListener(
        "click",
        () => {
            settingsPanel.classList.add(
                "hidden"
            );
        }
    );

    /* =====================================================
       CLEAR LOCAL
    ===================================================== */

    clearIncognito.addEventListener(
        "click",
        () => {

            const key =
                isIncognito
                    ? LOCAL_GUEST_KEY
                    : storageKey();

            if (
                !confirm(
                    "¿Borrar todas las conversaciones guardadas localmente?"
                )
            ) {
                return;
            }

            localStorage.removeItem(key);

            conversations = [];
            currentConversationId = null;

            createConversation();
        }
    );

    /* =====================================================
       ACCOUNT
    ===================================================== */

    function updateAccount() {

        if (isIncognito) {

            accountInfo.innerHTML = `
                <strong>👻 Incógnito</strong>
                <small>
                    Historial temporal local
                </small>
            `;

            return;
        }

        const name =
            currentUser?.user_metadata?.full_name ||
            currentUser?.user_metadata?.name ||
            currentUser?.email ||
            "Usuario";

        accountInfo.innerHTML = `
            <strong>${escapeHTML(name)}</strong>
            <small>
                ${escapeHTML(
                    currentUser?.email || ""
                )}
            </small>
        `;
    }

    /* =====================================================
       LOGOUT
    ===================================================== */

    logoutButton.addEventListener(
        "click",
        async () => {

            await supabaseClient.auth.signOut();

            currentUser = null;
            conversations = [];
            currentConversationId = null;
            isIncognito = false;

            appScreen.classList.add("hidden");
            loginScreen.classList.remove("hidden");

            authStatus("");
        }
    );

    /* =====================================================
       UTILS
    ===================================================== */

    function scrollBottom() {
        requestAnimationFrame(() => {
            messages.scrollTop =
                messages.scrollHeight;
        });
    }

    function escapeHTML(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function translateAuthError(error) {
        const message =
            String(error?.message || "")
                .toLowerCase();

        if (
            message.includes(
                "invalid login credentials"
            )
        ) {
            return "Correo o contraseña incorrectos.";
        }

        if (
            message.includes(
                "email not confirmed"
            )
        ) {
            return "Primero confirma tu correo.";
        }

        if (
            message.includes(
                "already registered"
            )
        ) {
            return "Ese correo ya tiene una cuenta.";
        }

        return (
            error?.message ||
            "No se pudo completar la operación."
        );
    }

    /* =====================================================
       START
    ===================================================== */

    restoreSession();
});
