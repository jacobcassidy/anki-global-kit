import { isAnkiDroid, isAnkiPC, isAnkiWeb } from '../runtime/platform.js';
import { state } from '../runtime/state.js';
import { handleMarkdownShortcuts, toggleMarkdownBlock, toggleMarkdownFormatting } from './markdown-shortcuts.js';
import { handleTabIndentation } from './tab-navigation.js';
import { settings } from '../runtime/settings.js';
import boldIcon from '../../../../addon/desktop/shared/assets/bold.svg';
import italicIcon from '../../../../addon/desktop/shared/assets/italic.svg';
import strikethroughIcon from '../../../../addon/desktop/shared/assets/strikethrough.svg';
import codeBlockIcon from '../../../../addon/desktop/shared/assets/code-block.svg';
import inlineCodeIcon from '../../../../addon/desktop/shared/assets/inline-code-new.svg';
import unorderedListIcon from '../../../../addon/desktop/shared/assets/unordered-list.svg';
import orderedListIcon from '../../../../addon/desktop/shared/assets/ordered-list.svg';
import blockquoteIcon from '../../../../addon/desktop/shared/assets/blockquote.svg';

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
      if (
        handleMarkdownShortcuts(questionInput, event, {
          markdownEnabled: settings.cardInputMarkdownShortcuts,
          shortcuts: settings.cardInputMarkdownShortcutsMap,
        })
      )
        return;
      if (settings.cardInputTabIndentation) {
        handleTabIndentation(questionInput, event);
      }
    });

    if (settings.cardToolbarEnabled) addFormattingToolbar(questionInput);

    handleQuestionInputSubmission(questionInput, inputIndex);
  });
}

function addFormattingToolbar(textarea) {
  const toolbar = document.createElement('div');
  toolbar.className = 'card-formatting-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Markdown formatting');

  const shortcuts = settings.cardInputMarkdownShortcutsMap;
  const formatShortcut = (shortcut) => {
    if (!shortcut) return '';
    if (shortcut.startsWith('CodeBlock+'))
      return navigator.platform.startsWith('Mac')
        ? '⌃⌘' + shortcut.split('+').pop()
        : 'Ctrl+Alt+' + shortcut.split('+').pop();
    const isMac = navigator.platform.startsWith('Mac');
    const labels = isMac
      ? { Ctrl: '⌘', Meta: '⌃', Alt: '⌥', Shift: '⇧' }
      : { Ctrl: 'Ctrl', Meta: 'Meta', Alt: 'Alt', Shift: 'Shift' };
    return shortcut
      .split('+')
      .map((part) => labels[part] ?? part)
      .join(isMac ? '' : '+');
  };
  const actions = [
    {
      enabled: settings.cardToolbarBold,
      name: 'Bold',
      icon: boldIcon,
      prefix: '**',
      suffix: '**',
      shortcut: formatShortcut(shortcuts.bold),
      className: 'is-bold',
    },
    {
      enabled: settings.cardToolbarItalic,
      name: 'Italic',
      icon: italicIcon,
      prefix: '*',
      suffix: '*',
      shortcut: formatShortcut(shortcuts.italic),
      className: 'is-italic',
    },
    {
      enabled: settings.cardToolbarStrikethrough,
      name: 'Strikethrough',
      icon: strikethroughIcon,
      prefix: '~~',
      suffix: '~~',
      shortcut: formatShortcut(shortcuts.strikethrough),
      className: 'is-strikethrough',
    },
    {
      enabled: settings.cardToolbarCodeBlock,
      name: 'Code block',
      icon: codeBlockIcon,
      prefix: '```\n',
      suffix: '\n```',
      shortcut: formatShortcut(shortcuts.codeBlock),
      className: 'is-code-block',
    },
    {
      enabled: settings.cardToolbarInlineCode,
      name: 'Inline code',
      icon: inlineCodeIcon,
      prefix: '`',
      suffix: '`',
      shortcut: formatShortcut(shortcuts.inlineCode),
      className: 'is-inline-code',
    },
    {
      enabled: settings.cardToolbarUnorderedList,
      name: 'Unordered list',
      icon: unorderedListIcon,
      blockMarker: 'unordered-list',
      className: 'is-unordered-list',
    },
    {
      enabled: settings.cardToolbarOrderedList,
      name: 'Ordered list',
      icon: orderedListIcon,
      blockMarker: 'ordered-list',
      className: 'is-ordered-list',
    },
    {
      enabled: settings.cardToolbarBlockquote,
      name: 'Blockquote',
      icon: blockquoteIcon,
      blockMarker: 'blockquote',
      className: 'is-blockquote',
    },
  ];

  actions
    .filter((action) => action.enabled)
    .forEach((action) => {
      const button = document.createElement('button');
      button.className = `card-formatting-toolbar__button ${action.className}`;
      button.type = 'button';
      button.innerHTML = action.icon;
      const label = action.shortcut ? `${action.name} (${action.shortcut})` : action.name;
      button.title = label;
      button.setAttribute('aria-label', label);
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', () => {
        const selectionStart = textarea.selectionStart;
        const selectionEnd = textarea.selectionEnd;
        textarea.focus();
        textarea.setSelectionRange(selectionStart, selectionEnd);
        if (action.blockMarker) {
          toggleMarkdownBlock(textarea, action.blockMarker);
        } else {
          toggleMarkdownFormatting(textarea, action.prefix, action.suffix);
        }
      });
      toolbar.append(button);
    });

  if (toolbar.childElementCount) textarea.insertAdjacentElement('beforebegin', toolbar);
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
