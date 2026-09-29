/**
 * Focus the first input or textarea if it is not already active.
 */
export function focusFirstInput() {
  // Do nothing if an input or textarea is already active.
  const activeElement = document.activeElement;
  if (activeElement && (activeElement.matches('input, textarea') || activeElement.isContentEditable)) return;

  // Otherwise, add focus to first input or textarea if the ID is not #typeans.
  const inputField = document.querySelector('input, textarea');
  if (inputField !== null && inputField.id !== 'typeans') inputField.focus();
}
