import { isAnkiDroid } from '../runtime/platform.js';
import { state } from '../runtime/state.js';
import { hasVisibleContent } from '../helpers/dom.js';
import { showBonusQuestion, showTypeHint } from './type-hints.js';
import { getRenderedAnswerText, diffAnswerCharacters } from './answer-comparison.js';
import { markdownToHtml } from '../markdown/render.js';
import { settings } from '../runtime/settings.js';

/**
 * Display .answer-containers that contain visible content.
 */
export function showAnswerContainers() {
  const answerContainers = document.querySelectorAll('.answer-container');
  if (answerContainers.length < 1) return;

  answerContainers.forEach((answerContainer, answerContainerIndex) => {
    // Keep the existing result when initialization runs again on the same card.
    // TODO - FIND WHERE THIS CLASS WAS REMOVED FROM SOURCE
    if (answerContainer.querySelector('.output-comparison-container')) return;

    const referenceAnswer = answerContainer.querySelector('.reference-answer .content');
    const referenceClozes = referenceAnswer.querySelectorAll('.cloze');
    const userAnswer = answerContainer.querySelector('.user-answer .content');
    const hasCompare = userAnswer.getAttribute('data-compare');
    const bonusQuestion = answerContainer.querySelector('.is-bonus .question');
    const typeHint = answerContainer.querySelector('.type-hint');

    showBonusQuestion(bonusQuestion);
    showTypeHint(typeHint);

    // Show primary .answer-container by default.
    if (answerContainer.classList.contains('is-primary')) answerContainer.classList.add('active');

    // Show bonus answer container if it has question content.
    if (hasVisibleContent(bonusQuestion)) answerContainer.classList.add('active');

    // For cloze answers, remove all text except the active cloze(s).
    if (referenceClozes.length !== 0) {
      let clozeArr = [];
      referenceClozes.forEach((cloze) => {
        clozeArr.push(cloze.innerText);
      });
      referenceAnswer.innerText = clozeArr.join(', ');
    }

    // Run comparison when compare field is active
    if (hasCompare && hasCompare !== '') {
      const cardAnswer = getRenderedAnswerText(referenceAnswer).replace(/\u00a0/g, ' ');

      // Hide answer cols when comparison is active.
      answerContainer.classList.add('has-comparison');

      // Create a comparison element if it doesn't exist.
      const comparisonContainerEl = document.createElement('div');
      const comparisonTitleEl = document.createElement('div');
      const comparisonPreEl = document.createElement('pre');

      comparisonContainerEl.classList.add('box', 'has-comparison');
      comparisonTitleEl.classList.add('title');
      comparisonPreEl.classList.add('comparison');

      if (answerContainer.classList.contains('is-primary')) {
        comparisonTitleEl.innerHTML = 'Answer Comparison';
      } else {
        comparisonTitleEl.innerHTML = 'Bonus Answer Comparison';
      }

      // Don't compare user's answer to card's answer if the user did NOT input an answer.
      if (
        (isAnkiDroid && sessionStorage === undefined) ||
        (isAnkiDroid && sessionStorage[answerContainerIndex] === undefined) ||
        (!isAnkiDroid && state.outputAnswers === undefined) ||
        (!isAnkiDroid && state.outputAnswers[answerContainerIndex] === undefined)
      ) {
        const cardAnswerCharArr = Array.from(cardAnswer);
        const cardAnswerComparisonArr = [];

        cardAnswerCharArr.forEach((cardAnswerChar) => {
          cardAnswerComparisonArr.push('<span class="typeMissed">' + cardAnswerChar + '</span>');
        });

        comparisonPreEl.innerHTML = '\n&darr;\n' + cardAnswerComparisonArr.join('');

        // Compare user's answer to card's answer when user did input an answer.
      } else {
        let typedAnswer;

        // Get typedAnswer value for AnkiDroid.
        if (isAnkiDroid) {
          // console.log(sessionStorage);
          // console.log(answerContainerIndex);
          typedAnswer = sessionStorage[answerContainerIndex];

          // Get typedAnswer value for AnkiPC, AnkiWeb, or AnkiIOS.
        } else {
          typedAnswer = state.outputAnswers[answerContainerIndex];
        }

        const dmpArr = diffAnswerCharacters(cardAnswer, typedAnswer.replace(/\u00a0/g, ' '));
        const dmpMatchTypeAndCharArr = [];
        const typedComparisonArr = [];
        const cardComparisonArr = [];
        let lastCorrectMatchIndex = 0;

        // Create array of individual characters and their match type
        for (let i = 0; i < dmpArr.length; i++) {
          const dmpMatchType = dmpArr[i][0]; // -1, 0, or 1
          const dmpStr = dmpArr[i][1]; // example: 'plus'
          const dmpCharArr = Array.from(dmpStr); // example: ['p', 'l', 'u', 's']
          dmpCharArr.forEach((dmpChar) => {
            const dmpMatchTypeAndChar = [dmpMatchType, dmpChar]; // example: [-1, 'p']
            dmpMatchTypeAndCharArr.push(dmpMatchTypeAndChar);
          });
        }

        // Container characters depending on their match type and add to respective comparison array.
        for (let i = 0; i < dmpMatchTypeAndCharArr.length; i++) {
          const char = dmpMatchTypeAndCharArr[i][1]; // 'p'
          const charMatchType = dmpMatchTypeAndCharArr[i][0]; // -1, 0, or 1
          let containerTypedChar, containerCardChar;

          // Container characters missed (for card answer).
          if (charMatchType === -1) {
            containerCardChar = '<span class="typeMissed">' + char + '</span>';

            // Container characters correct (for both typed and card answers).
          } else if (charMatchType === 0) {
            // Insert dashes in typed answer if needed to align correct matches to card answer.
            if (typedComparisonArr.length < cardComparisonArr.length) {
              const dashesStr = '<span class="typeBad">-</span>';
              let dashesNeeded = cardComparisonArr.length - typedComparisonArr.length;
              let dashesAdded = 0;

              while (dashesNeeded > dashesAdded) {
                typedComparisonArr.splice(lastCorrectMatchIndex + 1, 0, dashesStr);
                dashesAdded++;
              }
            }

            containerTypedChar = '<span class="typeGood">' + char + '</span>';
            containerCardChar = '<span class="typeGood">' + char + '</span>';
            lastCorrectMatchIndex = typedComparisonArr.length;

            // Container characters wrong (for typed answer).
          } else if (charMatchType === 1) {
            containerTypedChar = '<span class="typeBad">' + char + '</span>';
          }

          // Add characters to comparison arrays.
          if (containerTypedChar !== undefined) {
            typedComparisonArr.push(containerTypedChar);
          }
          if (containerCardChar !== undefined) {
            cardComparisonArr.push(containerCardChar);
          }
        }

        // Render the completed comparison once, after processing all characters.
        comparisonPreEl.innerHTML = typedComparisonArr.join('') + '\n&darr;\n' + cardComparisonArr.join('');
      }

      comparisonContainerEl.append(comparisonTitleEl);
      comparisonContainerEl.append(comparisonPreEl);
      answerContainer.append(comparisonContainerEl);

      // Directly output user's answer if comparison is NOT active.
    } else {
      if (userAnswer && !state.renderedPlainOutputs.has(userAnswer)) {
        if (isAnkiDroid && sessionStorage !== undefined) {
          const answer = sessionStorage[answerContainerIndex] || '';
          userAnswer.innerHTML = settings.cardReviewMarkdownRendering ? markdownToHtml(answer) : escapeText(answer);
          state.renderedPlainOutputs.add(userAnswer);
        } else if (!isAnkiDroid && state.outputAnswers !== undefined) {
          const answer = state.outputAnswers[answerContainerIndex] || '';
          userAnswer.innerHTML = settings.cardReviewMarkdownRendering ? markdownToHtml(answer) : escapeText(answer);
          state.renderedPlainOutputs.add(userAnswer);
        }
      }
    }
  });

  // Clear sessionStorage for next card on AnkiDroid
  if (isAnkiDroid) {
    sessionStorage.clear();
  }
}

function escapeText(text) {
  const escaped = text.replace(/[&<>"']/g, (character) => {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return entities[character];
  });
  return escaped.replace(/\r\n?|\n/g, '<br>');
}
