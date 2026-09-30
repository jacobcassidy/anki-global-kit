import { getSyntaxLanguage, highlightCodeText } from './tokenizer.js';
import { settings } from '../runtime/settings.js';

/** Highlight current and subsequently rendered answer code blocks. */
export function watchSubmittedCodeBlocks() {
  if (!settings.showSyntaxHighlighting) return;

  const highlightCode = (code) => {
    if (!(code instanceof Element) || code.dataset.syntaxHighlighted === 'true') return;
    if (!code.matches('pre > code')) return;

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
    node.querySelectorAll('pre > code').forEach(highlightCode);
  };

  document.querySelectorAll('pre > code').forEach(highlightCode);
  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach(scan));
  }).observe(document.body, { childList: true, subtree: true });
}
