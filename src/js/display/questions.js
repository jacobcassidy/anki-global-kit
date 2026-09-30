import { hasVisibleContent } from '../helpers/dom.js';
import { addComparisonStyle, showBonusQuestion, showTypeHint } from './type-hints.js';

/**
 * Display a .question-container that contains visible content.
 */
export function showInputContainers() {
  const inputContainers = document.querySelectorAll('.question-container');
  if (inputContainers.length < 1) return;

  inputContainers.forEach((inputContainer) => {
    const textarea = inputContainer.querySelector('textarea');
    const bonusQuestion = inputContainer.querySelector('.is-bonus .question');
    const typeHint = inputContainer.querySelector('.type-hint');

    showBonusQuestion(bonusQuestion);
    showTypeHint(typeHint);
    addComparisonStyle(textarea);

    // Show primary input container by default.
    if (inputContainer.classList.contains('is-primary')) inputContainer.classList.add('active');

    // Show bonus input container if it has question content.
    if (hasVisibleContent(bonusQuestion)) inputContainer.classList.add('active');
  });
}
