import { isAnkiDroid } from '../runtime/platform.js';

/** Run an initializer and rerun it when Anki replaces the current card. */
export function watchCardChanges(callback) {
  callback();

  const targetNode = isAnkiDroid ? document.querySelector('body') : document.getElementById('qa');
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') callback();
      break;
    }
  });
  observer.observe(targetNode, { childList: true });
  return observer;
}
