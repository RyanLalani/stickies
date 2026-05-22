// Single-note Stickies — minimalist, modern, customizable.
(() => {
  const STATE_KEY = "stickies.single.v1";

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
    html: "",
    customColor: "#fff4a3",
    font: "Sans",
    fontSize: 15,
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

  // ====== STATE ======
  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STATE_KEY));
      if (s) {
        // Migrate preset-based color
        if (s.color && s.color !== "__custom__") {
          const map = { butter:"#fff4a3", peach:"#ffd3a5", rose:"#ffc1c1", lilac:"#dcc5ff",
            sky:"#bfe2ff", mint:"#c1f0d4", sand:"#f1e7d0", paper:"#ffffff", coral:"#ff7a70",
            tangerine:"#ff9f43", amber:"#f5c518", emerald:"#2ecc71", ocean:"#3498db",
            violet:"#8b5cf6", graphite:"#2d2d2d", ink:"#0a0a0a" };
          s.customColor = map[s.color] || "#fff4a3";
          delete s.color;
        }
        // Migrate plain text → html
        if (s.text !== undefined && s.html === undefined) {
          s.html = escapeHtml(s.text).replace(/\n/g, "<br>");
          delete s.text;
          delete s.bold;
          delete s.italic;
        }
        return Object.assign({}, defaults, s);
      }
    } catch {}
    return Object.assign({}, defaults, {
      html: "Hi.<br><br>Just start typing.<br><br>Select text, then use <b>⌘B</b> bold · <i>⌘I</i> italic · <b>⌘K</b> add link<br>⌘+click a link to open it",
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function save() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    }, 150);
  }

  // ====== APPLY STATE ======
  function apply() {
    const bg   = state.customColor || "#fff4a3";
    const font = FONTS.find(f => f.name === state.font) || FONTS[0];

    document.documentElement.style.setProperty("--note-bg", bg);
    sheet.dataset.textLight = String(needsLightText(bg));
    if (themeColorMeta) themeColorMeta.setAttribute("content", bg);

    colorPreview.style.background = bg;
    colorInput.value = bg;

    body.style.fontFamily = font.stack;
    body.style.fontSize   = state.fontSize + "px";

    document.documentElement.setAttribute("data-theme", state.theme);

    // Sync panel controls
    fontGrid.querySelectorAll(".font-chip").forEach(el => {
      el.classList.toggle("active", el.dataset.font === state.font);
    });
    sizeInput.value = state.fontSize;
    sizeValue.textContent = state.fontSize;
    updateFormatState();
  }

  // Track bold/italic state from current selection
  function updateFormatState() {
    boldBtn.classList.toggle("active", document.queryCommandState("bold"));
    italicBtn.classList.toggle("active", document.queryCommandState("italic"));
  }

  // ====== LINK DIALOG ======
  function promptLink() {
    const sel = window.getSelection();
    const hasSelection = sel && !sel.isCollapsed;
    const url = window.prompt("Link URL:", "https://");
    if (!url || url === "https://") return;
    body.focus();
    if (hasSelection) {
      document.execCommand("createLink", false, url);
    } else {
      document.execCommand("insertHTML", false,
        `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`);
    }
    state.html = body.innerHTML;
    save();
  }

  // ====== BUILD UI ======
  function initUI() {
    // Restore content
    body.innerHTML = state.html;

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

    // Color wheel
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

    // Bold / italic — execCommand applies only to current selection
    boldBtn.addEventListener("click", () => {
      document.execCommand("bold");
      body.focus();
      state.html = body.innerHTML;
      updateFormatState();
      save();
    });
    italicBtn.addEventListener("click", () => {
      document.execCommand("italic");
      body.focus();
      state.html = body.innerHTML;
      updateFormatState();
      save();
    });

    // Theme
    themeBtn.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      apply();
      save();
    });

    // Save on every keystroke
    body.addEventListener("input", () => {
      state.html = body.innerHTML;
      save();
    });

    // Update B/I button states when selection changes
    document.addEventListener("selectionchange", () => {
      if (document.activeElement === body) updateFormatState();
    });

    // ⌘+click opens links
    body.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (link && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        window.open(link.href, "_blank");
      }
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "b") { e.preventDefault(); boldBtn.click(); }
      if (mod && e.key === "i") { e.preventDefault(); italicBtn.click(); }
      if (mod && e.key === "k") { e.preventDefault(); promptLink(); }
      if (mod && e.key === ",") { e.preventDefault(); togglePanel(); }
      if (e.key === "Escape" && panelOpen) { togglePanel(false); body.focus(); }
    });

    // Corner button
    cornerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      togglePanel();
    });

    // Click outside panel closes it
    document.addEventListener("mousedown", (e) => {
      if (!panelOpen) return;
      if (panel.contains(e.target) || cornerBtn.contains(e.target)) return;
      togglePanel(false);
    });

    // Click bare sheet → focus body
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

  // Init
  initUI();
  apply();

  window.addEventListener("beforeunload", () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    }
  });
})();
