/* =========================================================
   BYTE AI
   DreamByte Studios
========================================================= */

const {
    createClient
} = window.supabase;


/* =========================================================
   SUPABASE
========================================================= */

const supabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* =========================================================
   STATE
========================================================= */

let currentUser = null;
let isIncognito = false;

let currentConversationId = null;

let conversationHistory = [];

const LOCAL_STORAGE_KEY = "byte_ai_incognito_conversations";
const THEME_STORAGE_KEY = "byte_ai_theme";


/* =========================================================
   ELEMENTS
========================================================= */

const loginScreen =
    document.getElementById("login-screen");

const appScreen =
    document.getElementById("app-screen");

const authMessage =
    document.getElementById("auth-message");

const messages =
    document.getElementById("messages");

const chatForm =
    document.getElementById("chat-form");

const messageInput =
    document.getElementById("message-input");

const sendButton =
    document.getElementById("send-button");

const conversationList =
    document.getElementById("conversation-list");

const settingsPanel =
    document.getElementById("settings-panel");

const previewModal =
    document.getElementById("preview-modal");

const htmlPreview =
    document.getElementById("html-preview");


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    loadTheme();

    setupEvents();

    const {
        data: {
            session
        }
    } = await supabaseClient.auth.getSession();

    if (session) {

        currentUser =
            session.user;

        isIncognito = false;

        enterApplication();

    }

});


/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {

    document
        .getElementById("google-login")
        .addEventListener(
            "click",
            loginWithGoogle
        );

    document
        .getElementById("guest-login")
        .addEventListener(
            "click",
            enterIncognito
        );

    document
        .getElementById("email-login-form")
        .addEventListener(
            "submit",
            loginWithEmail
        );

    document
        .getElementById("signup-button")
        .addEventListener(
            "click",
            signup
        );

    document
        .getElementById("logout-button")
        .addEventListener(
            "click",
            logout
        );

    document
        .getElementById("new-chat")
        .addEventListener(
            "click",
            newConversation
        );

    document
        .getElementById("settings-button")
        .addEventListener(
            "click",
            () => {
                settingsPanel.classList.toggle("hidden");
            }
        );

    document
        .getElementById("close-settings")
        .addEventListener(
            "click",
            () => {
                settingsPanel.classList.add("hidden");
            }
        );

    document
        .getElementById("theme-selector")
        .addEventListener(
            "change",
            changeTheme
        );

    document
        .getElementById("clear-incognito")
        .addEventListener(
            "click",
            clearIncognito
        );

    document
        .getElementById("mobile-menu")
        .addEventListener(
            "click",
            () => {
                document
                    .getElementById("sidebar")
                    .classList.toggle("open");
            }
        );

    document
        .getElementById("close-preview")
        .addEventListener(
            "click",
            closePreview
        );

    chatForm.addEventListener(
        "submit",
        sendMessage
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

    messages.addEventListener(
        "click",
        handleMessageActions
    );

}


/* =========================================================
   AUTH
========================================================= */

async function loginWithGoogle() {

    const {
        error
    } = await supabaseClient.auth.signInWithOAuth({

        provider: "google",

        options: {

            redirectTo:
                window.location.origin +
                window.location.pathname

        }

    });

    if (error) {

        showAuthError(error.message);

    }

}


async function loginWithEmail(event) {

    event.preventDefault();

    const email =
        document
            .getElementById("email")
            .value
            .trim();

    const password =
        document
            .getElementById("password")
            .value;

    setAuthMessage("Iniciando sesión...");

    const {
        data,
        error
    } =
        await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

    if (error) {

        showAuthError(error.message);

        return;

    }

    currentUser =
        data.user;

    isIncognito = false;

    enterApplication();

}


async function signup() {

    const email =
        document
            .getElementById("email")
            .value
            .trim();

    const password =
        document
            .getElementById("password")
            .value;

    if (!email || !password) {

        showAuthError(
            "Escribe un correo y una contraseña."
        );

        return;

    }

    setAuthMessage(
        "Creando cuenta..."
    );

    const {
        error
    } =
        await supabaseClient.auth.signUp({
            email,
            password
        });

    if (error) {

        showAuthError(error.message);

        return;

    }

    setAuthMessage(
        "Cuenta creada. Revisa tu correo para confirmarla."
    );

}


async function logout() {

    if (isIncognito) {

        currentUser = null;
        isIncognito = false;

        showLogin();

        return;

    }

    await supabaseClient.auth.signOut();

    currentUser = null;

    isIncognito = false;

    showLogin();

}


/* =========================================================
   INCOGNITO
========================================================= */

function enterIncognito() {

    currentUser = null;

    isIncognito = true;

    conversationHistory = [];

    currentConversationId =
        crypto.randomUUID();

    enterApplication();

    loadIncognitoConversations();

}


function getIncognitoConversations() {

    try {

        return JSON.parse(
            localStorage.getItem(
                LOCAL_STORAGE_KEY
            ) || "[]"
        );

    } catch {

        return [];

    }

}


function saveIncognitoConversation() {

    const conversations =
        getIncognitoConversations();

    const existingIndex =
        conversations.findIndex(
            conversation =>
                conversation.id ===
                currentConversationId
        );

    const conversation = {

        id:
            currentConversationId,

        title:
            getConversationTitle(),

        messages:
            conversationHistory,

        updatedAt:
            Date.now()

    };

    if (existingIndex >= 0) {

        conversations[existingIndex] =
            conversation;

    } else {

        conversations.unshift(
            conversation
        );

    }

    localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify(
            conversations.slice(0, 50)
        )
    );

    loadIncognitoConversations();

}


function loadIncognitoConversations() {

    if (!isIncognito)
        return;

    conversationList.innerHTML = "";

    const conversations =
        getIncognitoConversations();

    conversations.forEach(
        conversation => {

            const item =
                document.createElement("div");

            item.className =
                "conversation-item";

            item.textContent =
                conversation.title ||
                "Nueva conversación";

            item.addEventListener(
                "click",
                () => {

                    currentConversationId =
                        conversation.id;

                    conversationHistory =
                        conversation.messages || [];

                    renderHistory();

                }
            );

            conversationList.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   APPLICATION
========================================================= */

function enterApplication() {

    loginScreen.classList.add(
        "hidden"
    );

    appScreen.classList.remove(
        "hidden"
    );

    if (isIncognito) {

        document
            .getElementById("account-info")
            .innerHTML =
            "👻 <strong>Modo incógnito</strong>";

        document
            .getElementById("logout-button")
            .textContent =
            "↩ Salir del incógnito";

    } else {

        document
            .getElementById("account-info")
            .innerHTML =
            `👤 ${
                escapeHTML(
                    currentUser?.email ||
                    "Usuario"
                )
            }`;

        document
            .getElementById("logout-button")
            .textContent =
            "↪ Cerrar sesión";

    }

    if (!conversationHistory.length) {

        newConversation();

    }

}


function showLogin() {

    appScreen.classList.add(
        "hidden"
    );

    loginScreen.classList.remove(
        "hidden"
    );

    conversationHistory = [];

}


/* =========================================================
   CONVERSATIONS
========================================================= */

function newConversation() {

    currentConversationId =
        crypto.randomUUID();

    conversationHistory = [];

    document
        .getElementById("chat-title")
        .textContent =
        "Nueva conversación";

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

            </div>

        </div>
    `;

    messages
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


/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage(event) {

    event.preventDefault();

    const text =
        messageInput.value.trim();

    if (!text)
        return;

    messageInput.value = "";

    removeWelcome();

    addMessage(
        "user",
        text
    );

    conversationHistory.push({

        role: "user",

        content: text

    });

    setLoading(true);

    const loadingId =
        addLoadingMessage();

    try {

        let response;

        if (isIncognito) {

            /*
             * El modo incógnito no tiene JWT.
             *
             * Por eso aquí hacemos una petición directa
             * solamente si tu backend permite acceso anónimo.
             *
             * Si tu Edge Function mantiene verify_jwt=true,
             * deberás crear posteriormente un endpoint separado
             * para invitados con rate limiting.
             */

            response =
                await fetch(
                    `${SUPABASE_URL}/functions/v1/chat`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            messages:
                                conversationHistory
                        })
                    }
                );

        } else {

            const {
                data: {
                    session
                }
            } =
                await supabaseClient.auth.getSession();

            if (!session) {

                throw new Error(
                    "La sesión ha expirado."
                );

            }

            response =
                await fetch(
                    `${SUPABASE_URL}/functions/v1/chat`,
                    {
                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${session.access_token}`

                        },

                        body: JSON.stringify({
                            messages:
                                conversationHistory
                        })
                    }
                );

        }


        if (!response.ok) {

            const errorText =
                await response.text();

            throw new Error(
                errorText ||
                `Error HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        const answer =
            data?.choices?.[0]?.message?.content;


        if (!answer) {

            throw new Error(
                "Byte no devolvió una respuesta."
            );

        }


        removeLoadingMessage(
            loadingId
        );

        addMessage(
            "assistant",
            answer
        );

        conversationHistory.push({

            role: "assistant",

            content: answer

        });


        if (isIncognito) {

            saveIncognitoConversation();

        }


        updateConversationTitle();

    } catch (error) {

        removeLoadingMessage(
            loadingId
        );

        addMessage(
            "assistant",
            `⚠️ No pude completar la respuesta.\n\n${error.message}`
        );

    } finally {

        setLoading(false);

    }

}


/* =========================================================
   MESSAGES
========================================================= */

function addMessage(role, content) {

    const wrapper =
        document.createElement("article");

    wrapper.className =
        `message ${role}`;

    const avatar =
        role === "assistant"
            ? "B"
            : "👤";

    wrapper.innerHTML = `

        <div class="message-avatar">
            ${avatar}
        </div>

        <div class="message-content">
            ${
                role === "assistant"
                    ? renderMarkdown(content)
                    : escapeHTML(content).replace(
                        /\n/g,
                        "<br>"
                    )
            }
        </div>

    `;

    messages.appendChild(wrapper);

    messages.scrollTop =
        messages.scrollHeight;

    return wrapper;

}


function renderHistory() {

    messages.innerHTML = "";

    conversationHistory.forEach(
        message => {

            addMessage(
                message.role,
                message.content
            );

        }
    );

}


function removeWelcome() {

    const welcome =
        messages.querySelector(
            ".welcome-message"
        );

    if (welcome)
        welcome.remove();

}


function addLoadingMessage() {

    const id =
        "loading-" +
        Date.now();

    const element =
        document.createElement("article");

    element.id = id;

    element.className =
        "message assistant loading-message";

    element.innerHTML = `

        <div class="message-avatar">
            B
        </div>

        <div class="message-content">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
        </div>

    `;

    messages.appendChild(
        element
    );

    messages.scrollTop =
        messages.scrollHeight;

    return id;

}


function removeLoadingMessage(id) {

    document
        .getElementById(id)
        ?.remove();

}


/* =========================================================
   MARKDOWN + CODE
========================================================= */

function renderMarkdown(content) {

    const raw =
        marked.parse(content, {
            breaks: true
        });


    const clean =
        DOMPurify.sanitize(
            raw,
            {
                ADD_TAGS: [
                    "button"
                ],

                ADD_ATTR: [
                    "class",
                    "data-code",
                    "data-language"
                ]
            }
        );


    const container =
        document.createElement("div");

    container.innerHTML =
        clean;


    container
        .querySelectorAll("pre")
        .forEach(pre => {

            const code =
                pre.querySelector("code");

            if (!code)
                return;

            const language =
                getLanguage(
                    code.className
                );

            const codeText =
                code.textContent;


            const toolbar =
                document.createElement("div");

            toolbar.className =
                "code-toolbar";


            const label =
                document.createElement("span");

            label.textContent =
                language || "code";


            const actions =
                document.createElement("div");


            const copyButton =
                document.createElement("button");

            copyButton.className =
                "code-action";

            copyButton.dataset.code =
                codeText;

            copyButton.textContent =
                "📋 Copiar";


            actions.appendChild(
                copyButton
            );


            if (
                language === "html" ||
                language === "html5"
            ) {

                const runButton =
                    document.createElement("button");

                runButton.className =
                    "code-action run-html";

                runButton.dataset.code =
                    codeText;

                runButton.textContent =
                    "▶ Ejecutar";

                actions.appendChild(
                    runButton
                );

            }


            toolbar.appendChild(
                label
            );

            toolbar.appendChild(
                actions
            );


            pre.parentNode.insertBefore(
                toolbar,
                pre
            );

        });


    return container.innerHTML;

}


function getLanguage(className = "") {

    const match =
        className.match(
            /language-([\w-]+)/
        );

    return match
        ? match[1].toLowerCase()
        : "";

}


/* =========================================================
   CODE ACTIONS
========================================================= */

async function handleMessageActions(event) {

    const copyButton =
        event.target.closest(
            ".code-action:not(.run-html)"
        );

    if (copyButton) {

        try {

            await navigator.clipboard.writeText(
                copyButton.dataset.code
            );

            copyButton.textContent =
                "✓ Copiado";

            setTimeout(() => {

                copyButton.textContent =
                    "📋 Copiar";

            }, 1500);

        } catch {

            copyButton.textContent =
                "No disponible";

        }

        return;

    }


    const runButton =
        event.target.closest(
            ".run-html"
        );

    if (runButton) {

        openHTMLPreview(
            runButton.dataset.code
        );

    }

}


/* =========================================================
   HTML PREVIEW
========================================================= */

function openHTMLPreview(code) {

    /*
     * sandbox="allow-scripts" permite que el HTML tenga
     * JavaScript propio, pero evita darle acceso al documento
     * principal de Byte AI.
     */

    htmlPreview.srcdoc = code;

    previewModal.classList.remove(
        "hidden"
    );

}


function closePreview() {

    htmlPreview.srcdoc = "";

    previewModal.classList.add(
        "hidden"
    );

}


/* =========================================================
   THEME
========================================================= */

function changeTheme(event) {

    const theme =
        event.target.value;

    document.body.className =
        theme;

    localStorage.setItem(
        THEME_STORAGE_KEY,
        theme
    );

}


function loadTheme() {

    const saved =
        localStorage.getItem(
            THEME_STORAGE_KEY
        );

    if (!saved)
        return;

    document.body.className =
        saved;

    const selector =
        document.getElementById(
            "theme-selector"
        );

    if (selector)
        selector.value = saved;

}


/* =========================================================
   INCÓGNITO CLEANUP
========================================================= */

function clearIncognito() {

    if (!isIncognito)
        return;

    localStorage.removeItem(
        LOCAL_STORAGE_KEY
    );

    conversationHistory = [];

    conversationList.innerHTML = "";

    newConversation();

}


/* =========================================================
   TITLES
========================================================= */

function getConversationTitle() {

    const firstUserMessage =
        conversationHistory.find(
            message =>
                message.role === "user"
        );

    if (!firstUserMessage)
        return "Nueva conversación";

    return firstUserMessage.content
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 50);

}


function updateConversationTitle() {

    document
        .getElementById("chat-title")
        .textContent =
        getConversationTitle();

}


/* =========================================================
   HELPERS
========================================================= */

function setLoading(value) {

    sendButton.disabled =
        value;

    messageInput.disabled =
        value;

}


function setAuthMessage(message) {

    authMessage.textContent =
        message;

}


function showAuthError(message) {

    authMessage.textContent =
        `⚠️ ${message}`;

}


function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value;

    return div.innerHTML;

}


/* =========================================================
   AUTH STATE
========================================================= */

supabaseClient.auth.onAuthStateChange(
    async (event, session) => {

        if (
            event === "SIGNED_IN" &&
            session
        ) {

            currentUser =
                session.user;

            isIncognito = false;

            enterApplication();

        }

        if (
            event === "SIGNED_OUT"
        ) {

            currentUser = null;

            if (!isIncognito)
                showLogin();

        }

    }
);
