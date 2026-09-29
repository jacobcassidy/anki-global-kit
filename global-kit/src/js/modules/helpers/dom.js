/**
 * Check if an element contains visible content.
 */
export function hasVisibleContent(element) {
  return (
    element !== null &&
    (element.innerText.trim() !== '' ||
      element.querySelector('img, svg, canvas, video, audio, iframe, object, embed') !== null)
  );
}
