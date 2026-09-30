const savedSettings = globalThis.ankiGlobalKitSettings || {};

export const settings = {
  questionInputMarkdownHotkeys: savedSettings.question_input_markdown_hotkeys !== false,
  questionInputTabIndentation: savedSettings.question_input_tab_indentation !== false,
  answerOutputMarkdownRendering: savedSettings.answer_output_markdown_rendering !== false,
  answerOutputSyntaxHighlighting: savedSettings.answer_output_syntax_highlighting !== false,
  editorInlineCodeHotkey: savedSettings.editor_inline_code_hotkey !== false,
  editorInlineCodeButton: savedSettings.editor_inline_code_button !== false,
  editorTabIndentation: savedSettings.editor_tab_indentation !== false,
};
