import { watchCardChanges } from '../helpers/watch.js';
import { showQuestionContainers } from '../display/questions.js';
import { focusFirstInput } from '../inputs/focus.js';
import { watchQuestionInputs } from '../inputs/setup.js';
import { showAnswerContainers } from '../display/answers.js';
import { showNoteContainers } from '../display/notes.js';
import { modifyAnkiWeb } from '../integrations/ankiweb.js';
import { watchSubmittedCodeBlocks } from '../syntax-highlighting/index.js';

function runFunctions() {
  showQuestionContainers();
  focusFirstInput();
  watchQuestionInputs();
  showAnswerContainers();
  showNoteContainers();
  modifyAnkiWeb();
}

/** Start card features and observe subsequent Anki card changes. */
export function initializeGlobalKit() {
  watchCardChanges(runFunctions);
  watchSubmittedCodeBlocks();
}
