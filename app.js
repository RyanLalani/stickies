// Single-note Stickies — minimalist, modern, customizable.
(() => {
  const STATE_KEY = "stickies.single.v1";

  const COLORS = [
    { name: "butter",    bg: "#fff4a3", light: false },
    { name: "peach",     bg: "#ffd3a5", light: false },
    { name: "rose",      bg: "#ffc1c1", light: false },
    { name: "lilac",     bg: "#dcc5ff", light: false },
    { name: "sky",       bg: "#bfe2ff", light: false },
    { name: "mint",      bg: "#c1f0d4", light: false },
    { name: "sand",      bg: "#f1e7d0", light: false },
    { name: "paper",     bg: "#ffffff", light: false },
    { name: "coral",     bg: "#ff7a70", light: true  },
    { name: "tangerine", bg: "#ff9f43", light: false },
    { name: "amber",     bg: "#f5c518", light: false },
    { name: "emerald",   bg: "#2ecc71", light: true  },
    { name: "ocean",     bg: "#3498db", light: true  },
    { name: "violet",    bg: "#8b5cf6", light: true  },
    { name: "graphite",  bg: "#2d2d2d", light: true  },
    { name: "ink",       bg: "#0a0a0a", light: true  },
  ];

  const FONTS = [
    { name: "Sans",  stack: '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif' },
    { name: "Serif", stack: '"Lora", Georgia, "Times New Roman", serif' },
    { name: "Hand",  stack: '"Caveat", "Marker Felt", cursive' },
    { name: "Mono",  stack: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace' },
  ];

  const defaults = {
    text: "",
    color: "butter",
    font: "Sans",
    fontSize: 15,
    bold: false,
    italic: false,
    theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  };

  let state = loadState();
  let saveTimer = null;
  let panelOpen = false;

  const sheet     = document.getElementById("sheet");
  const body      = document.getElementById("noteBody");
  const cornerBtn = document.getElementById("cornerBtn");
  const panel     = document.getElementById("panel");
  const colorGrid = document.getElementById("colorGrid");
  const fontGrid  = document.getElementById("fontGrid");
  const sizeInput = document.getElementById("fontSize");
  const sizeValue = document.getElementById("fontSizeValue");
  const boldBtn   = document.getElementById("boldBtn");
  const italicBtn = document.getElementById("italicBtn");
  const themeBtn  = document.getElementById("themeBtn");

  // Seed welcome text on first launch
  if (state.__new) {
    state.text = "Hi.\n\nJust one sticky note.\nHover the top-right corner for customization.\n\n⌘B bold · ⌘I italic · ⌘, open panel";
    delete state.__new;
  }

  initUI();
  apply();
  body.textContent = state.text;

  // ====== STATE ======
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STATE_KEY));
      if (s) return Object.assign({}, defaults, s);
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
    const color = COLORS.find(c => c.name === state.color) || COLORS[0];
    const font  = FONTS.find(f => f.name === state.font)   || FONTS[0];

    sheet.style.setProperty("--note-bg", color.bg);
    sheet.dataset.textLight = String(color.light);

    body.style.fontFamily = font.stack;
    body.style.fontSize   = state.fontSize + "px";
    body.style.fontWeight = state.bold ? "600" : "400";
    body.style.fontStyle  = state.italic ? "italic" : "normal";

    document.documentElement.setAttribute("data-theme", state.theme);

    // Active states in panel
    colorGrid.querySelectorAll(".color-swatch").forEach(el => {
      el.classList.toggle("active", el.dataset.color === state.color);
    });
    fontGrid.querySelectorAll(".font-option").forEach(el => {
      el.classList.toggle("active", el.dataset.font === state.font);
    });
    sizeInput.value = state.fontSize;
    sizeValue.textContent = state.fontSize;
    boldBtn.classList.toggle("active", state.bold);
    italicBtn.classList.toggle("active", state.italic);
  }

  // ====== BUILD UI ======
  function initUI() {
    // Colors
    COLORS.forEach(c => {
      const b = document.createElement("button");
      b.className = "color-swatch";
      b.style.background = c.bg;
      b.dataset.color = c.name;
      b.title = c.name;
      b.addEventListener("click", () => { state.color = c.name; apply(); save(); });
      colorGrid.appendChild(b);
    });

    // Fonts
    FONTS.forEach(f => {
      const b = document.createElement("button");
      b.className = "font-option";
      b.textContent = f.name;
      b.style.fontFamily = f.stack;
      b.dataset.font = f.name;
      b.addEventListener("click", () => { state.font = f.name; apply(); save(); });
      fontGrid.appendChild(b);
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

    // Focus body on background click
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
