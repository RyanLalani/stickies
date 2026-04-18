// Single-note Stickies — minimalist, modern, customizable.
(() => {
  const STATE_KEY = "stickies.single.v1";

  // Returns true if the bg is dark enough to need light text
  function needsLightText(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum < 0.45;
  }

  const FONTS = [
    { name: "Sans",  stack: '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' },
    { name: "Serif", stack: '"Lora", Georgia, "Times New Roman", serif' },
    { name: "Hand",  stack: '"Caveat", "Marker Felt", cursive' },
    { name: "Mono",  stack: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace' },
  ];

  const defaults = {
    text: "",
    customColor: "#fff4a3",
    font: "Sans",
    fontSize: 15,
    bold: false,
    italic: false,
    theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  };

  let state = loadState();
  let saveTimer = null;
  let panelOpen = false;

  const sheet          = document.getElementById("sheet");
  const body           = document.getElementById("noteBody");
  const cornerBtn      = document.getElementById("cornerBtn");
  const panel          = document.getElementById("panel");
  const fontGrid       = document.getElementById("fontGrid");
  const sizeInput      = document.getElementById("fontSize");
  const sizeValue      = document.getElementById("fontSizeValue");
  const boldBtn        = document.getElementById("boldBtn");
  const italicBtn      = document.getElementById("italicBtn");
  const themeBtn       = document.getElementById("themeBtn");
  const themeColorMeta = document.getElementById("themeColorMeta");
  const colorInput     = document.getElementById("customColorInput");
  const colorPreview   = document.getElementById("colorWheelPreview");
  const colorWheelBtn  = document.getElementById("colorWheelBtn");

  // Seed welcome text on first launch
  if (state.__new) {
    state.text = "Hi.\n\nJust one sticky note.\nHover the top-right corner to customize.\n\n⌘B bold · ⌘I italic · ⌘, open panel";
    delete state.__new;
  }

  initUI();
  apply();
  body.textContent = state.text;

  // ====== STATE ======
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STATE_KEY));
      if (s) {
        // Migrate from old preset-based color system
        if (s.color && s.color !== "__custom__") {
          const presetMap = { butter:"#fff4a3", peach:"#ffd3a5", rose:"#ffc1c1", lilac:"#dcc5ff",
            sky:"#bfe2ff", mint:"#c1f0d4", sand:"#f1e7d0", paper:"#ffffff", coral:"#ff7a70",
            tangerine:"#ff9f43", amber:"#f5c518", emerald:"#2ecc71", ocean:"#3498db",
            violet:"#8b5cf6", graphite:"#2d2d2d", ink:"#0a0a0a" };
          s.customColor = presetMap[s.color] || "#fff4a3";
          delete s.color;
        }
        return Object.assign({}, defaults, s);
      }
    } catch {}
    return Object.assign({}, defaults, { __new: true });
  }

  function save() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    }, 150);
  }

  // ====== APPLY STATE ======
  function apply() {
    const bg = state.customColor || "#fff4a3";
    const font = FONTS.find(f => f.name === state.font) || FONTS[0];

    document.documentElement.style.setProperty("--note-bg", bg);
    sheet.dataset.textLight = String(needsLightText(bg));
    if (themeColorMeta) themeColorMeta.setAttribute("content", bg);

    // Color preview swatch always shows current color
    colorPreview.style.background = bg;
    colorInput.value = bg;

    body.style.fontFamily = font.stack;
    body.style.fontSize   = state.fontSize + "px";
    body.style.fontWeight = state.bold ? "600" : "400";
    body.style.fontStyle  = state.italic ? "italic" : "normal";

    document.documentElement.setAttribute("data-theme", state.theme);

    // Sync panel controls
    fontGrid.querySelectorAll(".font-chip").forEach(el => {
      el.classList.toggle("active", el.dataset.font === state.font);
    });
    sizeInput.value = state.fontSize;
    sizeValue.textContent = state.fontSize;
    boldBtn.classList.toggle("active", state.bold);
    italicBtn.classList.toggle("active", state.italic);
  }

  // ====== BUILD UI ======
  function initUI() {
    // Font chips
    FONTS.forEach(f => {
      const b = document.createElement("button");
      b.className = "font-chip";
      b.textContent = f.name;
      b.style.fontFamily = f.stack;
      b.dataset.font = f.name;
      b.addEventListener("click", () => { state.font = f.name; apply(); save(); });
      fontGrid.appendChild(b);
    });

    // Color wheel — open picker on click, update live on drag
    colorWheelBtn.addEventListener("click", () => colorInput.click());
    colorInput.addEventListener("input", () => {
      state.customColor = colorInput.value;
      apply();
      save();
    });

    // Size
    sizeInput.addEventListener("input", () => {
      state.fontSize = Number(sizeInput.value);
      sizeValue.textContent = sizeInput.value;
      apply();
      save();
    });

    // Bold / italic
    boldBtn.addEventListener("click", () => { state.bold = !state.bold; apply(); save(); });
    italicBtn.addEventListener("click", () => { state.italic = !state.italic; apply(); save(); });

    // Theme
    themeBtn.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      apply();
      save();
    });

    // Corner button
    cornerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePanel();
    });

    // Body typing
    body.addEventListener("input", () => {
      state.text = body.innerText;
      save();
    });

    // Click outside panel closes it
    document.addEventListener("mousedown", (e) => {
      if (!panelOpen) return;
      if (panel.contains(e.target) || cornerBtn.contains(e.target)) return;
      togglePanel(false);
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "b") { e.preventDefault(); state.bold = !state.bold; apply(); save(); }
      if (mod && e.key === "i") { e.preventDefault(); state.italic = !state.italic; apply(); save(); }
      if (mod && e.key === ",") { e.preventDefault(); togglePanel(); }
      if (e.key === "Escape" && panelOpen) { togglePanel(false); body.focus(); }
    });

    // Click bare sheet area → focus text
    sheet.addEventListener("mousedown", (e) => {
      if (e.target === sheet) body.focus();
    });
  }

  function togglePanel(force) {
    panelOpen = force ?? !panelOpen;
    panel.classList.toggle("open", panelOpen);
    cornerBtn.classList.toggle("active", panelOpen);
    if (!panelOpen) body.focus();
  }

  // Flush on unload
  window.addEventListener("beforeunload", () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    }
  });
})();
