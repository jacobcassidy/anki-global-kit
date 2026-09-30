import { hasVisibleContent } from '../helpers/dom.js';
import { addComparisonStyle, showBonusQuestion, showTypeHint } from './type-hints.js';

/**
 * Display a .question-container that contains visible content.
 */
export function showQuestionContainers() {
  const questionContainers = document.querySelectorAll('.question-container');
  if (questionContainers.length < 1) return;

  questionContainers.forEach((questionContainer) => {
    const textarea = questionContainer.querySelector('textarea');
    const bonusQuestion = questionContainer.querySelector('.is-bonus .question');
    const typeHint = questionContainer.querySelector('.type-hint');

    showBonusQuestion(bonusQuestion);
    showTypeHint(typeHint);
    addComparisonStyle(textarea);

    // Show primary question container by default.
    if (questionContainer.classList.contains('is-primary')) questionContainer.classList.add('active');

    // Show bonus question container if it has question content.
    if (hasVisibleContent(bonusQuestion)) questionContainer.classList.add('active');
  });
}
