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
  theme: document.getElementById("theme"),
  applyToCode: document.getElementById("applyToCode"),
  globalShortcutEnabled: document.getElementById("globalShortcutEnabled"),
  openChatGPT: document.getElementById("openChatGPT"),
  reset: document.getElementById("reset")
};

const SAVE_DEBOUNCE_MS = 180;

let currentSettings = null;
let isHydrating = false;
let pendingPatch = {};
let saveTimer = null;
let saveRequestId = 0;
let isUnloading = false;

function presetValues(select) {
  return Array.from(select.options)
    .map((option) => option.value)
    .filter((value) => value !== "custom");
}

function isPreset(select, fontFamily) {
  return presetValues(select).includes(fontFamily);
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
  currentSettings = settings;

  renderFontControl("user", currentSettings.userFontFamily);
  renderFontControl("assistant", currentSettings.assistantFontFamily);
  renderSizeControl("user", currentSettings.userFontSize);
  renderSizeControl("assistant", currentSettings.assistantFontSize);
  els.lineHeight.value = String(currentSettings.lineHeight);
  els.lineHeightNumber.value = String(currentSettings.lineHeight);
  els.lineHeightOutput.value = currentSettings.lineHeight.toFixed(2);
  els.theme.value = currentSettings.theme;
  els.applyToCode.checked = currentSettings.applyToCode;
  els.globalShortcutEnabled.checked = currentSettings.globalShortcutEnabled;
  isHydrating = false;
}

function takePendingPatch() {
  if (!Object.keys(pendingPatch).length) {
    return null;
  }

  window.clearTimeout(saveTimer);
  saveTimer = null;

  const patch = pendingPatch;
  pendingPatch = {};
  return patch;
}

async function flushSave(options = {}) {
  const patch = takePendingPatch();
  if (!patch) {
    return;
  }

  const requestId = ++saveRequestId;

  try {
    const saved = await window.chatgptFontSettings.saveSettings(patch);
    if (options.render !== false && !isUnloading && requestId === saveRequestId) {
      render(saved);
    }
  } catch (error) {
    console.error("Could not save settings", error);
  }
}

function flushSaveSync() {
  const patch = takePendingPatch();
  if (!patch) {
    return;
  }

  saveRequestId += 1;

  try {
    if (typeof window.chatgptFontSettings.saveSettingsSync === "function") {
      const saved = window.chatgptFontSettings.saveSettingsSync(patch);
      if (!isUnloading) {
        render(saved);
      }
    } else {
      window.chatgptFontSettings.saveSettings(patch).catch((error) => {
        console.error("Could not save settings", error);
      });
    }
  } catch (error) {
    console.error("Could not save settings", error);
  }
}

function save(patch, options = {}) {
  if (isHydrating) {
    return;
  }

  pendingPatch = { ...pendingPatch, ...patch };

  if (options.immediate) {
    flushSave();
    return;
  }

  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(flushSave, SAVE_DEBOUNCE_MS);
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
  save({ applyToCode: els.applyToCode.checked }, { immediate: true });
});

els.globalShortcutEnabled.addEventListener("change", () => {
  save({ globalShortcutEnabled: els.globalShortcutEnabled.checked }, { immediate: true });
});

els.theme.addEventListener("change", () => {
  save({ theme: els.theme.value }, { immediate: true });
});

els.openChatGPT.addEventListener("click", () => {
  window.chatgptFontSettings.openChatGPT();
});

els.reset.addEventListener("click", async () => {
  pendingPatch = {};
  window.clearTimeout(saveTimer);
  saveTimer = null;
  saveRequestId += 1;
  render(await window.chatgptFontSettings.resetSettings());
});

window.addEventListener("beforeunload", () => {
  isUnloading = true;
  flushSaveSync();
});

window.chatgptFontSettings.getSettings().then(render);
