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

    /* =====================================================
       ELEMENTOS
    ===================================================== */

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

    /* =====================================================
       ESTADO
    ===================================================== */

    let currentUser = null;
    let isIncognito = false;

    let conversations = [];
    let currentConversationId = null;

    let sending = false;
    let loadingChats = false;
    let enteringApp = false;

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

    if (themeSelector) {
        themeSelector.value = savedTheme;

        themeSelector.addEventListener("change", () => {
            document.body.className = themeSelector.value;
            localStorage.setItem(
                THEME_KEY,
                themeSelector.value
            );
        });
    }

    /* =====================================================
       SIDEBAR
    ===================================================== */

    function openSidebar() {
        if (!sidebar) return;

        sidebar.classList.add("open");

        if (sidebarOverlay) {
            sidebarOverlay.classList.add("visible");
        }
    }

    function closeSidebarPanel() {
        if (!sidebar) return;

        sidebar.classList.remove("open");

        if (sidebarOverlay) {
            sidebarOverlay.classList.remove("visible");
        }
    }

    function toggleDesktopSidebar() {
        document.body.classList.toggle(
            "sidebar-collapsed"
        );

        const collapsed =
            document.body.classList.contains(
                "sidebar-collapsed"
            );

        localStorage.setItem(
            SIDEBAR_KEY,
            collapsed ? "closed" : "open"
        );
    }

    if (mobileMenu) {
        mobileMenu.addEventListener(
            "click",
            openSidebar
        );
    }

    if (closeSidebar) {
        closeSidebar.addEventListener(
            "click",
            () => {
                closeSidebarPanel();
            }
        );
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener(
            "click",
            closeSidebarPanel
        );
    }

    if (desktopToggle) {
        desktopToggle.addEventListener(
            "click",
            toggleDesktopSidebar
        );
    }

    if (
        localStorage.getItem(SIDEBAR_KEY) ===
        "closed"
    ) {
        document.body.classList.add(
            "sidebar-collapsed"
        );
    }

    /* =====================================================
       AUTH MESSAGE
    ===================================================== */

    function authStatus(text, type = "") {
        if (!authMessage) return;

        authMessage.textContent = text;
        authMessage.className = "auth-message";

        if (type) {
            authMessage.classList.add(type);
        }
    }

    /* =====================================================
       GOOGLE
    ===================================================== */

    if (googleLogin) {
        googleLogin.addEventListener(
            "click",
            async () => {

                googleLogin.disabled = true;

                authStatus(
                    "Abriendo Google..."
                );

                try {
                    const { error } =
                        await supabaseClient.auth
                            .signInWithOAuth({
                                provider: "google",
                                options: {
                                    redirectTo:
                                        window.location
                                            .origin +
                                        window.location
                                            .pathname
                                }
                            });

                    if (error) {
                        throw error;
                    }

                } catch (error) {

                    console.error(error);

                    authStatus(
                        "No se pudo iniciar sesión con Google: " +
                        error.message,
                        "error"
                    );

                    googleLogin.disabled = false;
                }
            }
        );
    }

    /* =====================================================
       EMAIL LOGIN
    ===================================================== */

    if (emailForm) {
        emailForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                const email =
                    emailInput?.value.trim();

                const password =
                    passwordInput?.value || "";

                if (!email || !password) {
                    authStatus(
                        "Escribe tu correo y contraseña.",
                        "error"
                    );
                    return;
                }

                authStatus(
                    "Iniciando sesión..."
                );

                try {

                    const { data, error } =
                        await supabaseClient.auth
                            .signInWithPassword({
                                email,
                                password
                            });

                    if (error) {
                        throw error;
                    }

                    currentUser = data.user;
                    isIncognito = false;

                    await enterApp();

                } catch (error) {

                    console.error(error);

                    authStatus(
                        translateAuthError(error),
                        "error"
                    );
                }
            }
        );
    }

    /* =====================================================
       SIGN UP
    ===================================================== */

    if (signupButton) {
        signupButton.addEventListener(
            "click",
            async () => {

                const email =
                    emailInput?.value.trim();

                const password =
                    passwordInput?.value || "";

                if (!email || !password) {
                    authStatus(
                        "Escribe tu correo y contraseña primero.",
                        "error"
                    );
                    return;
                }

                authStatus(
                    "Creando cuenta..."
                );

                try {

                    const { data, error } =
                        await supabaseClient.auth
                            .signUp({
                                email,
                                password
                            });

                    if (error) {
                        throw error;
                    }

                    if (data.session) {

                        currentUser =
                            data.user;

                        isIncognito = false;

                        await enterApp();

                    } else {

                        authStatus(
                            "Cuenta creada. Revisa tu correo para confirmar la cuenta."
                        );
                    }

                } catch (error) {

                    console.error(error);

                    authStatus(
                        translateAuthError(error),
                        "error"
                    );
                }
            }
        );
    }

    /* =====================================================
       MODO INCÓGNITO
    ===================================================== */

    if (guestLogin) {
        guestLogin.addEventListener(
            "click",
            async () => {

                guestLogin.disabled = true;

                authStatus(
                    "Entrando como incógnito..."
                );

                try {

                    const { data, error } =
                        await supabaseClient.auth
                            .signInAnonymously();

                    if (error) {
                        throw error;
                    }

                    currentUser =
                        data.user;

                    isIncognito = true;

                    await enterApp();

                } catch (error) {

                    console.error(error);

                    authStatus(
                        "No se pudo iniciar como incógnito: " +
                        error.message,
                        "error"
                    );

                } finally {

                    guestLogin.disabled = false;
                }
            }
        );
    }

    /* =====================================================
       RESTAURAR SESIÓN
    ===================================================== */

    async function restoreSession() {

        try {

            const { data, error } =
                await supabaseClient.auth
                    .getSession();

            if (error) {
                throw error;
            }

            if (!data.session) {

                loginScreen?.classList.remove(
                    "hidden"
                );

                appScreen?.classList.add(
                    "hidden"
                );

                return;
            }

            currentUser =
                data.session.user;

            isIncognito =
                currentUser?.is_anonymous === true ||
                currentUser?.app_metadata
                    ?.provider === "anonymous";

            await enterApp();

        } catch (error) {

            console.error(
                "Error restaurando sesión:",
                error
            );

            loginScreen?.classList.remove(
                "hidden"
            );

            appScreen?.classList.add(
                "hidden"
            );
        }
    }

    /* =====================================================
       AUTH STATE
    ===================================================== */

    supabaseClient.auth.onAuthStateChange(
        async (_event, session) => {

            if (!session?.user) {
                return;
            }

            currentUser =
                session.user;

            isIncognito =
                currentUser?.is_anonymous === true ||
                currentUser?.app_metadata
                    ?.provider === "anonymous";
        }
    );

    /* =====================================================
       ENTRAR A BYTE
    ===================================================== */

    async function enterApp() {

        if (enteringApp) return;

        enteringApp = true;

        loginScreen?.classList.add(
            "hidden"
        );

        appScreen?.classList.remove(
            "hidden"
        );

        updateAccount();

        try {
            await loadConversations();
        } finally {
            enteringApp = false;
        }
    }

    /* =====================================================
       CONVERSACIONES — SUPABASE
    ===================================================== */

    async function loadConversations() {

        if (loadingChats) return;

        loadingChats = true;

        try {

            /*
             * INCÓGNITO:
             * Se mantiene local para que no aparezca
             * en el historial permanente.
             */

            if (isIncognito) {

                loadIncognitoConversations();

                return;
            }

            if (!currentUser) {
                return;
            }

            const {
                data,
                error
            } = await supabaseClient
                .from("conversations")
                .select(
                    "id,user_id,title,created_at,updated_at"
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .order(
                    "updated_at",
                    {
                        ascending: false
                    }
                );

            if (error) {
                throw error;
            }

            conversations =
                Array.isArray(data)
                    ? data
                    : [];

            renderConversationList();

            if (!conversations.length) {

                await createConversation();

                return;
            }

            /*
             * Intentamos mantener la conversación
             * seleccionada si todavía existe.
             */

            const stillExists =
                conversations.some(
                    conversation =>
                        conversation.id ===
                        currentConversationId
                );

            if (!stillExists) {
                currentConversationId =
                    conversations[0].id;
            }

            renderConversationList();

            await loadMessages(
                currentConversationId
            );

        } catch (error) {

            console.error(
                "Error cargando conversaciones:",
                error
            );

            conversations = [];

            conversationList.innerHTML = `
                <div class="chat-error">
                    <strong>No se pudieron cargar los chats.</strong>
                    <small>${escapeHTML(
                        error.message ||
                        "Error de Supabase"
                    )}</small>
                    <button
                        type="button"
                        id="retry-chats"
                    >
                        Reintentar
                    </button>
                </div>
            `;

            $("retry-chats")?.addEventListener(
                "click",
                () => loadConversations()
            );

        } finally {

            loadingChats = false;
        }
    }

    /* =====================================================
       CARGAR MENSAJES — SUPABASE
    ===================================================== */

    async function loadMessages(
        conversationId
    ) {

        if (!conversationId) {
            messages.innerHTML = "";
            renderWelcome();
            return;
        }

        currentConversationId =
            conversationId;

        messages.innerHTML = `
            <div class="messages-loading">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;

        try {

            const {
                data,
                error
            } = await supabaseClient
                .from("messages")
                .select(
                    "id,conversation_id,role,content,created_at"
                )
                .eq(
                    "conversation_id",
                    conversationId
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );

            if (error) {
                throw error;
            }

            const conversation =
                conversations.find(
                    c =>
                        c.id ===
                        conversationId
                );

            if (conversation) {
                conversation.messages =
                    Array.isArray(data)
                        ? data
                        : [];
            }

            renderConversation();

        } catch (error) {

            console.error(
                "Error cargando mensajes:",
                error
            );

            messages.innerHTML = `
                <div class="chat-load-error">
                    <strong>No se pudieron cargar los mensajes.</strong>
                    <p>${escapeHTML(
                        error.message ||
                        "Error desconocido"
                    )}</p>
                </div>
            `;
        }
    }

    /* =====================================================
       CREAR CONVERSACIÓN — SUPABASE
    ===================================================== */

    async function createConversation() {

        if (isIncognito) {

            const conversation = {
                id:
                    Date.now().toString(36) +
                    Math.random()
                        .toString(36)
                        .slice(2),

                title:
                    "Nueva conversación",

                created_at:
                    new Date().toISOString(),

                updated_at:
                    new Date().toISOString(),

                messages: []
            };

            conversations.unshift(
                conversation
            );

            currentConversationId =
                conversation.id;

            saveIncognitoConversations();

            renderConversationList();
            renderConversation();

            return conversation;
        }

        if (!currentUser) {
            return null;
        }

        try {

            const {
                data,
                error
            } = await supabaseClient
                .from("conversations")
                .insert({
                    user_id:
                        currentUser.id,

                    title:
                        "Nueva conversación"
                })
                .select(
                    "id,user_id,title,created_at,updated_at"
                )
                .single();

            if (error) {
                throw error;
            }

            const conversation = {
                ...data,
                messages: []
            };

            conversations.unshift(
                conversation
            );

            currentConversationId =
                conversation.id;

            renderConversationList();
            renderConversation();

            return conversation;

        } catch (error) {

            console.error(
                "Error creando conversación:",
                error
            );

            authStatus(
                "No se pudo crear la conversación.",
                "error"
            );

            return null;
        }
    }

    /* =====================================================
       ACTUALIZAR TÍTULO
    ===================================================== */

    async function updateConversationTitle(
        conversation,
        title
    ) {

        conversation.title = title;

        if (isIncognito) {
            saveIncognitoConversations();
            return;
        }

        try {

            const { error } =
                await supabaseClient
                    .from("conversations")
                    .update({
                        title,
                        updated_at:
                            new Date()
                                .toISOString()
                    })
                    .eq(
                        "id",
                        conversation.id
                    )
                    .eq(
                        "user_id",
                        currentUser.id
                    );

            if (error) {
                throw error;
            }

        } catch (error) {

            console.error(
                "Error actualizando título:",
                error
            );
        }
    }

    /* =====================================================
       GUARDAR MENSAJE
    ===================================================== */

    async function saveMessage(
        conversationId,
        role,
        content
    ) {

        if (isIncognito) {
            saveIncognitoConversations();
            return;
        }

        const {
            data,
            error
        } = await supabaseClient
            .from("messages")
            .insert({
                conversation_id:
                    conversationId,

                role,

                content
            })
            .select(
                "id,conversation_id,role,content,created_at"
            )
            .single();

        if (error) {
            throw error;
        }

        return data;
    }

    /* =====================================================
       ACTUALIZAR TIMESTAMP
    ===================================================== */

    async function touchConversation(
        conversationId
    ) {

        if (isIncognito) {
            saveIncognitoConversations();
            return;
        }

        try {

            const { error } =
                await supabaseClient
                    .from("conversations")
                    .update({
                        updated_at:
                            new Date()
                                .toISOString()
                    })
                    .eq(
                        "id",
                        conversationId
                    )
                    .eq(
                        "user_id",
                        currentUser.id
                    );

            if (error) {
                throw error;
            }

        } catch (error) {

            console.error(
                "Error actualizando conversación:",
                error
            );
        }
    }

    /* =====================================================
       LISTA DE CONVERSACIONES
    ===================================================== */

    function renderConversationList() {

        if (!conversationList) return;

        conversationList.innerHTML = "";

        if (!conversations.length) {

            conversationList.innerHTML = `
                <div class="empty-chats">
                    Aún no tienes conversaciones.
                </div>
            `;

            return;
        }

        conversations.forEach(
            conversation => {

                const button =
                    document.createElement(
                        "button"
                    );

                button.type = "button";

                button.className =
                    "conversation-item" +
                    (
                        conversation.id ===
                        currentConversationId
                            ? " active"
                            : ""
                    );

                const icon =
                    document.createElement(
                        "span"
                    );

                icon.className =
                    "conversation-icon";

                icon.textContent = "▱";

                const title =
                    document.createElement(
                        "span"
                    );

                title.className =
                    "conversation-title";

                title.textContent =
                    conversation.title ||
                    "Nueva conversación";

                button.appendChild(icon);
                button.appendChild(title);

                button.addEventListener(
                    "click",
                    async () => {

                        currentConversationId =
                            conversation.id;

                        renderConversationList();

                        if (isIncognito) {
                            renderConversation();
                        } else {
                            await loadMessages(
                                conversation.id
                            );
                        }

                        closeSidebarPanel();
                    }
                );

                conversationList.appendChild(
                    button
                );
            }
        );
    }

    /* =====================================================
       NUEVO CHAT
    ===================================================== */

    if (newChat) {

        newChat.addEventListener(
            "click",
            async () => {

                const conversation =
                    await createConversation();

                if (conversation) {

                    messageInput?.focus();

                    closeSidebarPanel();
                }
            }
        );
    }

    /* =====================================================
       CONVERSACIÓN ACTUAL
    ===================================================== */

    function currentConversation() {

        return conversations.find(
            conversation =>
                conversation.id ===
                currentConversationId
        );
    }

    /* =====================================================
       RENDER CONVERSACIÓN
    ===================================================== */

    function renderConversation() {

        const conversation =
            currentConversation();

        if (!messages) return;

        messages.innerHTML = "";

        if (!conversation) {

            renderWelcome();

            if (chatTitle) {
                chatTitle.textContent =
                    "Nueva conversación";
            }

            return;
        }

        if (chatTitle) {
            chatTitle.textContent =
                conversation.title ||
                "Nueva conversación";
        }

        const list =
            conversation.messages || [];

        if (!list.length) {

            renderWelcome();

            return;
        }

        list.forEach(message => {

            renderMessage(
                message.role,
                message.content
            );
        });

        scrollBottom();
    }

    /* =====================================================
       MENSAJES
    ===================================================== */

    function renderMessage(
        role,
        content
    ) {

        const row =
            document.createElement(
                "div"
            );

        row.className =
            "message-row " +
            (
                role === "user"
                    ? "user-row"
                    : "assistant-row"
            );

        const bubble =
            document.createElement(
                "article"
            );

        bubble.className =
            "message-bubble " +
            (
                role === "user"
                    ? "user-bubble"
                    : "assistant-bubble"
            );

        if (role === "user") {

            bubble.textContent =
                content;

        } else {

            bubble.innerHTML =
                markdown(content);

            enhanceCodeBlocks(
                bubble
            );
        }

        row.appendChild(bubble);
        messages.appendChild(row);
    }

    /* =====================================================
       WELCOME
    ===================================================== */

    function renderWelcome() {

        messages.innerHTML = `
            <div class="welcome-message">

                <div class="welcome-logo">
                    B
                </div>

                <h1>
                    ¿Qué hacemos hoy?
                </h1>

                <p>
                    Soy Byte, el asistente de
                    DreamByte Studios.
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
            .querySelectorAll(
                ".suggestion"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        messageInput.value =
                            button.dataset.prompt;

                        messageInput.focus();

                        messageInput.dispatchEvent(
                            new Event("input")
                        );
                    }
                );
            });
    }

    /* =====================================================
       MARKDOWN
    ===================================================== */

    function markdown(content) {

        if (!window.marked) {

            return escapeHTML(
                content
            ).replace(
                /\n/g,
                "<br>"
            );
        }

        const html =
            marked.parse(
                String(content),
                {
                    breaks: true,
                    gfm: true
                }
            );

        if (window.DOMPurify) {

            return DOMPurify.sanitize(
                html,
                {
                    ADD_ATTR: [
                        "target",
                        "rel"
                    ]
                }
            );
        }

        return html;
    }

    /* =====================================================
       CODE BLOCKS
    ===================================================== */

    function enhanceCodeBlocks(
        container
    ) {

        container
            .querySelectorAll("pre")
            .forEach(pre => {

                if (
                    pre.dataset.ready ===
                    "true"
                ) {
                    return;
                }

                pre.dataset.ready =
                    "true";

                const code =
                    pre.querySelector(
                        "code"
                    );

                if (!code) return;

                const languageClass =
                    [...code.classList]
                        .find(
                            className =>
                                className.startsWith(
                                    "language-"
                                )
                        );

                const language =
                    languageClass
                        ? languageClass
                            .replace(
                                "language-",
                                ""
                            )
                            .toLowerCase()
                        : "code";

                const toolbar =
                    document.createElement(
                        "div"
                    );

                toolbar.className =
                    "code-toolbar";

                const label =
                    document.createElement(
                        "span"
                    );

                label.className =
                    "code-language";

                label.textContent =
                    language.toUpperCase();

                const actions =
                    document.createElement(
                        "div"
                    );

                actions.className =
                    "code-actions";

                /* COPIAR */

                const copy =
                    document.createElement(
                        "button"
                    );

                copy.type = "button";
                copy.className =
                    "code-action";

                copy.title =
                    "Copiar código";

                copy.setAttribute(
                    "aria-label",
                    "Copiar código"
                );

                copy.textContent =
                    "⧉";

                copy.addEventListener(
                    "click",
                    async () => {

                        try {

                            await navigator
                                .clipboard
                                .writeText(
                                    code.textContent
                                );

                            copy.textContent =
                                "✓";

                            setTimeout(
                                () => {
                                    copy.textContent =
                                        "⧉";
                                },
                                1200
                            );

                        } catch (error) {

                            console.error(
                                "No se pudo copiar:",
                                error
                            );
                        }
                    }
                );

                actions.appendChild(
                    copy
                );

                /* HTML PREVIEW */

                if (
                    language === "html" ||
                    language === "htm"
                ) {

                    const run =
                        document.createElement(
                            "button"
                        );

                    run.type = "button";

                    run.className =
                        "code-action";

                    run.title =
                        "Ejecutar HTML";

                    run.setAttribute(
                        "aria-label",
                        "Ejecutar HTML"
                    );

                    run.textContent =
                        "▶";

                    run.addEventListener(
                        "click",
                        () => {

                            openPreview(
                                code.textContent
                            );
                        }
                    );

                    actions.appendChild(
                        run
                    );
                }

                toolbar.appendChild(
                    label
                );

                toolbar.appendChild(
                    actions
                );

                pre.prepend(
                    toolbar
                );
            });
    }

    /* =====================================================
       HTML PREVIEW
    ===================================================== */

    function openPreview(html) {

        if (!previewFrame ||
            !previewModal) {
            return;
        }

        previewFrame.srcdoc =
            html;

        previewModal.classList.remove(
            "hidden"
        );
    }

    if (closePreview) {

        closePreview.addEventListener(
            "click",
            () => {

                previewModal.classList.add(
                    "hidden"
                );

                previewFrame.srcdoc =
                    "";
            }
        );
    }

    if (previewModal) {

        previewModal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    previewModal
                ) {

                    previewModal.classList.add(
                        "hidden"
                    );

                    previewFrame.srcdoc =
                        "";
                }
            }
        );
    }

    /* =====================================================
       ENVIAR MENSAJE
    ===================================================== */

    if (chatForm) {

        chatForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                if (sending) return;

                const text =
                    messageInput.value.trim();

                if (!text) return;

                let conversation =
                    currentConversation();

                /*
                 * Si por alguna razón todavía
                 * no existe una conversación,
                 * creamos una.
                 */

                if (!conversation) {

                    conversation =
                        await createConversation();

                    if (!conversation) {
                        return;
                    }
                }

                sending = true;

                sendButton.disabled =
                    true;

                messageInput.disabled =
                    true;

                /*
                 * PRIMER MENSAJE:
                 * genera el título.
                 */

                if (
                    !conversation.messages ||
                    conversation.messages.length === 0
                ) {

                    const title =
                        text.length > 45
                            ? text.slice(0, 45) +
                              "…"
                            : text;

                    await updateConversationTitle(
                        conversation,
                        title
                    );
                }

                if (!conversation.messages) {
                    conversation.messages =
                        [];
                }

                /*
                 * Añadir inmediatamente
                 * el mensaje visualmente.
                 */

                const userMessage = {
                    role: "user",
                    content: text,
                    created_at:
                        new Date()
                            .toISOString()
                };

                conversation.messages.push(
                    userMessage
                );

                messageInput.value = "";
                messageInput.style.height =
                    "auto";

                renderConversationList();
                renderConversation();

                let typing = null;

                try {

                    /*
                     * Guardar mensaje en Supabase
                     */

                    await saveMessage(
                        conversation.id,
                        "user",
                        text
                    );

                    /*
                     * Historial para Byte
                     */

                    const history =
                        conversation.messages
                            .map(message => ({
                                role:
                                    message.role,
                                content:
                                    message.content
                            }));

                    typing =
                        showTyping();

                    /*
                     * Llamar a la Edge Function.
                     *
                     * Supabase añade automáticamente
                     * la sesión/JWT del usuario.
                     */

                    const {
                        data,
                        error
                    } =
                        await supabaseClient
                            .functions
                            .invoke(
                                "chat",
                                {
                                    body: {
                                        messages:
                                            history
                                    }
                                }
                            );

                    if (error) {
                        throw error;
                    }

                    const answer =
                        data?.choices?.[0]
                            ?.message?.content ||
                        data?.content ||
                        data?.message?.content;

                    if (!answer) {
                        throw new Error(
                            "La respuesta de Byte estaba vacía."
                        );
                    }

                    /*
                     * Añadir respuesta
                     */

                    conversation.messages.push({
                        role: "assistant",
                        content: answer,
                        created_at:
                            new Date()
                                .toISOString()
                    });

                    /*
                     * Guardar respuesta
                     */

                    await saveMessage(
                        conversation.id,
                        "assistant",
                        answer
                    );

                    await touchConversation(
                        conversation.id
                    );

                    /*
                     * Reordenamos la conversación
                     * al principio.
                     */

                    conversations =
                        [
                            conversation,
                            ...conversations.filter(
                                c =>
                                    c.id !==
                                    conversation.id
                            )
                        ];

                    if (typing) {
                        typing.remove();
                    }

                    renderConversationList();
                    renderConversation();

                } catch (error) {

                    console.error(
                        "Error en Byte:",
                        error
                    );

                    if (typing) {
                        typing.remove();
                    }

                    const errorText =
                        "No pude conectarme con Byte en este momento.\n\n" +
                        "**Error:** `" +
                        (
                            error?.message ||
                            "Error desconocido"
                        ) +
                        "`";

                    conversation.messages.push({
                        role: "assistant",
                        content: errorText,
                        created_at:
                            new Date()
                                .toISOString()
                    });

                    try {
                        await saveMessage(
                            conversation.id,
                            "assistant",
                            errorText
                        );
                    } catch (saveError) {
                        console.error(
                            "No se pudo guardar el error:",
                            saveError
                        );
                    }

                    renderConversation();

                } finally {

                    sending = false;

                    sendButton.disabled =
                        false;

                    messageInput.disabled =
                        false;

                    messageInput.focus();
                }
            }
        );
    }

    /* =====================================================
       TYPING
    ===================================================== */

    function showTyping() {

        const row =
            document.createElement(
                "div"
            );

        row.className =
            "message-row assistant-row";

        row.innerHTML = `
            <article
                class="message-bubble assistant-bubble typing-bubble"
            >
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

    if (messageInput) {

        messageInput.addEventListener(
            "input",
            () => {

                messageInput.style.height =
                    "auto";

                messageInput.style.height =
                    Math.min(
                        messageInput
                            .scrollHeight,
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

                    chatForm?.requestSubmit();
                }
            }
        );
    }

    /* =====================================================
       SETTINGS
    ===================================================== */

    if (settingsButton) {

        settingsButton.addEventListener(
            "click",
            () => {

                settingsPanel?.classList.remove(
                    "hidden"
                );
            }
        );
    }

    if (closeSettings) {

        closeSettings.addEventListener(
            "click",
            () => {

                settingsPanel?.classList.add(
                    "hidden"
                );
            }
        );
    }

    /* =====================================================
       INCÓGNITO LOCAL
    ===================================================== */

    function loadIncognitoConversations() {

        try {

            const raw =
                localStorage.getItem(
                    LOCAL_GUEST_KEY
                );

            conversations =
                raw
                    ? JSON.parse(raw)
                    : [];

            if (!Array.isArray(
                conversations
            )) {
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

    function saveIncognitoConversations() {

        localStorage.setItem(
            LOCAL_GUEST_KEY,
            JSON.stringify(
                conversations
            )
        );
    }

    if (clearIncognito) {

        clearIncognito.addEventListener(
            "click",
            () => {

                if (
                    !confirm(
                        "¿Borrar todas las conversaciones locales?"
                    )
                ) {
                    return;
                }

                localStorage.removeItem(
                    LOCAL_GUEST_KEY
                );

                conversations = [];
                currentConversationId =
                    null;

                createConversation();
            }
        );
    }

    /* =====================================================
       CUENTA
    ===================================================== */

    function updateAccount() {

        if (!accountInfo) return;

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
            currentUser?.user_metadata
                ?.full_name ||
            currentUser?.user_metadata
                ?.name ||
            currentUser?.email ||
            "Usuario";

        accountInfo.innerHTML = `
            <strong>${escapeHTML(
                name
            )}</strong>

            <small>${escapeHTML(
                currentUser?.email ||
                ""
            )}</small>
        `;
    }

    /* =====================================================
       LOGOUT
    ===================================================== */

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async () => {

                try {
                    await supabaseClient
                        .auth
                        .signOut();
                } catch (error) {
                    console.error(error);
                }

                currentUser = null;
                conversations = [];
                currentConversationId =
                    null;

                isIncognito = false;

                appScreen?.classList.add(
                    "hidden"
                );

                loginScreen?.classList.remove(
                    "hidden"
                );

                authStatus("");
            }
        );
    }

    /* =====================================================
       SCROLL
    ===================================================== */

    function scrollBottom() {

        requestAnimationFrame(() => {

            if (messages) {
                messages.scrollTop =
                    messages.scrollHeight;
            }
        });
    }

    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    function escapeHTML(value) {

        return String(value)
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );
    }

    /* =====================================================
       AUTH ERRORS
    ===================================================== */

    function translateAuthError(error) {

        const message =
            String(
                error?.message || ""
            ).toLowerCase();

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
       INICIO
    ===================================================== */

    restoreSession();
});
// Añade al FINAL de app.js:
const imageScript = document.createElement("script");
imageScript.src = "image.js";
document.body.appendChild(imageScript);
