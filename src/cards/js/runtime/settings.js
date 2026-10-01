const savedSettings = globalThis.ankiGlobalKitSettings || {};

export const settings = {
  cardInputMarkdownHotkeys: savedSettings.card_input_markdown_hotkeys !== false,
  cardInputMarkdownHotkeysMap: {
    bold: savedSettings.card_input_markdown_bold_hotkey ?? 'Primary+B',
    italic: savedSettings.card_input_markdown_italic_hotkey ?? 'Primary+I',
    strikethrough: savedSettings.card_input_markdown_strikethrough_hotkey ?? 'Primary+Shift+X',
    inlineCode: savedSettings.card_input_markdown_inline_code_hotkey ?? 'Primary+Shift+C',
    codeBlock: savedSettings.card_input_markdown_code_block_hotkey ?? 'CodeBlock+C',
    unorderedList: savedSettings.card_input_markdown_unordered_list_hotkey ?? '',
    orderedList: savedSettings.card_input_markdown_ordered_list_hotkey ?? '',
    blockquote: savedSettings.card_input_markdown_blockquote_hotkey ?? '',
  },
  cardInputTabIndentation: savedSettings.card_input_tab_indentation !== false,
  cardReviewMarkdownRendering: savedSettings.card_review_markdown_rendering !== false,
  cardReviewSyntaxHighlighting: savedSettings.card_review_syntax_highlighting !== false,
  cardToolbarEnabled: savedSettings.card_toolbar_enabled !== false,
  cardToolbarBold: savedSettings.card_toolbar_bold !== false,
  cardToolbarItalic: savedSettings.card_toolbar_italic !== false,
  cardToolbarStrikethrough: savedSettings.card_toolbar_strikethrough !== false,
  cardToolbarCodeBlock: savedSettings.card_toolbar_code_block !== false,
  cardToolbarInlineCode: savedSettings.card_toolbar_inline_code !== false,
  cardToolbarUnorderedList: savedSettings.card_toolbar_unordered_list !== false,
  cardToolbarOrderedList: savedSettings.card_toolbar_ordered_list !== false,
  cardToolbarBlockquote: savedSettings.card_toolbar_blockquote !== false,
};
