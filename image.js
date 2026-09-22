// image.js — generación de imágenes (Pollinations vía Edge Function)
(() => {
  function getCreds() {
    const url = window.SUPABASE_URL || (typeof SUPABASE_URL !== "undefined" ? SUPABASE_URL : null);
    const key = window.SUPABASE_ANON_KEY || (typeof SUPABASE_ANON_KEY !== "undefined" ? SUPABASE_ANON_KEY : null);
    return { url, key };
  }

  function init() {
    const { url: supabaseUrl, key: supabaseAnonKey } = getCreds();
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Byte AI: faltan SUPABASE_URL / SUPABASE_ANON_KEY");
      return;
    }
    if (!window.supabase) {
      console.error("Byte AI: supabase-js no cargado");
      return;
    }

    const sb = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    const composer = document.querySelector(".composer-container");
    const chatForm = document.querySelector("#chat-form");
    if (!composer || !chatForm) {
      console.warn("Byte AI: no se encontró el compositor");
      return;
    }

    if (document.getElementById("byte-image-panel")) return;

    const modeBar = document.createElement("div");
    modeBar.className = "image-mode-bar";
    modeBar.innerHTML = `
      <button type="button" class="image-mode-btn active" data-mode="chat">💬 Chat</button>
      <button type="button" class="image-mode-btn" data-mode="image">🎨 Imagen</button>
    `;

    const panel = document.createElement("div");
    panel.id = "byte-image-panel";
    panel.innerHTML = `
      <textarea id="byte-image-prompt" placeholder="Describe la imagen que quieres crear..."></textarea>
      <div class="byte-image-options">
        <select id="byte-image-size">
          <option value="1024x1024">1024 × 1024</option>
          <option value="1024x768">1024 × 768</option>
          <option value="768x1024">768 × 1024</option>
          <option value="512x512">512 × 512</option>
        </select>
        <button id="byte-generate-image" type="button">✨ Generar</button>
      </div>
      <div id="byte-image-status"></div>
      <div id="byte-image-result">
        <img id="byte-generated-image" alt="Imagen generada por Byte AI" />
        <a id="byte-download-image" download="byte-ai-image.png">⬇️ Guardar imagen</a>
      </div>
    `;

    composer.prepend(modeBar, panel);

    let imageMode = false;
    const chatBtn = modeBar.querySelector('[data-mode="chat"]');
    const imageBtn = modeBar.querySelector('[data-mode="image"]');
    const composerInfo = composer.querySelector(".composer-info");

    function setMode(mode) {
      imageMode = mode === "image";
      chatBtn.classList.toggle("active", !imageMode);
      imageBtn.classList.toggle("active", imageMode);
      panel.style.display = imageMode ? "block" : "none";
      chatForm.style.display = imageMode ? "none" : "";
      if (composerInfo) composerInfo.style.display = imageMode ? "none" : "";
      if (imageMode) document.getElementById("byte-image-prompt")?.focus();
    }

    chatBtn.addEventListener("click", () => setMode("chat"));
    imageBtn.addEventListener("click", () => setMode("image"));

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
        const { data: sessData } = await sb.auth.getSession();
        if (!sessData?.session) {
          throw new Error("Debes iniciar sesión para generar imágenes.");
        }

        const { data, error } = await sb.functions.invoke("generate-image", {
          body: { prompt, width, height },
        });

        if (data?.error) {
          throw new Error(
            typeof data.error === "string"
              ? data.error + (data.details ? ": " + String(data.details).slice(0, 200) : "")
              : JSON.stringify(data.error)
          );
        }
        if (error) {
          throw new Error(error.message || "Error al llamar generate-image");
        }
        if (!data?.image) {
          throw new Error("El servidor no devolvió una imagen. ¿Configuraste POLLINATIONS_API_KEY?");
        }

        image.src = data.image;
        download.href = data.image;
        result.style.display = "block";
        status.textContent = "✨ Imagen generada correctamente.";
      } catch (err) {
        console.error(err);
        status.textContent = "❌ " + (err.message || "No se pudo generar la imagen.");
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
