const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const fs = require("fs");
const path = require("path");

const FONT_PATH = path.join(__dirname, "..", "assets", "fonts", "Newsreader-Variable.ttf");
const CLAUDE_USER_FONT =
  "'Anthropic Sans', system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const CLAUDE_ASSISTANT_FONT =
  "'Anthropic Serif', 'Claude Local Serif', Georgia, 'Arial Hebrew', 'Noto Sans Hebrew', 'Times New Roman', Times, 'Hiragino Sans', 'Yu Gothic', Meiryo, 'Noto Sans CJK JP', 'PingFang TC', 'Microsoft JhengHei', 'Noto Sans CJK TC', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans CJK KR', serif";
const APP_NAME = "AImpostor";
const LEGACY_APP_NAME = "ChatGPT Font";

const DEFAULT_SETTINGS = {
  userFontFamily: CLAUDE_USER_FONT,
  assistantFontFamily: CLAUDE_ASSISTANT_FONT,
  userFontSize: 16,
  assistantFontSize: 16,
  lineHeight: 1.7,
  applyToCode: false,
  theme: "light"
};

const LEGACY_ASSISTANT_FONT = "Charter, 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";
const LEGACY_ASSISTANT_FONT_WITH_ANTHROPIC = "'Anthropic Serif', 'Tiempos Text', Tiempos, 'Claude Local Serif', Charter, 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";

let mainWindow = null;
let settingsWindow = null;
let insertedCssKey = null;
let localSerifDataUrl = null;

const THEMES = {
  light: {
    colorScheme: "light",
    bg000: "#ffffff",
    bg100: "#f9f9f7",
    bg200: "#f3f3f0",
    bg300: "#f0efec",
    bg400: "#e7e6e1",
    page: "#f9f9f7",
    surface: "#ffffff",
    surfaceAlt: "#ebe9e4",
    surfaceRaised: "#ffffff",
    surfaceHover: "#f3f3f0",
    border: "rgba(11, 11, 11, 0.10)",
    borderStrong: "rgba(11, 11, 11, 0.20)",
    text: "#131313",
    textMuted: "#383835",
    textSubtle: "#7b7974",
    accent: "#d97757",
    accentStrong: "#c6613f",
    accentSoft: "#f7d8cb",
    input: "#ffffff",
    shadow: "rgba(11, 11, 11, 0.08)",
    codeBg: "#f3f3f0",
    hover: "rgba(11, 11, 11, 0.05)",
    selected: "rgba(11, 11, 11, 0.10)"
  },
  dark: {
    colorScheme: "dark",
    bg000: "#2c2c2a",
    bg100: "#1f1f1e",
    bg200: "#171716",
    bg300: "#121212",
    bg400: "#0a0a0a",
    page: "#1f1f1e",
    surface: "#2c2c2a",
    surfaceAlt: "#373734",
    surfaceRaised: "#2c2c2a",
    surfaceHover: "#373734",
    border: "rgba(226, 225, 218, 0.10)",
    borderStrong: "rgba(226, 225, 218, 0.20)",
    text: "#f8f8f6",
    textMuted: "#c3c2b7",
    textSubtle: "#97958c",
    accent: "#d97757",
    accentStrong: "#c6613f",
    accentSoft: "#4b1b08",
    input: "#2c2c2a",
    shadow: "rgba(0, 0, 0, 0.40)",
    codeBg: "#171716",
    hover: "rgba(248, 248, 246, 0.10)",
    selected: "rgba(248, 248, 246, 0.20)"
  }
};

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function legacySettingsPath() {
  return path.join(app.getPath("appData"), LEGACY_APP_NAME, "settings.json");
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numeric));
}

function cleanFontFamily(value, fallback) {
  const next = String(value || fallback).replace(/[{};<>]/g, "").trim();
  return next || fallback;
}

function cleanTheme(value) {
  return Object.hasOwn(THEMES, value) ? value : DEFAULT_SETTINGS.theme;
}

function normalizeSettings(settings) {
  const assistantFontFamily = [LEGACY_ASSISTANT_FONT, LEGACY_ASSISTANT_FONT_WITH_ANTHROPIC].includes(settings.assistantFontFamily)
    ? DEFAULT_SETTINGS.assistantFontFamily
    : settings.assistantFontFamily;

  return {
    userFontFamily: cleanFontFamily(settings.userFontFamily || settings.fontFamily, DEFAULT_SETTINGS.userFontFamily),
    assistantFontFamily: cleanFontFamily(assistantFontFamily, DEFAULT_SETTINGS.assistantFontFamily),
    userFontSize: clampNumber(settings.userFontSize || settings.fontSize, 10, 32, DEFAULT_SETTINGS.userFontSize),
    assistantFontSize: clampNumber(settings.assistantFontSize || settings.fontSize, 10, 36, DEFAULT_SETTINGS.assistantFontSize),
    lineHeight: clampNumber(settings.lineHeight, 1.1, 2.4, DEFAULT_SETTINGS.lineHeight),
    applyToCode: Boolean(settings.applyToCode),
    theme: cleanTheme(settings.theme)
  };
}

function readSettings() {
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
    return normalizeSettings({ ...DEFAULT_SETTINGS, ...parsed });
  } catch {
    try {
      const parsed = JSON.parse(fs.readFileSync(legacySettingsPath(), "utf8"));
      return normalizeSettings({ ...DEFAULT_SETTINGS, ...parsed });
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }
}

function writeSettings(settings) {
  const normalized = normalizeSettings(settings);
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(settingsPath(), `${JSON.stringify(normalized, null, 2)}\n`);
  return normalized;
}

function getLocalSerifDataUrl() {
  if (!localSerifDataUrl) {
    const font = fs.readFileSync(FONT_PATH);
    localSerifDataUrl = `data:font/truetype;base64,${font.toString("base64")}`;
  }
  return localSerifDataUrl;
}

function buildCss(settings) {
  const normalized = normalizeSettings(settings);
  const theme = THEMES[normalized.theme];
  const assistantWeight = normalized.theme === "dark" ? 360 : 400;
  const assistantBoldWeight = normalized.theme === "dark" ? 530 : 600;
  const referenceBg = normalized.theme === "dark" ? theme.bg000 : theme.bg300;
  const referenceHoverBg = normalized.theme === "dark" ? theme.surfaceHover : theme.bg400;
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
  color-scheme: ${theme.colorScheme};
  --chatgpt-font-controls-user-family: ${normalized.userFontFamily};
  --chatgpt-font-controls-assistant-family: ${normalized.assistantFontFamily};
  --chatgpt-font-controls-user-size: ${normalized.userFontSize}px;
  --chatgpt-font-controls-assistant-size: ${normalized.assistantFontSize}px;
  --chatgpt-font-controls-user-line-height: 1.4;
  --chatgpt-font-controls-line-height: ${normalized.lineHeight};
  --chatgpt-font-controls-assistant-weight: ${assistantWeight};
  --chatgpt-font-controls-assistant-bold-weight: ${assistantBoldWeight};
  --chatgpt-theme-page: ${theme.page};
  --chatgpt-theme-surface: ${theme.surface};
  --chatgpt-theme-surface-alt: ${theme.surfaceAlt};
  --chatgpt-theme-surface-raised: ${theme.surfaceRaised};
  --chatgpt-theme-surface-hover: ${theme.surfaceHover};
  --chatgpt-theme-border: ${theme.border};
  --chatgpt-theme-border-strong: ${theme.borderStrong};
  --chatgpt-theme-text: ${theme.text};
  --chatgpt-theme-muted: ${theme.textMuted};
  --chatgpt-theme-subtle: ${theme.textSubtle};
  --chatgpt-theme-accent: ${theme.accent};
  --chatgpt-theme-accent-strong: ${theme.accentStrong};
  --chatgpt-theme-accent-soft: ${theme.accentSoft};
  --chatgpt-theme-input: ${theme.input};
  --chatgpt-theme-shadow: ${theme.shadow};
  --chatgpt-theme-code-bg: ${theme.codeBg};
  --chatgpt-theme-reference-bg: ${referenceBg};
  --chatgpt-theme-reference-hover-bg: ${referenceHoverBg};
  --main-surface-background: ${theme.page};
  --main-surface-primary: ${theme.page};
  --main-surface-primary-inverse: ${theme.text};
  --main-surface-secondary: ${theme.bg100};
  --main-surface-secondary-selected: ${theme.selected};
  --main-surface-tertiary: ${theme.bg300};
  --bg-primary: ${theme.page};
  --bg-secondary: ${theme.bg200};
  --bg-secondary-surface: ${theme.bg100};
  --bg-tertiary: ${theme.bg300};
  --bg-elevated-primary: ${theme.surface};
  --bg-elevated-secondary: ${theme.bg200};
  --message-surface: ${theme.surfaceAlt};
  --composer-surface: ${theme.input};
  --composer-surface-primary: ${theme.input};
  --sidebar-surface: ${theme.page};
  --sidebar-surface-primary: ${theme.page};
  --sidebar-surface-secondary: ${theme.bg300};
  --sidebar-surface-tertiary: ${theme.bg400};
  --sidebar-body-primary: ${theme.text};
  --sidebar-icon: ${theme.textSubtle};
  --sidebar-title-primary: ${theme.textMuted};
  --surface-hover: ${theme.hover};
  --text-primary: ${theme.text};
  --text-secondary: ${theme.textMuted};
  --text-tertiary: ${theme.textSubtle};
  --text-quaternary: ${theme.borderStrong};
  --text-placeholder: ${theme.textSubtle};
  --text-inverted: ${theme.bg000};
  --text-primary-inverse: ${theme.bg300};
  --theme-user-msg-text: ${theme.text};
  --theme-secondary-btn-text: ${theme.text};
  --default-theme-user-msg-text: ${theme.text};
  --default-theme-secondary-btn-text: ${theme.text};
  --interactive-bg-primary-default-context: ${theme.text};
  --interactive-bg-primary-hover-context: ${theme.textMuted};
  --interactive-bg-primary-press-context: ${theme.text};
  --interactive-label-primary-context: ${theme.bg000};
  --interactive-icon-primary-context: ${theme.bg000};
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

function buildThemeVariableMap(settings) {
  const normalized = normalizeSettings(settings);
  const theme = THEMES[normalized.theme];

  return {
    "color-scheme": theme.colorScheme,
    "--main-surface-background": theme.page,
    "--main-surface-primary": theme.page,
    "--main-surface-primary-inverse": theme.text,
    "--main-surface-secondary": theme.bg100,
    "--main-surface-secondary-selected": theme.selected,
    "--main-surface-tertiary": theme.bg300,
    "--bg-primary": theme.page,
    "--bg-secondary": theme.bg200,
    "--bg-secondary-surface": theme.bg100,
    "--bg-tertiary": theme.bg300,
    "--bg-elevated-primary": theme.surface,
    "--bg-elevated-secondary": theme.bg200,
    "--message-surface": theme.surfaceAlt,
    "--composer-surface": theme.input,
    "--composer-surface-primary": theme.input,
    "--sidebar-surface": theme.page,
    "--sidebar-surface-primary": theme.page,
    "--sidebar-surface-secondary": theme.bg300,
    "--sidebar-surface-tertiary": theme.bg400,
    "--sidebar-body-primary": theme.text,
    "--sidebar-icon": theme.textSubtle,
    "--sidebar-title-primary": theme.textMuted,
    "--surface-hover": theme.hover,
    "--text-primary": theme.text,
    "--text-secondary": theme.textMuted,
    "--text-tertiary": theme.textSubtle,
    "--text-quaternary": theme.borderStrong,
    "--text-placeholder": theme.textSubtle,
    "--text-inverted": theme.bg000,
    "--text-primary-inverse": theme.bg300,
    "--theme-user-msg-text": theme.text,
    "--theme-secondary-btn-text": theme.text,
    "--default-theme-user-msg-text": theme.text,
    "--default-theme-secondary-btn-text": theme.text,
    "--interactive-bg-primary-default-context": theme.text,
    "--interactive-bg-primary-hover-context": theme.textMuted,
    "--interactive-bg-primary-press-context": theme.text,
    "--interactive-label-primary-context": theme.bg000,
    "--interactive-icon-primary-context": theme.bg000
  };
}

async function applyThemeVariablesToPage(settings) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const vars = buildThemeVariableMap(settings);
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
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 760,
    minHeight: 560,
    title: APP_NAME,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://chatgpt.com") || url.startsWith("https://chat.openai.com")) {
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
  mainWindow.loadURL("https://chatgpt.com/");
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 460,
    height: 690,
    resizable: false,
    title: `${APP_NAME} Settings`,
    parent: mainWindow || undefined,
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
  writeSettings(readSettings());
  Menu.setApplicationMenu(buildMenu());
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("settings:get", () => readSettings());

ipcMain.handle("settings:save", async (_event, patch) => {
  const saved = writeSettings({ ...readSettings(), ...patch });
  await applyTypography();
  return saved;
});

ipcMain.handle("settings:reset", async () => {
  const saved = writeSettings(DEFAULT_SETTINGS);
  await applyTypography();
  return saved;
});

ipcMain.handle("settings:open-chatgpt", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
  }
});
