const savedSettings = globalThis.ankiGlobalKitSettings || {};

export const settings = {
  cardInputMarkdownHotkeys: savedSettings.card_input_markdown_hotkeys !== false,
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
