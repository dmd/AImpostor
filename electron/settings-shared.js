const CLAUDE_USER_FONT =
  "'Anthropic Sans', system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const CLAUDE_ASSISTANT_FONT =
  "'Anthropic Serif', 'Claude Local Serif', Georgia, 'Arial Hebrew', 'Noto Sans Hebrew', 'Times New Roman', Times, 'Hiragino Sans', 'Yu Gothic', Meiryo, 'Noto Sans CJK JP', 'PingFang TC', 'Microsoft JhengHei', 'Noto Sans CJK TC', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans CJK KR', serif";

const DEFAULT_SETTINGS = {
  userFontFamily: CLAUDE_USER_FONT,
  assistantFontFamily: CLAUDE_ASSISTANT_FONT,
  userFontSize: 16,
  assistantFontSize: 16,
  lineHeight: 1.7,
  applyToCode: false,
  globalShortcutEnabled: true,
  globalShortcut: "Alt+Space",
  theme: "light"
};

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

function cleanGlobalShortcut(value) {
  const next = String(value || DEFAULT_SETTINGS.globalShortcut)
    .replace(/[^A-Za-z0-9+]/g, "")
    .trim();
  return next || DEFAULT_SETTINGS.globalShortcut;
}

function normalizeWindowState(state) {
  if (!state || typeof state !== "object") {
    return null;
  }

  const bounds = state.bounds && typeof state.bounds === "object" ? state.bounds : {};
  const width = clampNumber(bounds.width, 760, 3200, 1200);
  const height = clampNumber(bounds.height, 560, 2400, 900);
  const normalizedBounds = { width, height };

  for (const key of ["x", "y"]) {
    const numeric = Number(bounds[key]);
    if (Number.isFinite(numeric)) {
      normalizedBounds[key] = Math.round(numeric);
    }
  }

  return {
    bounds: normalizedBounds,
    isMaximized: Boolean(state.isMaximized),
    isFullScreen: Boolean(state.isFullScreen)
  };
}

function normalizeSettings(settings = {}) {
  return {
    userFontFamily: cleanFontFamily(settings.userFontFamily || settings.fontFamily, DEFAULT_SETTINGS.userFontFamily),
    assistantFontFamily: cleanFontFamily(settings.assistantFontFamily, DEFAULT_SETTINGS.assistantFontFamily),
    userFontSize: clampNumber(settings.userFontSize || settings.fontSize, 10, 32, DEFAULT_SETTINGS.userFontSize),
    assistantFontSize: clampNumber(settings.assistantFontSize || settings.fontSize, 10, 36, DEFAULT_SETTINGS.assistantFontSize),
    lineHeight: clampNumber(settings.lineHeight, 1.1, 2.4, DEFAULT_SETTINGS.lineHeight),
    applyToCode: Boolean(settings.applyToCode),
    globalShortcutEnabled: settings.globalShortcutEnabled !== false,
    globalShortcut: cleanGlobalShortcut(settings.globalShortcut),
    theme: cleanTheme(settings.theme)
  };
}

function buildStyleVariableMap(settings = {}) {
  const normalized = normalizeSettings(settings);
  const theme = THEMES[normalized.theme];
  const assistantWeight = normalized.theme === "dark" ? 360 : 400;
  const assistantBoldWeight = normalized.theme === "dark" ? 530 : 600;
  const referenceBg = normalized.theme === "dark" ? theme.bg000 : theme.bg300;
  const referenceHoverBg = normalized.theme === "dark" ? theme.surfaceHover : theme.bg400;

  return {
    "color-scheme": theme.colorScheme,
    "--chatgpt-font-controls-user-family": normalized.userFontFamily,
    "--chatgpt-font-controls-assistant-family": normalized.assistantFontFamily,
    "--chatgpt-font-controls-user-size": `${normalized.userFontSize}px`,
    "--chatgpt-font-controls-assistant-size": `${normalized.assistantFontSize}px`,
    "--chatgpt-font-controls-user-line-height": "1.4",
    "--chatgpt-font-controls-line-height": normalized.lineHeight,
    "--chatgpt-font-controls-assistant-weight": assistantWeight,
    "--chatgpt-font-controls-assistant-bold-weight": assistantBoldWeight,
    "--chatgpt-theme-page": theme.page,
    "--chatgpt-theme-surface": theme.surface,
    "--chatgpt-theme-surface-alt": theme.surfaceAlt,
    "--chatgpt-theme-surface-raised": theme.surfaceRaised,
    "--chatgpt-theme-surface-hover": theme.surfaceHover,
    "--chatgpt-theme-border": theme.border,
    "--chatgpt-theme-border-strong": theme.borderStrong,
    "--chatgpt-theme-text": theme.text,
    "--chatgpt-theme-muted": theme.textMuted,
    "--chatgpt-theme-subtle": theme.textSubtle,
    "--chatgpt-theme-accent": theme.accent,
    "--chatgpt-theme-accent-strong": theme.accentStrong,
    "--chatgpt-theme-accent-soft": theme.accentSoft,
    "--chatgpt-theme-input": theme.input,
    "--chatgpt-theme-shadow": theme.shadow,
    "--chatgpt-theme-code-bg": theme.codeBg,
    "--chatgpt-theme-reference-bg": referenceBg,
    "--chatgpt-theme-reference-hover-bg": referenceHoverBg,
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

function isAllowedChatGptUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === "https:" && (
      parsed.hostname === "chatgpt.com" ||
      parsed.hostname === "chat.openai.com"
    );
  } catch {
    return false;
  }
}

module.exports = {
  CLAUDE_USER_FONT,
  CLAUDE_ASSISTANT_FONT,
  DEFAULT_SETTINGS,
  THEMES,
  normalizeWindowState,
  normalizeSettings,
  buildStyleVariableMap,
  isAllowedChatGptUrl
};
