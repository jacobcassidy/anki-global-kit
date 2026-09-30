const defaults = {
  anki_editor_inline_code_hotkey: true,
  anki_editor_inline_code_shortcut: 'Ctrl+Shift+C',
  anki_editor_tab_indentation: true,
  anki_editor_inline_code_button: true,
  anki_editor_normalize_code_spaces: true,
  anki_editor_copy_source_html: true,
  anki_editor_paste_cleanup: true,
};

export function getEditorSettings() {
  return Object.assign(defaults, globalThis.ankiGlobalKitEditorSettings || {});
}
