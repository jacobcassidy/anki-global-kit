const savedSettings = globalThis.ankiGlobalKitSettings || {};

export const settings = {
  cardInputMarkdownShortcuts: savedSettings.card_input_markdown_shortcuts !== false,
  cardInputMarkdownShortcutsMap: {
    bold:
      savedSettings.card_input_markdown_bold_shortcut_enabled !== false
        ? (savedSettings.card_input_markdown_bold_shortcut ?? 'Primary+B')
        : '',
    italic:
      savedSettings.card_input_markdown_italic_shortcut_enabled !== false
        ? (savedSettings.card_input_markdown_italic_shortcut ?? 'Primary+I')
        : '',
    strikethrough:
      savedSettings.card_input_markdown_strikethrough_shortcut_enabled !== false
        ? (savedSettings.card_input_markdown_strikethrough_shortcut ?? 'Primary+Shift+X')
        : '',
    inlineCode:
      savedSettings.card_input_markdown_inline_code_shortcut_enabled !== false
        ? (savedSettings.card_input_markdown_inline_code_shortcut ?? 'Primary+Shift+C')
        : '',
    codeBlock:
      savedSettings.card_input_markdown_code_block_shortcut_enabled !== false
        ? (savedSettings.card_input_markdown_code_block_shortcut ?? 'CodeBlock+C')
        : '',
    unorderedList:
      savedSettings.card_input_markdown_unordered_list_shortcut_enabled === true
        ? (savedSettings.card_input_markdown_unordered_list_shortcut ?? '')
        : '',
    orderedList:
      savedSettings.card_input_markdown_ordered_list_shortcut_enabled === true
        ? (savedSettings.card_input_markdown_ordered_list_shortcut ?? '')
        : '',
    blockquote:
      savedSettings.card_input_markdown_blockquote_shortcut_enabled === true
        ? (savedSettings.card_input_markdown_blockquote_shortcut ?? '')
        : '',
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
