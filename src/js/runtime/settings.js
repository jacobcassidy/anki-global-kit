const savedSettings = globalThis.ankiGlobalKitSettings || {};

export const settings = {
  showSyntaxHighlighting: savedSettings.show_syntax_highlighting !== false,
  useMarkdownFormatting: savedSettings.use_markdown_formatting !== false,
  inlineCodeEditor: savedSettings.inline_code_editor !== false,
};
