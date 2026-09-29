import { watchCardChanges } from '../helpers/watch.js';
import { showInputContainers } from '../display/questions.js';
import { focusFirstInput } from '../inputs/focus.js';
import { watchAnswerInputs } from '../inputs/setup.js';
import { showOutputContainers } from '../display/answers.js';
import { showNotes } from '../display/notes.js';
import { modifyAnkiWeb } from '../integrations/ankiweb.js';
import { watchSubmittedCodeBlocks } from '../syntax-highlighting/index.js';

function runFunctions() {
  showInputContainers();
  focusFirstInput();
  watchAnswerInputs();
  showOutputContainers();
  showNotes();
  modifyAnkiWeb();
}

/** Start card features and observe subsequent Anki card changes. */
export function initializeGlobalKit() {
  watchCardChanges(runFunctions);
  watchSubmittedCodeBlocks();
}
