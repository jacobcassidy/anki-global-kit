import { isAnkiDroid, isAnkiPC, isAnkiWeb } from '../runtime/platform.js';
import { state } from '../runtime/state.js';
import { handleMarkdownHotkeys } from './markdown-shortcuts.js';
import { handleTabIndentation } from './tab-navigation.js';

/**
 * Watch question textareas and connect their editing and submission handlers.
 */
export function watchQuestionInputs() {
  const questionInputs = document.querySelectorAll('.question-input');
  if (questionInputs.length < 1) return;

  state.outputAnswers = Array.from(questionInputs, (questionInput) => questionInput.value);

  questionInputs.forEach((questionInput, inputIndex) => {
    if (state.boundInputs.has(questionInput)) return;
    state.boundInputs.add(questionInput);

    questionInput.addEventListener('keydown', (event) => {
      if (handleMarkdownHotkeys(questionInput, event)) return;
      handleTabIndentation(questionInput, event);
    });

    handleQuestionInputSubmission(questionInput, inputIndex);
  });
}

/**
 * Track an answer textarea's value and submit it with `CTRL + ENTER`.
 */
export function handleQuestionInputSubmission(questionInput, inputIndex) {
  questionInput.addEventListener('input', (event) => {
    const inputValue = event.currentTarget.value;

    // Store input data on AnkiDroid
    if (isAnkiDroid) {
      try {
        sessionStorage.setItem(inputIndex, inputValue);
      } catch (error) {
        console.log(`${error.name}: ${error.message}`);
      }
      // Store input data on AnkiPC, AnkiWeb, & AnkiIOS
    } else {
      state.outputAnswers.splice(inputIndex, 1, inputValue);
    }
  });

  // Return data on AnkiPC keypress.
  if (isAnkiPC) {
    questionInput.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === 'Enter') globalThis.pycmd('ans');
    });

    // Return data on AnkiWeb keypress.
  } else if (isAnkiWeb) {
    questionInput.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        globalThis.study.drawAnswer();
      }
    });
  }
}
