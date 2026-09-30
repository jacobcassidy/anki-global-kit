const savedSettings = globalThis.ankiGlobalKitSettings || {};

export const settings = {
  questionInputMarkdownHotkeys: savedSettings.question_input_markdown_hotkeys !== false,
  questionInputTabIndentation: savedSettings.question_input_tab_indentation !== false,
  answerOutputMarkdownRendering: savedSettings.answer_output_markdown_rendering !== false,
  answerOutputSyntaxHighlighting: savedSettings.answer_output_syntax_highlighting !== false,
  editorInlineCodeHotkey: savedSettings.card_inline_code_hotkey !== false,
  editorInlineCodeButton: savedSettings.card_inline_code_button !== false,
  editorTabIndentation: savedSettings.card_tab_indentation !== false,
};
