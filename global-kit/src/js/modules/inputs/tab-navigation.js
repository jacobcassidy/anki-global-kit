/**
 * Insert indentation with Tab, or advance focus with Shift+Tab.
 */
export function handleTabIndentation(textarea, event) {
  if (event.key !== 'Tab') return;

  if (event.shiftKey) {
    const focusableElements = Array.from(
      document.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]'
      )
    ).filter((element) => {
      const style = window.getComputedStyle(element);
      return (
        !element.disabled &&
        element.tabIndex >= 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        element.getClientRects().length > 0
      );
    });
    const currentIndex = focusableElements.indexOf(textarea);
    const nextElement = focusableElements[currentIndex + 1];

    if (nextElement) {
      event.preventDefault();
      nextElement.focus();
    }
    return;
  }

  event.preventDefault();

  const topic = document.querySelector('.topic');
  const indentation = topic && /python/i.test(topic.textContent) ? '    ' : '  ';
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  textarea.setRangeText(indentation, start, end, 'end');
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}
