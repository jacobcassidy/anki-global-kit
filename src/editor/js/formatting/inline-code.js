import { getEditorSelection, getFieldInputSelection } from '../helpers/selection.js';
import { getEditorSettings } from '../settings.js';
import { normalizeSpaceBeforeCode, watchInlineCodeSeparator } from './code-spaces.js';

// Inline code formatting action.
export function toggleInlineCode(begin = '<code>', end = '</code>') {
  toggleInlineCode.cancelEntry?.();
  toggleInlineCode.cancelExit?.();
  const selection = getEditorSelection() || getFieldInputSelection();
  if (!selection || !selection.rangeCount) {
    // A completely empty shadow field may have no native caret range.
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    const field = active?.closest?.('anki-editable,[contenteditable="true"]');
    const codes = field?.querySelectorAll('code');
    if (
      codes?.length === 1 &&
      !field.textContent.replace(/[\s\u200b\ufeff]/gu, '') &&
      !field.querySelector('img,hr,input,video,audio,iframe,object,svg,canvas')
    ) {
      codes[0].replaceWith(...Array.from(codes[0].childNodes));
      field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }
    return;
  }
  const range = selection.getRangeAt(0);
  const element = (node) => (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement);
  const field = element(range.startContainer)?.closest('anki-editable, [contenteditable="true"]');
  const codeAt = (node) => element(node)?.closest('code');
  const empty = (fragment) => !fragment.textContent && !fragment.querySelector('br,img,hr,input,video,audio');
  const select = (r) => {
    selection.removeAllRanges();
    selection.addRange(r);
  };
  const changed = () => field?.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

  const emptyCode = (node) =>
    node?.nodeName === 'CODE' &&
    !node.textContent.replace(/[\s\u200b\ufeff]/gu, '') &&
    !node.querySelector('img,hr,input,video,audio,iframe,object,svg,canvas');
  let code = codeAt(range.startContainer);
  // Chromium can represent an empty inline caret at the parent boundary.
  if (!code && range.collapsed && range.startContainer.nodeType === Node.ELEMENT_NODE) {
    const next = range.startContainer.childNodes[range.startOffset];
    const previous = range.startContainer.childNodes[range.startOffset - 1];
    if (emptyCode(next)) code = next;
    else if (emptyCode(previous)) code = previous;
  }
  if (!code && range.collapsed && range.startContainer.nodeType === Node.TEXT_NODE) {
    const text = range.startContainer;
    if (range.startOffset === text.length && emptyCode(text.nextSibling)) code = text.nextSibling;
    else if (range.startOffset === 0 && emptyCode(text.previousSibling)) code = text.previousSibling;
  }
  if (range.collapsed) {
    if (code) {
      if (emptyCode(code)) {
        const container = range.startContainer;
        const offset = range.startOffset;
        const inside = code.contains(container);
        const parent = code.parentNode;
        const index = Array.prototype.indexOf.call(parent.childNodes, code);
        const children = Array.from(code.childNodes);
        code.replaceWith(...children);
        if (inside && container !== code) {
          range.setStart(container, offset);
        } else {
          range.setStart(parent, index + (container === code ? offset : 0));
        }
        range.collapse(true);
        select(range);
        changed();
        return;
      }
      const tail = range.cloneRange();
      tail.setEnd(code, code.childNodes.length);
      if (empty(tail.cloneContents())) {
        // Place the caret at the parent boundary; add no text to the note.
        const outside = code.nextSibling;
        if (outside?.nodeType === Node.TEXT_NODE) {
          range.setStart(outside, 0);
        } else {
          range.setStartAfter(code);
        }
        range.collapse(true);
        select(range);
        armInlineCodeExit(code, selection, select);
        return;
      }
      // A caret inside code toggles the entire element, including spaces.
      const prefix = document.createRange();
      prefix.selectNodeContents(code);
      prefix.setEnd(range.startContainer, range.startOffset);
      const contents = document.createRange();
      contents.selectNodeContents(code);
      toggleInlineCodeWord({ range: contents, offset: prefix.toString().length }, code, selection);
      changed();
      return;
    }
    // A caret inside a word toggles that word without requiring selection.
    // At word boundaries keep the existing empty-code insertion behavior.
    const block = element(range.startContainer)?.closest(
      'div,p,pre,blockquote,li,td,th,h1,h2,h3,h4,h5,h6,anki-editable',
    );
    const word = inlineCodeWordAtCaret(range, block || field, false);
    if (word && word.offset > 0 && (word.offset < word.range.toString().length || word.beforePunctuation)) {
      toggleInlineCodeWord(word, null, selection);
      changed();
      return;
    }
    code = document.createElement('code');
    // A real character keeps Chromium's native typing inside an empty inline element.
    const anchor = document.createTextNode('\u200b');
    code.append(anchor);
    range.insertNode(code);
    if (getEditorSettings().anki_editor_normalize_code_spaces) normalizeSpaceBeforeCode(code);
    range.setStart(anchor, 1);
    range.collapse(true);
    select(range);
    armInlineCodeEntry(anchor);
    changed();
    return;
  }

  // Handle both selection of the element and selection of its text contents.
  if (!code && range.startContainer === range.endContainer && range.endOffset === range.startOffset + 1) {
    const child = range.startContainer.childNodes[range.startOffset];
    if (child?.nodeName === 'CODE') code = child;
  }
  if (code) {
    const contents = document.createRange();
    contents.selectNodeContents(code);
    const before = contents.cloneRange();
    const after = contents.cloneRange();
    const coversStart = range.compareBoundaryPoints(Range.START_TO_START, contents) <= 0;
    const coversEnd = range.compareBoundaryPoints(Range.END_TO_END, contents) >= 0;
    if (!coversStart && code.contains(range.startContainer)) before.setEnd(range.startContainer, range.startOffset);
    if (!coversEnd && code.contains(range.endContainer)) after.setStart(range.endContainer, range.endOffset);
    if ((coversStart || empty(before.cloneContents())) && (coversEnd || empty(after.cloneContents()))) {
      const first = code.firstChild;
      const last = code.lastChild;
      if (first) {
        code.replaceWith(...Array.from(code.childNodes));
        range.setStartBefore(first);
        range.setEndAfter(last);
        select(range);
      } else {
        range.setStartBefore(code);
        range.collapse(true);
        code.remove();
        select(range);
      }
      changed();
    }
    return;
  }

  // Preserve the existing block-aware wrapping behavior for plain selections.
  wrap2.call(this, begin, end);
  changed();
}

// Remove only our temporary caret anchor, before Anki saves the first real edit.
function armInlineCodeEntry(anchor) {
  const root = anchor.getRootNode();
  const controller = new AbortController();
  const options = { capture: true, signal: controller.signal };
  const cancel = () => {
    if (anchor.data.startsWith('\u200b')) anchor.deleteData(0, 1);
    controller.abort();
    if (toggleInlineCode.cancelEntry === cancel) toggleInlineCode.cancelEntry = null;
  };
  toggleInlineCode.cancelEntry = cancel;
  root.addEventListener(
    'input',
    (event) => {
      // Ignore the synthetic input used to announce creation of the code element.
      if (event.inputType || event.isTrusted) cancel();
    },
    options,
  );
  root.addEventListener('focusout', cancel, options);
}

// Chromium otherwise pulls a boundary caret back into the preceding <code>.
// Make code non-editable only during the next native insertion, then restore it.
function armInlineCodeExit(code, selection, select) {
  const root = code.getRootNode();
  if (getEditorSettings().anki_editor_normalize_code_spaces) watchInlineCodeSeparator(code, root);
  const controller = new AbortController();
  const options = { capture: true, signal: controller.signal };
  const original = code.getAttribute('contenteditable');
  let locked = false;
  const restore = () => {
    if (locked) {
      if (original === null) code.removeAttribute('contenteditable');
      else code.setAttribute('contenteditable', original);
      locked = false;
    }
  };
  const cancel = () => {
    restore();
    controller.abort();
    if (toggleInlineCode.cancelExit === cancel) toggleInlineCode.cancelExit = null;
  };
  toggleInlineCode.cancelExit = cancel;
  root.addEventListener('pointerdown', cancel, options);
  root.addEventListener('focusout', cancel, options);
  root.addEventListener(
    'keydown',
    (event) => {
      if (
        [
          'ArrowLeft',
          'ArrowRight',
          'ArrowUp',
          'ArrowDown',
          'Home',
          'End',
          'PageUp',
          'PageDown',
          'Escape',
          'Tab',
          'Backspace',
          'Delete',
        ].includes(event.key)
      )
        cancel();
    },
    options,
  );
  root.addEventListener(
    'beforeinput',
    (event) => {
      if (!event.inputType.startsWith('insert') || !code.isConnected || !selection.rangeCount) {
        cancel();
        return;
      }
      const current = selection.getRangeAt(0);
      const boundary = document.createRange();
      boundary.setStartAfter(code);
      boundary.collapse(true);
      const atBoundary =
        current.collapsed &&
        (current.compareBoundaryPoints(Range.START_TO_START, boundary) === 0 ||
          (current.startContainer === code.nextSibling && current.startOffset === 0));
      let atCodeEnd = false;
      if (current.collapsed && code.contains(current.startContainer)) {
        const tail = current.cloneRange();
        tail.setEnd(code, code.childNodes.length);
        atCodeEnd = !tail.toString() && !tail.cloneContents().querySelector('br,img,hr');
      }
      if (!atBoundary && !atCodeEnd) {
        cancel();
        return;
      }
      locked = true;
      code.setAttribute('contenteditable', 'false');
      select(boundary);
      root.addEventListener('input', cancel, options);
      setTimeout(cancel, 0); // Also restore if another listener cancels the edit.
    },
    options,
  );
}

// Find a token delimited by whitespace or prose punctuation, crossing inline formatting but not blocks.
function inlineCodeWordAtCaret(caret, scope, insideCode) {
  if (!scope) return null;
  const segments = [];
  let text = '',
    position = 0;
  const blocks = 'div,p,pre,blockquote,ul,ol,li,table,h1,h2,h3,h4,h5,h6,br,img,hr';
  function visit(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const start = text.length;
      const probe = document.createRange();
      probe.selectNodeContents(node);
      if (caret.startContainer === node) position = start + caret.startOffset;
      else if (probe.compareBoundaryPoints(Range.END_TO_END, caret) <= 0) position = start + node.length;
      segments.push({ node, start, end: start + node.length });
      text += node.data;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (
        node !== scope &&
        (node.matches(blocks) || (!insideCode && node.matches('code')) || node.contentEditable === 'false')
      ) {
        text += ' ';
        return;
      }
      for (const child of node.childNodes) visit(child);
    }
  }
  visit(scope);
  let start = position,
    end = position;
  while (start > 0 && !/[\s,.:;?]/u.test(text[start - 1])) start--;
  while (end < text.length && !/[\s,.:;?]/u.test(text[end])) end++;
  if (start === end) return null;
  const first = segments.find((s) => s.start <= start && s.end > start);
  const last = segments.find((s) => s.start < end && s.end >= end);
  if (!first || !last) return null;
  const range = document.createRange();
  range.setStart(first.node, start - first.start);
  range.setEnd(last.node, end - last.start);
  return { range, offset: position - start, beforePunctuation: position === end && /[,.:;?]/u.test(text[end] || '') };
}

function toggleInlineCodeWord(word, code, selection) {
  const range = word.range;
  let fragment;
  if (code) {
    const before = document.createRange();
    before.selectNodeContents(code);
    before.setEnd(range.startContainer, range.startOffset);
    const after = document.createRange();
    after.selectNodeContents(code);
    after.setStart(range.endContainer, range.endOffset);
    const left = code.cloneNode(false),
      right = code.cloneNode(false);
    left.append(before.cloneContents());
    right.append(after.cloneContents());
    fragment = range.cloneContents();
    // Also remove old nested code wrappers within this token.
    for (const nested of Array.from(fragment.querySelectorAll('code')).reverse())
      nested.replaceWith(...nested.childNodes);
    const replacement = document.createDocumentFragment();
    if (left.textContent || left.querySelector('br,img,hr,input,video,audio')) replacement.append(left);
    const nodes = Array.from(fragment.childNodes);
    replacement.append(fragment);
    if (right.textContent || right.querySelector('br,img,hr,input,video,audio')) replacement.append(right);
    code.replaceWith(replacement);
    restore(nodes);
  } else {
    const wrapper = document.createElement('code');
    wrapper.append(range.extractContents());
    range.insertNode(wrapper);
    restore(Array.from(wrapper.childNodes));
  }
  function restore(nodes) {
    let remaining = word.offset;
    const texts = [];
    function collect(node) {
      if (node.nodeType === Node.TEXT_NODE) texts.push(node);
      else for (const child of node.childNodes) collect(child);
    }
    nodes.forEach(collect);
    for (const node of texts) {
      if (remaining <= node.length) {
        const caret = document.createRange();
        caret.setStart(node, remaining);
        caret.collapse(true);
        selection.removeAllRanges();
        selection.addRange(caret);
        return;
      }
      remaining -= node.length;
    }
  }
}

// Block-aware wrapping adapted from Wrapper meta-addon and Anki PR #3038.
function wrap2(begin, end) {
  const { node: base } = this;
  const selection = getEditorSelection() || getFieldInputSelection();
  const range = selection.getRangeAt(0);
  if (!range) {
    return;
  }

  // Inline code must stay inside the selected block, even at its edges.
  // Keep the original range instead of expanding it around the parent div.
  if (begin === '<code>' && end === '</code>' && !range.collapsed) {
    const preview = range.cloneContents();
    const blocks = 'div,p,pre,blockquote,ul,ol,li,table,h1,h2,h3,h4,h5,h6';
    if (!preview.querySelector(blocks)) {
      const code = document.createElement('code');
      code.appendChild(range.extractContents());
      range.insertNode(code);
      range.selectNodeContents(code);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
  }

  let startParent = range.startContainer.parentNode;
  if (
    startParent !== base &&
    startParent.tagName !== 'ANKI-EDITABLE' &&
    startParent?.firstChild === range.startContainer &&
    range.startOffset === 0
  ) {
    range.setStartBefore(startParent);
  }

  let endParent = range.endContainer.parentNode;
  if (
    endParent !== base &&
    endParent.tagName !== 'ANKI-EDITABLE' &&
    endParent?.lastChild === range.endContainer &&
    ((range.endContainer.nodeType !== Node.ELEMENT_NODE &&
      range.endOffset === range.endContainer.textContent?.length) ||
      (range.endContainer.nodeType === Node.ELEMENT_NODE && range.endOffset === range.endContainer.childNodes.length))
  ) {
    range.setEndAfter(endParent);
  }
  let expand;
  do {
    expand = false;
    if (startParent instanceof ShadowRoot || endParent instanceof ShadowRoot) {
      break;
    }

    if (
      startParent &&
      startParent.parentNode !== base &&
      startParent.parentNode.tagName !== 'ANKI-EDITABLE' &&
      startParent.parentNode?.firstChild === startParent &&
      range.isPointInRange(startParent.parentNode, startParent.parentNode?.childNodes.length)
    ) {
      startParent = startParent.parentNode;
      range.setStartBefore(startParent);
      expand = true;
    }
    if (
      endParent &&
      endParent.parentNode !== base &&
      endParent.parentNode.tagName !== 'ANKI-EDITABLE' &&
      endParent.parentNode?.lastChild === endParent &&
      range.isPointInRange(endParent.parentNode, 0)
    ) {
      endParent = endParent.parentNode;
      range.setEndAfter(endParent);
      expand = true;
    }
    if (range.endOffset === 0 && range.endContainer.tagName !== 'ANKI-EDITABLE') {
      range.setEndBefore(range.endContainer);
      expand = true;
    }
  } while (expand);

  const fragment = range.extractContents();
  if (fragment.childNodes.length === 0) {
    document.execCommand('inserthtml', false, begin + end);
  } else {
    const div = document.createElement('div');
    for (const node of Array.from(fragment.childNodes)) {
      div.appendChild(node);
    }
    div.innerHTML = begin + div.innerHTML + end;
    for (const node of div.childNodes) {
      range.insertNode(node);
    }
  }
}
