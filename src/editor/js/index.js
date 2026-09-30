import { getEditorSelection, installSelectionTracking } from './helpers/selection.js';
import { installCodeSpaceNormalization } from './formatting/code-spaces.js';
import { toggleInlineCode } from './formatting/inline-code.js';
import { installCopySource } from './clipboard/copy-source.js';
import { installClozeShortcuts } from './cloze/shortcuts.js';
import { beginPasteLayout, finishPasteLayout } from './paste/layout.js';

if (!globalThis.ankiGlobalKitEditor) {
  installSelectionTracking();
  installCodeSpaceNormalization();
  installCopySource();
  installClozeShortcuts();
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Tab' || event.shiftKey || !globalThis.ankiGlobalKitEditorSettings?.anki_editor_tab_indentation)
        return;
      const field = event.composedPath().find((node) => node?.matches?.('anki-editable, [contenteditable="true"]'));
      if (!field) return;
      event.preventDefault();
      document.execCommand('insertText', false, '    ');
    },
    true,
  );

  globalThis.ankiGlobalKitEditor = {
    toggleInlineCode() {
      return toggleInlineCode.call({ node: getEditorSelection()?.focusNode }, '<code>', '</code>');
    },
    beginPasteLayout,
    finishPasteLayout,
  };
}
