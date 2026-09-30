import { getEditorSelection, getFieldInputSelection } from '../helpers/selection.js';

// Chromium drops the last list newline during insertHTML. Restore it only in
// newly pasted lists, after insertion, without rewriting the field or its caret.
let pendingPasteLayout = null;
export function beginPasteLayout() {
  pendingPasteLayout = null;
  const selection = getEditorSelection() || getFieldInputSelection();
  const node = selection?.focusNode;
  const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  const field = element?.closest('anki-editable, [contenteditable="true"]');
  if (field) pendingPasteLayout = { field, existing: new Set(field.querySelectorAll('ul, ol')) };
}

export function finishPasteLayout() {
  const pending = pendingPasteLayout;
  pendingPasteLayout = null;
  if (!pending?.field.isConnected) return;
  const { field, existing } = pending;
  let changed = false;
  for (const list of field.querySelectorAll('ul, ol')) {
    if (existing.has(list)) continue;
    let protectedRegion = false;
    for (let parent = list; parent && parent !== field; parent = parent.parentElement) {
      if (
        parent.matches('pre, code, textarea, svg, math') ||
        /^(pre|pre-wrap|pre-line|break-spaces)$/.test(parent.style.whiteSpace)
      ) {
        protectedRegion = true;
        break;
      }
    }
    if (protectedRegion) continue;
    // Mirror an opening line break; leave compact lists and nested wrapper
    // lists alone. Explicit BRs and content-bearing text are also untouched.
    const first = list.firstChild;
    if (first?.nodeType !== Node.TEXT_NODE || !/^[\t\r\n ]*\n[\t\r\n ]*$/.test(first.data)) continue;
    const last = list.lastChild;
    if (last?.nodeType === Node.ELEMENT_NODE && last.matches('li')) {
      list.append(document.createTextNode('\n'));
      changed = true;
    } else if (
      last?.nodeType === Node.TEXT_NODE &&
      /^[\t\r ]*$/.test(last.data) &&
      last.previousSibling?.nodeName === 'LI'
    ) {
      last.data = '\n';
      changed = true;
    }
  }
  if (changed) field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
}
