const DEFAULT_SETTINGS = {
  userFontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
  assistantFontFamily: "'Anthropic Serif', 'Tiempos Text', Tiempos, 'Claude Local Serif', Charter, 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
  userFontSize: 15,
  assistantFontSize: 18,
  lineHeight: 1.62,
  applyToCode: false
};

const LEGACY_ASSISTANT_FONT = "Charter, 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";
const STYLE_ID = "chatgpt-font-controls-style";

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numeric));
}

function cleanFontFamily(value) {
  const next = String(value || DEFAULT_SETTINGS.userFontFamily).replace(/[{};<>]/g, "").trim();
  return next || DEFAULT_SETTINGS.userFontFamily;
}

function normalizeSettings(settings) {
  const assistantFontFamily = settings.assistantFontFamily === LEGACY_ASSISTANT_FONT
    ? DEFAULT_SETTINGS.assistantFontFamily
    : settings.assistantFontFamily;

  return {
    userFontFamily: cleanFontFamily(settings.userFontFamily || settings.fontFamily || DEFAULT_SETTINGS.userFontFamily),
    assistantFontFamily: cleanFontFamily(assistantFontFamily || DEFAULT_SETTINGS.assistantFontFamily),
    userFontSize: clampNumber(settings.userFontSize || settings.fontSize, 10, 32, DEFAULT_SETTINGS.userFontSize),
    assistantFontSize: clampNumber(settings.assistantFontSize || settings.fontSize, 10, 36, DEFAULT_SETTINGS.assistantFontSize),
    lineHeight: clampNumber(settings.lineHeight, 1.1, 2.4, DEFAULT_SETTINGS.lineHeight),
    applyToCode: Boolean(settings.applyToCode)
  };
}

function buildCss(rawSettings) {
  const settings = normalizeSettings(rawSettings);
  const localSerifUrl = chrome.runtime.getURL("fonts/Newsreader-Variable.ttf");
  const codeCss = settings.applyToCode
    ? `
html[data-chatgpt-font-controls="on"] [data-message-author-role="user"] pre,
html[data-chatgpt-font-controls="on"] [data-message-author-role="user"] code,
html[data-chatgpt-font-controls="on"] [data-message-author-role="user"] kbd,
html[data-chatgpt-font-controls="on"] [data-message-author-role="user"] samp {
  font-family: var(--chatgpt-font-controls-user-family) !important;
  line-height: var(--chatgpt-font-controls-line-height) !important;
}

html[data-chatgpt-font-controls="on"] [data-message-author-role="assistant"] pre,
html[data-chatgpt-font-controls="on"] [data-message-author-role="assistant"] code,
html[data-chatgpt-font-controls="on"] [data-message-author-role="assistant"] kbd,
html[data-chatgpt-font-controls="on"] [data-message-author-role="assistant"] samp {
  font-family: var(--chatgpt-font-controls-assistant-family) !important;
  line-height: var(--chatgpt-font-controls-line-height) !important;
}
`
    : "";

  return `
@font-face {
  font-family: "Claude Local Serif";
  src: url("${localSerifUrl}") format("truetype-variations");
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
}

html[data-chatgpt-font-controls="on"] {
  --chatgpt-font-controls-user-family: ${settings.userFontFamily};
  --chatgpt-font-controls-assistant-family: ${settings.assistantFontFamily};
  --chatgpt-font-controls-user-size: ${settings.userFontSize}px;
  --chatgpt-font-controls-assistant-size: ${settings.assistantFontSize}px;
  --chatgpt-font-controls-line-height: ${settings.lineHeight};
}

html[data-chatgpt-font-controls="on"] textarea,
html[data-chatgpt-font-controls="on"] [contenteditable="true"] {
  font-family: var(--chatgpt-font-controls-user-family) !important;
  font-size: var(--chatgpt-font-controls-user-size) !important;
  line-height: var(--chatgpt-font-controls-line-height) !important;
}

html[data-chatgpt-font-controls="on"] [data-message-author-role="user"],
html[data-chatgpt-font-controls="on"] [data-message-author-role="user"] .whitespace-pre-wrap {
  font-family: var(--chatgpt-font-controls-user-family) !important;
  font-size: var(--chatgpt-font-controls-user-size) !important;
  line-height: var(--chatgpt-font-controls-line-height) !important;
}

html[data-chatgpt-font-controls="on"] [data-message-author-role="assistant"] .markdown,
html[data-chatgpt-font-controls="on"] [data-message-author-role="assistant"] .prose {
  font-family: var(--chatgpt-font-controls-assistant-family) !important;
  font-size: var(--chatgpt-font-controls-assistant-size) !important;
  line-height: var(--chatgpt-font-controls-line-height) !important;
}

html[data-chatgpt-font-controls="on"] [data-message-author-role="assistant"] .markdown :where(p, li, blockquote, table, th, td),
html[data-chatgpt-font-controls="on"] [data-message-author-role="assistant"] .prose :where(p, li, blockquote, table, th, td) {
  font: inherit !important;
  line-height: inherit !important;
}

${codeCss}
`;
}

function getStyleElement() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    style.type = "text/css";
    const target = document.head || document.documentElement;
    target.appendChild(style);
  }
  return style;
}

function applySettings(settings) {
  document.documentElement.dataset.chatgptFontControls = "on";
  getStyleElement().textContent = buildCss(settings);
}

function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    const normalized = normalizeSettings(settings);
    if (settings.assistantFontFamily === LEGACY_ASSISTANT_FONT) {
      chrome.storage.sync.set({ assistantFontFamily: DEFAULT_SETTINGS.assistantFontFamily });
    }
    applySettings(normalized);
  });
}

loadSettings();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "sync") {
    return;
  }

  const updated = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (changes[key]) {
      updated[key] = changes[key].newValue;
    }
  }

  if (Object.keys(updated).length === 0) {
    return;
  }

  chrome.storage.sync.get(DEFAULT_SETTINGS, applySettings);
});
