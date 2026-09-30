import { isAnkiWeb } from '../runtime/platform.js';

/**
 * Modify the AnkiWeb layout.
 */
export function modifyAnkiWeb() {
  if (isAnkiWeb) {
    const leftStudyMenu = document.getElementById('leftStudyMenu');
    const rightStudyMenu = document.getElementById('rightStudyMenu');
    const studyMenuWrap = document.getElementById('study-menu-wrap');
    // Create and add #study-menu-wrap element if it doesn't already exist.
    if (leftStudyMenu !== null && studyMenuWrap === null) {
      const studyMenuParent = leftStudyMenu.parentNode;
      const menuWrap = document.createElement('div');
      menuWrap.id = 'study-menu-wrap';
      menuWrap.append(leftStudyMenu);
      menuWrap.append(rightStudyMenu);
      studyMenuParent.prepend(menuWrap);
    }
  }
}
