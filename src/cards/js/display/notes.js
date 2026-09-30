import { hasVisibleContent } from '../helpers/dom.js';

/**
 * Display .notes-containers that contain visible content.
 */
export function showNoteContainers() {
  const notesContainers = document.querySelectorAll('.notes-container');
  if (notesContainers.length < 1) return;

  notesContainers.forEach((notesContainer) => {
    const notesContent = notesContainer.querySelector('.content');
    // Show notes if there is visible note content.
    if (hasVisibleContent(notesContent)) notesContainer.classList.add('active');
  });
}
