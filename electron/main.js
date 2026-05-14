const { app, BrowserWindow, Menu, globalShortcut, ipcMain, nativeTheme, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const {
  DEFAULT_SETTINGS,
  THEMES,
  normalizeSettings,
  buildStyleVariableMap,
  isAllowedChatGptUrl
} = require("./settings-shared");

const FONT_PATH = path.join(__dirname, "..", "assets", "fonts", "Newsreader-Variable.ttf");
const APP_NAME = "AImpostor";
const GLOBAL_SHORTCUT = "Alt+Space";

let mainWindow = null;
let settingsWindow = null;
let insertedCssKey = null;
let localSerifDataUrl = null;

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function readSettings() {
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
    return normalizeSettings({ ...DEFAULT_SETTINGS, ...parsed });
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeSettings(settings) {
  const normalized = normalizeSettings(settings);
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(settingsPath(), `${JSON.stringify(normalized, null, 2)}\n`);
  return normalized;
}

function applyNativeTheme(settings) {
  const normalized = normalizeSettings(settings);
  const theme = THEMES[normalized.theme];

  nativeTheme.themeSource = normalized.theme;

  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.setBackgroundColor(theme.page);
    }
  }
}

function getLocalSerifDataUrl() {
  if (!localSerifDataUrl) {
    const font = fs.readFileSync(FONT_PATH);
    localSerifDataUrl = `data:font/truetype;base64,${font.toString("base64")}`;
  }
  return localSerifDataUrl;
}

function buildStyleDeclarations(settings) {
  return Object.entries(buildStyleVariableMap(settings))
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
}

function buildCss(settings) {
  const normalized = normalizeSettings(settings);
  const codeCss = normalized.applyToCode
    ? `
[data-message-author-role="user"] pre,
[data-message-author-role="user"] code,
[data-message-author-role="user"] kbd,
[data-message-author-role="user"] samp {
  font-family: var(--chatgpt-font-controls-user-family) !important;
  line-height: var(--chatgpt-font-controls-line-height) !important;
}

[data-message-author-role="assistant"] pre,
[data-message-author-role="assistant"] code,
[data-message-author-role="assistant"] kbd,
[data-message-author-role="assistant"] samp {
  font-family: var(--chatgpt-font-controls-assistant-family) !important;
  line-height: var(--chatgpt-font-controls-line-height) !important;
}
`
    : "";

  return `
@font-face {
  font-family: "Claude Local Serif";
  src: url("${getLocalSerifDataUrl()}") format("truetype");
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
}

:root {
${buildStyleDeclarations(normalized)}
}

html,
body,
main,
[role="main"],
.bg-token-main-surface-primary,
.bg-token-main-surface-secondary,
.bg-token-bg-primary,
.bg-token-bg-secondary,
.bg-token-sidebar-surface-primary,
.bg-token-sidebar-surface-secondary,
.bg-white,
.bg-gray-50,
.bg-gray-100,
.bg-gray-500\\/30,
.dark .bg-token-main-surface-primary,
.dark .bg-token-main-surface-secondary {
  background-color: var(--chatgpt-theme-page) !important;
  color: var(--chatgpt-theme-text) !important;
}

.bg-token-bg-tertiary,
.bg-token-main-surface-tertiary,
.bg-token-sidebar-surface-tertiary,
.bg-gray-200,
.bg-gray-300 {
  background-color: var(--chatgpt-theme-surface-alt) !important;
  color: var(--chatgpt-theme-text) !important;
}

button,
a,
nav,
header {
  color: var(--chatgpt-theme-text) !important;
}

button:hover,
[role="button"]:hover,
a:hover {
  background-color: var(--chatgpt-theme-surface-hover) !important;
}

button,
[role="button"] {
  border-color: var(--chatgpt-theme-border) !important;
}

button:not([class*="bg-black"]):not([class*="bg-token-text-primary"]):not([class*="bg-token-main-surface-primary"]):not([data-testid*="voice" i]):not([aria-label*="voice" i]):not([aria-label*="dictate" i]):not([aria-label*="speech" i]),
[role="button"]:not([class*="bg-black"]):not([class*="bg-token-text-primary"]):not([class*="bg-token-main-surface-primary"]):not([data-testid*="voice" i]):not([aria-label*="voice" i]):not([aria-label*="dictate" i]):not([aria-label*="speech" i]) {
  color: var(--chatgpt-theme-text) !important;
}

button[class*="bg-black"],
button[class*="bg-token-text-primary"],
button[data-testid*="voice" i],
button[aria-label*="voice" i],
button[aria-label*="dictate" i],
button[aria-label*="speech" i] {
  color: var(--chatgpt-theme-page) !important;
}

button[class*="bg-black"] svg,
button[class*="bg-token-text-primary"] svg,
button[data-testid*="voice" i] svg,
button[aria-label*="voice" i] svg,
button[aria-label*="dictate" i] svg,
button[aria-label*="speech" i] svg {
  color: currentColor !important;
  stroke: currentColor !important;
}

[data-message-author-role="user"] {
  background-color: transparent !important;
}

[data-message-author-role="user"] .whitespace-pre-wrap,
[data-message-author-role="user"] [class*="bg-"] {
  background-color: var(--message-surface) !important;
  color: var(--chatgpt-theme-text) !important;
}

[data-message-author-role="assistant"] .markdown a[href][class*="rounded"],
[data-message-author-role="assistant"] .markdown a[href][class*="bg-"],
[data-message-author-role="assistant"] .prose a[href][class*="rounded"],
[data-message-author-role="assistant"] .prose a[href][class*="bg-"],
[data-message-author-role="assistant"] .markdown [class*="bg-token-main-surface"][class*="rounded"],
[data-message-author-role="assistant"] .prose [class*="bg-token-main-surface"][class*="rounded"],
[data-message-author-role="assistant"] .markdown [class*="bg-white"][class*="rounded"],
[data-message-author-role="assistant"] .prose [class*="bg-white"][class*="rounded"] {
  background-color: var(--chatgpt-theme-reference-bg) !important;
  color: var(--chatgpt-theme-muted) !important;
  border-color: var(--chatgpt-theme-border) !important;
  box-shadow: inset 0 0 0 1px var(--chatgpt-theme-border) !important;
}

[data-message-author-role="assistant"] .markdown a[href][class*="rounded"]:hover,
[data-message-author-role="assistant"] .markdown a[href][class*="bg-"]:hover,
[data-message-author-role="assistant"] .prose a[href][class*="rounded"]:hover,
[data-message-author-role="assistant"] .prose a[href][class*="bg-"]:hover {
  background-color: var(--chatgpt-theme-reference-hover-bg) !important;
  color: var(--chatgpt-theme-text) !important;
}

[data-message-author-role="assistant"],
[data-message-author-role="assistant"] .markdown,
[data-message-author-role="assistant"] .prose {
  color: var(--chatgpt-theme-text) !important;
}

.text-token-text-primary,
.text-token-text-primary {
  color: var(--chatgpt-theme-text) !important;
}

.text-token-text-secondary,
.text-token-text-tertiary,
.text-token-text-quaternary,
[class*="text-token-text-secondary"],
[class*="text-token-text-tertiary"] {
  color: var(--chatgpt-theme-muted) !important;
}

textarea,
[contenteditable="true"],
form,
[data-testid*="composer"] {
  color: var(--chatgpt-theme-text) !important;
  border-color: var(--chatgpt-theme-border) !important;
}

.shadow-short-composer,
[class*="composer"] .bg-token-bg-primary {
  background-color: var(--chatgpt-theme-input) !important;
  color: var(--chatgpt-theme-text) !important;
  border-color: var(--chatgpt-theme-border) !important;
}

.shadow-short-composer::before,
.shadow-short-composer::after,
[class*="composer"]::before,
[class*="composer"]::after {
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

[role="tooltip"] .bg-token-bg-tooltip,
[data-state="delayed-open"].bg-token-bg-tooltip,
[data-state="instant-open"].bg-token-bg-tooltip {
  background-color: var(--chatgpt-theme-surface-raised) !important;
  color: var(--chatgpt-theme-text) !important;
  border: 1px solid var(--chatgpt-theme-border) !important;
  box-shadow: 0 8px 24px var(--chatgpt-theme-shadow) !important;
}

[role="tooltip"] .bg-token-bg-tooltip *,
[role="tooltip"] .bg-token-bg-tooltip .text-token-text-primary,
[data-state="delayed-open"].bg-token-bg-tooltip *,
[data-state="delayed-open"].bg-token-bg-tooltip .text-token-text-primary,
[data-state="instant-open"].bg-token-bg-tooltip *,
[data-state="instant-open"].bg-token-bg-tooltip .text-token-text-primary {
  color: var(--chatgpt-theme-text) !important;
}

pre,
code {
  background-color: var(--chatgpt-theme-code-bg) !important;
  color: var(--chatgpt-theme-text) !important;
}

hr,
.border-token-border-light,
.border-token-border-medium {
  border-color: var(--chatgpt-theme-border) !important;
}

svg {
  color: inherit;
}

textarea,
[contenteditable="true"] {
  font-family: var(--chatgpt-font-controls-user-family) !important;
  font-size: var(--chatgpt-font-controls-user-size) !important;
  font-weight: 430 !important;
  line-height: var(--chatgpt-font-controls-user-line-height) !important;
  letter-spacing: 0 !important;
  font-feature-settings: normal !important;
  font-variation-settings: normal !important;
}

[data-message-author-role="user"],
[data-message-author-role="user"] .whitespace-pre-wrap {
  font-family: var(--chatgpt-font-controls-user-family) !important;
  font-size: var(--chatgpt-font-controls-user-size) !important;
  font-weight: 430 !important;
  line-height: var(--chatgpt-font-controls-user-line-height) !important;
  letter-spacing: 0 !important;
  font-feature-settings: normal !important;
  font-variation-settings: normal !important;
}

[data-message-author-role="assistant"] .markdown,
[data-message-author-role="assistant"] .prose {
  font-family: var(--chatgpt-font-controls-assistant-family) !important;
  font-size: var(--chatgpt-font-controls-assistant-size) !important;
  font-weight: var(--chatgpt-font-controls-assistant-weight) !important;
  line-height: var(--chatgpt-font-controls-line-height) !important;
  letter-spacing: 0 !important;
  font-feature-settings: normal !important;
  font-variation-settings: normal !important;
  font-optical-sizing: auto !important;
  font-kerning: normal !important;
  text-rendering: optimizeLegibility !important;
}

[data-message-author-role="assistant"] .markdown :where(p, li, blockquote, table, th, td),
[data-message-author-role="assistant"] .prose :where(p, li, blockquote, table, th, td) {
  font-family: inherit !important;
  font-size: inherit !important;
  font-weight: inherit !important;
  line-height: inherit !important;
  letter-spacing: inherit !important;
}

[data-message-author-role="assistant"] .markdown :where(strong, b),
[data-message-author-role="assistant"] .prose :where(strong, b) {
  font-weight: var(--chatgpt-font-controls-assistant-bold-weight) !important;
}

${codeCss}
`;
}

async function applyThemeVariablesToPage(settings) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const vars = buildStyleVariableMap(settings);
  await mainWindow.webContents.executeJavaScript(`
    (() => {
      const vars = ${JSON.stringify(vars)};
      const root = document.documentElement;
      for (const [name, value] of Object.entries(vars)) {
        root.style.setProperty(name, value, "important");
      }

      const suppressNativeTooltips = () => {
        const storeTitle = (element) => {
          if (!(element instanceof HTMLElement)) {
            return;
          }

          const title = element.getAttribute("title");
          if (!title) {
            return;
          }

          element.dataset.aimpostorTitle = title;
          if (!element.getAttribute("aria-label") && !element.getAttribute("aria-labelledby")) {
            element.setAttribute("aria-label", title);
          }
          element.removeAttribute("title");
        };

        document.querySelectorAll("[title]").forEach(storeTitle);

        if (window.__aimpostorTitleObserver) {
          return;
        }

        window.__aimpostorTitleObserver = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.type === "attributes") {
              storeTitle(mutation.target);
              continue;
            }

            for (const node of mutation.addedNodes) {
              if (!(node instanceof HTMLElement)) {
                continue;
              }
              storeTitle(node);
              node.querySelectorAll?.("[title]").forEach(storeTitle);
            }
          }
        });

        window.__aimpostorTitleObserver.observe(document.documentElement, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["title"]
        });
      };

      suppressNativeTooltips();
    })();
  `).catch(() => {});
}

async function applyTypography() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const settings = readSettings();

  if (insertedCssKey) {
    await mainWindow.webContents.removeInsertedCSS(insertedCssKey).catch(() => {});
    insertedCssKey = null;
  }

  insertedCssKey = await mainWindow.webContents.insertCSS(buildCss(settings), {
    cssOrigin: "user"
  });
  await applyThemeVariablesToPage(settings);
}

function scheduleThemeReapply() {
  setTimeout(() => applyThemeVariablesToPage(readSettings()), 300);
  setTimeout(() => applyThemeVariablesToPage(readSettings()), 1200);
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    focusMainWindow();
    return;
  }

  const theme = THEMES[readSettings().theme];

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 760,
    minHeight: 560,
    title: APP_NAME,
    backgroundColor: theme.page,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedChatGptUrl(url)) {
      return { action: "allow" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("dom-ready", () => {
    applyTypography();
    scheduleThemeReapply();
  });
  mainWindow.webContents.on("did-finish-load", scheduleThemeReapply);
  mainWindow.webContents.on("did-navigate-in-page", () => {
    applyTypography();
    scheduleThemeReapply();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.loadURL("https://chatgpt.com/");
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createMainWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  mainWindow.focus();
}

function applyGlobalShortcut(settings) {
  const normalized = normalizeSettings(settings);
  globalShortcut.unregister(GLOBAL_SHORTCUT);

  if (!normalized.globalShortcutEnabled) {
    return;
  }

  const registered = globalShortcut.register(GLOBAL_SHORTCUT, focusMainWindow);

  if (!registered) {
    console.warn(`Could not register global shortcut ${GLOBAL_SHORTCUT}`);
  }
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  const theme = THEMES[readSettings().theme];

  settingsWindow = new BrowserWindow({
    width: 460,
    height: 690,
    resizable: false,
    title: `${APP_NAME} Settings`,
    parent: mainWindow || undefined,
    backgroundColor: theme.page,
    webPreferences: {
      preload: path.join(__dirname, "settings-preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWindow.loadFile(path.join(__dirname, "settings.html"));
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        { label: "Settings...", accelerator: "CommandOrControl+,", click: createSettingsWindow },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteAndMatchStyle" },
        { role: "delete" },
        { type: "separator" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "close" }
      ]
    }
  ]);
}

app.setName(APP_NAME);

app.whenReady().then(() => {
  const settings = writeSettings(readSettings());
  applyNativeTheme(settings);
  Menu.setApplicationMenu(buildMenu());
  createMainWindow();
  applyGlobalShortcut(settings);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      focusMainWindow();
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("settings:get", () => readSettings());

function saveSettingsPatch(patch) {
  const saved = writeSettings({ ...readSettings(), ...patch });
  applyNativeTheme(saved);
  applyGlobalShortcut(saved);
  return saved;
}

ipcMain.handle("settings:save", async (_event, patch) => {
  const saved = saveSettingsPatch(patch);
  await applyTypography();
  return saved;
});

ipcMain.on("settings:save-sync", (event, patch) => {
  const saved = saveSettingsPatch(patch);
  applyTypography().catch((error) => {
    console.error("Could not apply typography", error);
  });
  event.returnValue = saved;
});

ipcMain.handle("settings:reset", async () => {
  const saved = writeSettings(DEFAULT_SETTINGS);
  applyNativeTheme(saved);
  applyGlobalShortcut(saved);
  await applyTypography();
  return saved;
});

ipcMain.handle("settings:open-chatgpt", () => {
  focusMainWindow();
});
