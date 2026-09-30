// Resolve both text and element-boundary carets, including Anki's shadow fields.
export function getFieldInputSelection() {
  let active = document.activeElement;
  let focusedSelection = null;
  while (active?.shadowRoot) {
    const root = active.shadowRoot;
    const selection = root.getSelection?.();
    if (selection?.rangeCount && selection.focusNode) focusedSelection = selection;
    active = root.activeElement;
  }
  if (focusedSelection) return focusedSelection;
  const selection = window.getSelection();
  if (!selection?.rangeCount || !selection.focusNode) return null;
  const node = selection.focusNode;
  const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  if (element?.closest('anki-editable,[contenteditable="true"]')) return selection;
  return null;
}

// Toolbar activation can move focus outside the field's shadow root. Remember
// the field itself so its native selection remains reachable from the button.
let lastEditorField = null;
export function installSelectionTracking() {
  if (installSelectionTracking.installed) return;
  installSelectionTracking.installed = true;
  document.addEventListener(
    'focusin',
    (event) => {
      const field = event.composedPath().find((node) => node?.matches?.('anki-editable'));
      if (field) lastEditorField = field;
    },
    true,
  );
}

export function getEditorSelection() {
  const current = getFieldInputSelection();
  if (current?.rangeCount) return current;
  if (!lastEditorField?.isConnected) return null;
  const selection = lastEditorField.getRootNode().getSelection?.();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  return lastEditorField.contains(range.startContainer) && lastEditorField.contains(range.endContainer)
    ? selection
    : null;
}
