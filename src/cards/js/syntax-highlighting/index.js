import { getSyntaxLanguage, highlightCodeText } from './tokenizer.js';
import { settings } from '../runtime/settings.js';

/** Highlight current and subsequently rendered answer code blocks. */
export function watchSubmittedCodeBlocks() {
  if (!settings.cardReviewSyntaxHighlighting) return;
  const submittedCodeSelector = '.user-answer .content pre > code';

  const highlightCode = (code) => {
    if (!(code instanceof Element) || code.dataset.syntaxHighlighted === 'true') return;
    if (!code.matches(submittedCodeSelector)) return;

    const topic = document.querySelector('.topic');
    const language = getSyntaxLanguage(topic ? topic.textContent : '');
    if (!language) return;

    code.innerHTML = highlightCodeText(code.textContent, language);
    code.classList.add('shigeSyntax', `language-${language}`);
    code.dataset.syntaxHighlighted = 'true';
  };

  const scan = (node) => {
    if (!(node instanceof Element)) return;
    highlightCode(node);
    node.querySelectorAll(submittedCodeSelector).forEach(highlightCode);
  };

  document.querySelectorAll(submittedCodeSelector).forEach(highlightCode);
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach(scan));
  }).observe(document.body, { childList: true, subtree: true });
}
