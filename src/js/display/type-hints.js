import { hasVisibleContent } from '../helpers/dom.js';

export function addComparisonStyle(textarea) {
  const textareaDataCompare = textarea.getAttribute('data-compare');
  if (textareaDataCompare) textarea.classList.add('is-comparison');
}

/**
 * Show bonus question if it contains visible content.
 */
export function showBonusQuestion(bonusQuestion) {
  if (!bonusQuestion) return;
  if (hasVisibleContent(bonusQuestion)) bonusQuestion.classList.add('active');
}

/**
 * Show type hint if it contains visible content.
 */
export function showTypeHint(typeHint) {
  if (!typeHint) return;
  if (hasVisibleContent(typeHint)) typeHint.classList.add('active');
}
