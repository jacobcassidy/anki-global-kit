const savedSettings = globalThis.ankiGlobalKitSettings || {};

export const settings = {
  cardInputMarkdownHotkeys: savedSettings.card_input_markdown_hotkeys !== false,
  cardInputTabIndentation: savedSettings.card_input_tab_indentation !== false,
  cardReviewMarkdownRendering: savedSettings.card_review_markdown_rendering !== false,
  cardReviewSyntaxHighlighting: savedSettings.card_review_syntax_highlighting !== false,
  editorInlineCodeHotkey: savedSettings.card_inline_code_hotkey !== false,
  editorInlineCodeButton: savedSettings.card_inline_code_button !== false,
  editorTabIndentation: savedSettings.card_tab_indentation !== false,
};
