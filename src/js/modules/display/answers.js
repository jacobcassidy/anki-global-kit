import { isAnkiDroid } from '../runtime/platform.js';
import { state } from '../runtime/state.js';
import { hasVisibleContent } from '../helpers/dom.js';
import { showBonusQuestion, showTypeHint } from './type-hints.js';
import { getRenderedAnswerText, diffAnswerCharacters } from './answer-comparison.js';
import { markdownToHtml } from '../markdown/render.js';

/**
 * Display .output-containers that contain visible content.
 */
export function showOutputContainers() {
  const outputContainers = document.querySelectorAll('.output-container');
  if (outputContainers.length < 1) return;

  outputContainers.forEach((outputContainer, outputIndex) => {
    // Keep the existing result when initialization runs again on the same card.
    if (outputContainer.querySelector('.output-comparison-container')) return;

    const answerReference = outputContainer.querySelector('.answer-reference');
    const outputClozes = answerReference.querySelectorAll('.cloze');
    const outputAnswer = outputContainer.querySelector('.answer-submitted');
    const hasCompare = outputAnswer.getAttribute('data-compare');
    const bonusQuestion = outputContainer.querySelector('.is-bonus .question');
    const typeHint = outputContainer.querySelector('.type-hint');

    showBonusQuestion(bonusQuestion);
    showTypeHint(typeHint);

    // Show primary .output-container by default.
    if (outputContainer.classList.contains('is-primary')) outputContainer.classList.add('active');

    // Show bonus output container if it has question content.
    if (hasVisibleContent(bonusQuestion)) outputContainer.classList.add('active');

    // For cloze answers, remove all text except the active cloze(s).
    if (outputClozes.length !== 0) {
      let clozeArr = [];
      outputClozes.forEach((cloze) => {
        clozeArr.push(cloze.innerText);
      });
      answerReference.innerText = clozeArr.join(', ');
    }

    // Run comparison when compare field is active
    if (hasCompare && hasCompare !== '') {
      const cardAnswer = getRenderedAnswerText(answerReference).replace(/\u00a0/g, ' ');

      // Hide output-cols when comparison is active.
      outputContainer.classList.add('has-comparison');

      // Create a comparison element if it doesn't exist.
      const comparisonContainerEl = document.createElement('div');
      const comparisonTitleEl = document.createElement('div');
      const comparisonPreEl = document.createElement('pre');

      comparisonContainerEl.classList.add('box', 'has-comparison');
      comparisonTitleEl.classList.add('title');
      comparisonPreEl.classList.add('comparison');

      if (outputContainer.classList.contains('is-primary')) {
        comparisonTitleEl.innerHTML = 'Answer Comparison';
      } else {
        comparisonTitleEl.innerHTML = 'Bonus Answer Comparison';
      }

      // Don't compare user's answer to card's answer if the user did NOT input an answer.
      if (
        (isAnkiDroid && sessionStorage === undefined) ||
        (isAnkiDroid && sessionStorage[outputIndex] === undefined) ||
        (!isAnkiDroid && state.outputAnswers === undefined) ||
        (!isAnkiDroid && state.outputAnswers[outputIndex] === undefined)
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
          // console.log(outputIndex);
          typedAnswer = sessionStorage[outputIndex];

          // Get typedAnswer value for AnkiPC, AnkiWeb, or AnkiIOS.
        } else {
          typedAnswer = state.outputAnswers[outputIndex];
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
      outputContainer.append(comparisonContainerEl);

      // Directly output user's answer if comparison is NOT active.
    } else {
      if (outputAnswer && !state.renderedPlainOutputs.has(outputAnswer)) {
        if (isAnkiDroid && sessionStorage !== undefined) {
          outputAnswer.innerHTML = markdownToHtml(sessionStorage[outputIndex] || '');
          state.renderedPlainOutputs.add(outputAnswer);
        } else if (!isAnkiDroid && state.outputAnswers !== undefined) {
          outputAnswer.innerHTML = markdownToHtml(state.outputAnswers[outputIndex] || '');
          state.renderedPlainOutputs.add(outputAnswer);
        }
      }
    }
  });

  // Clear sessionStorage for next card on AnkiDroid
  if (isAnkiDroid) {
    sessionStorage.clear();
  }
}
