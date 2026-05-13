const DEFAULT_SETTINGS = {
  userFontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
  assistantFontFamily: "'Anthropic Serif', 'Tiempos Text', Tiempos, 'Claude Local Serif', Charter, 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
  userFontSize: 15,
  assistantFontSize: 18,
  lineHeight: 1.62,
  applyToCode: false
};

const LEGACY_ASSISTANT_FONT = "Charter, 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";

const els = {
  userFontPreset: document.getElementById("userFontPreset"),
  userFontFamily: document.getElementById("userFontFamily"),
  userCustomFont: document.getElementById("userCustomFont"),
  userFontSize: document.getElementById("userFontSize"),
  userFontSizeNumber: document.getElementById("userFontSizeNumber"),
  userFontSizeOutput: document.getElementById("userFontSizeOutput"),
  assistantFontPreset: document.getElementById("assistantFontPreset"),
  assistantFontFamily: document.getElementById("assistantFontFamily"),
  assistantCustomFont: document.getElementById("assistantCustomFont"),
  assistantFontSize: document.getElementById("assistantFontSize"),
  assistantFontSizeNumber: document.getElementById("assistantFontSizeNumber"),
  assistantFontSizeOutput: document.getElementById("assistantFontSizeOutput"),
  lineHeight: document.getElementById("lineHeight"),
  lineHeightNumber: document.getElementById("lineHeightNumber"),
  lineHeightOutput: document.getElementById("lineHeightOutput"),
  applyToCode: document.getElementById("applyToCode"),
  openChatGPT: document.getElementById("openChatGPT"),
  reset: document.getElementById("reset")
};

let currentSettings = { ...DEFAULT_SETTINGS };
let isHydrating = false;

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numeric));
}

function presetValues(select) {
  return Array.from(select.options)
    .map((option) => option.value)
    .filter((value) => value !== "custom");
}

function isPreset(select, fontFamily) {
  return presetValues(select).includes(fontFamily);
}

function normalize(settings) {
  const assistantFontFamily = settings.assistantFontFamily === LEGACY_ASSISTANT_FONT
    ? DEFAULT_SETTINGS.assistantFontFamily
    : settings.assistantFontFamily;

  return {
    userFontFamily: String(settings.userFontFamily || settings.fontFamily || DEFAULT_SETTINGS.userFontFamily).trim() || DEFAULT_SETTINGS.userFontFamily,
    assistantFontFamily: String(assistantFontFamily || DEFAULT_SETTINGS.assistantFontFamily).trim() || DEFAULT_SETTINGS.assistantFontFamily,
    userFontSize: clampNumber(settings.userFontSize || settings.fontSize, 10, 32, DEFAULT_SETTINGS.userFontSize),
    assistantFontSize: clampNumber(settings.assistantFontSize || settings.fontSize, 10, 36, DEFAULT_SETTINGS.assistantFontSize),
    lineHeight: clampNumber(settings.lineHeight, 1.1, 2.4, DEFAULT_SETTINGS.lineHeight),
    applyToCode: Boolean(settings.applyToCode)
  };
}

function renderFontControl(prefix, fontFamily) {
  const preset = els[`${prefix}FontPreset`];
  const custom = els[`${prefix}CustomFont`];
  const input = els[`${prefix}FontFamily`];

  if (isPreset(preset, fontFamily)) {
    preset.value = fontFamily;
    custom.hidden = true;
  } else {
    preset.value = "custom";
    custom.hidden = false;
  }

  input.value = fontFamily;
}

function renderSizeControl(prefix, value) {
  els[`${prefix}FontSize`].value = String(value);
  els[`${prefix}FontSizeNumber`].value = String(value);
  els[`${prefix}FontSizeOutput`].value = `${value}px`;
}

function render(settings) {
  isHydrating = true;
  currentSettings = normalize(settings);

  renderFontControl("user", currentSettings.userFontFamily);
  renderFontControl("assistant", currentSettings.assistantFontFamily);
  renderSizeControl("user", currentSettings.userFontSize);
  renderSizeControl("assistant", currentSettings.assistantFontSize);
  els.lineHeight.value = String(currentSettings.lineHeight);
  els.lineHeightNumber.value = String(currentSettings.lineHeight);
  els.lineHeightOutput.value = currentSettings.lineHeight.toFixed(2);
  els.applyToCode.checked = currentSettings.applyToCode;
  isHydrating = false;
}

function save(patch) {
  if (isHydrating) {
    return;
  }

  currentSettings = normalize({ ...currentSettings, ...patch });
  chrome.storage.sync.set(currentSettings);
  render(currentSettings);
}

function load() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    const normalized = normalize(settings);
    if (settings.assistantFontFamily === LEGACY_ASSISTANT_FONT) {
      chrome.storage.sync.set({ assistantFontFamily: DEFAULT_SETTINGS.assistantFontFamily });
    }
    render(normalized);
  });
}

function bindFontControl(prefix, storageKey) {
  const preset = els[`${prefix}FontPreset`];
  const custom = els[`${prefix}CustomFont`];
  const input = els[`${prefix}FontFamily`];

  preset.addEventListener("change", () => {
    if (preset.value === "custom") {
      custom.hidden = false;
      input.focus();
      save({ [storageKey]: input.value });
      return;
    }

    save({ [storageKey]: preset.value });
  });

  input.addEventListener("input", () => {
    save({ [storageKey]: input.value });
  });
}

function bindSizeControl(prefix, storageKey) {
  els[`${prefix}FontSize`].addEventListener("input", () => {
    save({ [storageKey]: els[`${prefix}FontSize`].value });
  });

  els[`${prefix}FontSizeNumber`].addEventListener("input", () => {
    save({ [storageKey]: els[`${prefix}FontSizeNumber`].value });
  });
}

bindFontControl("user", "userFontFamily");
bindFontControl("assistant", "assistantFontFamily");
bindSizeControl("user", "userFontSize");
bindSizeControl("assistant", "assistantFontSize");

els.lineHeight.addEventListener("input", () => {
  save({ lineHeight: els.lineHeight.value });
});

els.lineHeightNumber.addEventListener("input", () => {
  save({ lineHeight: els.lineHeightNumber.value });
});

els.applyToCode.addEventListener("change", () => {
  save({ applyToCode: els.applyToCode.checked });
});

els.openChatGPT.addEventListener("click", () => {
  chrome.tabs.create({ url: "https://chatgpt.com/" });
});

els.reset.addEventListener("click", () => {
  chrome.storage.sync.set(DEFAULT_SETTINGS, () => {
    render(DEFAULT_SETTINGS);
  });
});

load();
