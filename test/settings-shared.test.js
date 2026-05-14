const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_SETTINGS,
  normalizeSettings,
  buildStyleVariableMap,
  isAllowedChatGptUrl
} = require("../electron/settings-shared");

test("normalizeSettings keeps legacy fontSize values and clamps ranges", () => {
  const settings = normalizeSettings({
    fontSize: 99,
    lineHeight: "0.8",
    theme: "unknown",
    globalShortcutEnabled: false
  });

  assert.equal(settings.userFontSize, 32);
  assert.equal(settings.assistantFontSize, 36);
  assert.equal(settings.lineHeight, 1.1);
  assert.equal(settings.theme, DEFAULT_SETTINGS.theme);
  assert.equal(settings.globalShortcutEnabled, false);
});

test("normalizeSettings strips CSS-breaking font-family characters", () => {
  const settings = normalizeSettings({
    userFontFamily: "Georgia; color: red",
    assistantFontFamily: "Times <script>"
  });

  assert.equal(settings.userFontFamily, "Georgia color: red");
  assert.equal(settings.assistantFontFamily, "Times script");
});

test("buildStyleVariableMap derives font and theme values from one settings object", () => {
  const vars = buildStyleVariableMap({
    theme: "dark",
    assistantFontSize: 18,
    lineHeight: 1.9
  });

  assert.equal(vars["color-scheme"], "dark");
  assert.equal(vars["--chatgpt-font-controls-assistant-size"], "18px");
  assert.equal(vars["--chatgpt-font-controls-line-height"], 1.9);
  assert.equal(vars["--chatgpt-font-controls-assistant-weight"], 360);
  assert.equal(vars["--chatgpt-theme-page"], "#1f1f1e");
});

test("isAllowedChatGptUrl only allows exact ChatGPT hostnames over HTTPS", () => {
  assert.equal(isAllowedChatGptUrl("https://chatgpt.com/"), true);
  assert.equal(isAllowedChatGptUrl("https://chat.openai.com/c/foo"), true);
  assert.equal(isAllowedChatGptUrl("http://chatgpt.com/"), false);
  assert.equal(isAllowedChatGptUrl("https://chatgpt.com.evil.example/"), false);
  assert.equal(isAllowedChatGptUrl("https://example.com/"), false);
  assert.equal(isAllowedChatGptUrl("not a url"), false);
});
