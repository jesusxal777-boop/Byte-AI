// image.js
(() => {
  const supabaseUrl = window.SUPABASE_URL;
  const supabaseAnonKey = window.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Byte AI: faltan las credenciales de Supabase.");
    return;
  }

  const supabase = window.supabase.createClient(
    supabaseUrl,
    supabaseAnonKey
  );

  const style = document.createElement("style");
  style.textContent = `
    .image-mode-bar {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .image-mode-btn {
      border: 1px solid rgba(90, 170, 255, .25);
      background: rgba(20, 40, 70, .55);
      color: inherit;
      border-radius: 12px;
      padding: 9px 14px;
      cursor: pointer;
      transition: .2s;
    }

    .image-mode-btn.active {
      background: rgba(45, 140, 255, .22);
      border-color: rgba(90, 180, 255, .55);
    }

    #byte-image-panel {
      display: none;
      padding: 14px;
      border-radius: 18px;
      background: rgba(10, 25, 50, .55);
      border: 1px solid rgba(100, 180, 255, .2);
      margin-bottom: 12px;
    }

    #byte-image-prompt {
      width: 100%;
      min-height: 100px;
      resize: vertical;
      box-sizing: border-box;
      border-radius: 14px;
      border: 1px solid rgba(100, 180, 255, .2);
      background: rgba(0, 10, 25, .45);
      color: inherit;
      padding: 12px;
      font: inherit;
      outline: none;
    }

    .byte-image-options {
      display: flex;
      gap: 8px;
      margin-top: 10px;
      flex-wrap: wrap;
    }

    .byte-image-options select,
    #byte-generate-image {
      border-radius: 12px;
      padding: 10px 12px;
      border: 1px solid rgba(100, 180, 255, .25);
      background: rgba(20, 45, 80, .65);
      color: inherit;
    }

    #byte-generate-image {
      cursor: pointer;
      font-weight: 600;
    }

    #byte-image-status {
      margin-top: 10px;
      opacity: .75;
      font-size: .9rem;
    }

    #byte-image-result {
      display: none;
      margin-top: 14px;
      text-align: center;
    }

    #byte-image-result img {
      max-width: 100%;
      border-radius: 18px;
      display: block;
      margin: auto;
    }

    #byte-download-image {
      display: inline-block;
      margin-top: 10px;
      text-decoration: none;
      color: inherit;
    }
  `;

  document.head.appendChild(style);

  function init() {
    const composer = document.querySelector(".composer-container");
    const chatForm = document.querySelector("#chat-form");

    if (!composer || !chatForm) {
      console.warn("Byte AI: no se encontró el compositor.");
      return;
    }

    const modeBar = document.createElement("div");
    modeBar.className = "image-mode-bar";

    const chatButton = document.createElement("button");
    chatButton.className = "image-mode-btn active";
    chatButton.type = "button";
    chatButton.textContent = "💬 Chat";

    const imageButton = document.createElement("button");
    imageButton.className = "image-mode-btn";
    imageButton.type = "button";
    imageButton.textContent = "🎨 Imagen";

    modeBar.append(chatButton, imageButton);

    const panel = document.createElement("div");
    panel.id = "byte-image-panel";

    panel.innerHTML = `
      <textarea
        id="byte-image-prompt"
        placeholder="Describe la imagen que quieres crear..."
      ></textarea>

      <div class="byte-image-options">
        <select id="byte-image-size">
          <option value="1024x1024">1024 × 1024</option>
          <option value="1024x768">1024 × 768</option>
          <option value="768x1024">768 × 1024</option>
        </select>

        <button id="byte-generate-image" type="button">
          ✨ Generar
        </button>
      </div>

      <div id="byte-image-status"></div>

      <div id="byte-image-result">
        <img id="byte-generated-image" alt="Imagen generada por Byte AI">
        <a id="byte-download-image" download="byte-ai-image.png">
          ⬇️ Guardar imagen
        </a>
      </div>
    `;

    composer.prepend(modeBar, panel);

    let imageMode = false;

    function setMode(mode) {
      imageMode = mode === "image";

      chatButton.classList.toggle("active", !imageMode);
      imageButton.classList.toggle("active", imageMode);

      panel.style.display = imageMode ? "block" : "none";
      chatForm.style.display = imageMode ? "none" : "";

      if (imageMode) {
        document.querySelector("#byte-image-prompt")?.focus();
      }
    }

    chatButton.addEventListener("click", () => setMode("chat"));
    imageButton.addEventListener("click", () => setMode("image"));

    const generateButton = panel.querySelector("#byte-generate-image");
    const promptInput = panel.querySelector("#byte-image-prompt");
    const sizeSelect = panel.querySelector("#byte-image-size");
    const status = panel.querySelector("#byte-image-status");
    const result = panel.querySelector("#byte-image-result");
    const image = panel.querySelector("#byte-generated-image");
    const download = panel.querySelector("#byte-download-image");

    generateButton.addEventListener("click", async () => {
      const prompt = promptInput.value.trim();

      if (!prompt) {
        status.textContent = "Escribe una descripción primero.";
        return;
      }

      const [width, height] = sizeSelect.value.split("x").map(Number);

      generateButton.disabled = true;
      generateButton.textContent = "⏳ Generando...";
      status.textContent = "Byte está creando tu imagen...";
      result.style.display = "none";

      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Debes iniciar sesión para generar imágenes.");
        }

        const { data, error } = await supabase.functions.invoke(
          "generate-image",
          {
            body: {
              prompt,
              width,
              height
            }
          }
        );

        if (error) throw error;

        if (!data?.image) {
          throw new Error("El servidor no devolvió una imagen.");
        }

        image.src = data.image;
        download.href = data.image;

        result.style.display = "block";
        status.textContent = "✨ Imagen generada correctamente.";
      } catch (error) {
        console.error(error);
        status.textContent =
          "❌ " + (error.message || "No se pudo generar la imagen.");
      } finally {
        generateButton.disabled = false;
        generateButton.textContent = "✨ Generar";
      }
    });

    promptInput.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        generateButton.click();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
