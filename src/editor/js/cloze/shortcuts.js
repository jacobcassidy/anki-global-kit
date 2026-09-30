// Use physical Control for cloze on macOS, leaving Command+Shift+C for code.
export function installClozeShortcuts() {
  if (installClozeShortcuts.installed) return;
  installClozeShortcuts.installed = true;
  // Anki's built-in web shortcuts map "Control" to Command on this platform.
  if (navigator.platform.startsWith('Mac')) {
    const clozeButtons = () => document.querySelectorAll('#cloze button');
    const labels = ['⌃⇧C', '⌃⌥⇧C'];

    function updateClozeTooltips() {
      clozeButtons().forEach((button, index) => {
        if (!labels[index]) return;
        // Preserve Anki's translated action name, replacing only the shortcut.
        const title = button.title.replace(/\s*\([^()]*\)\s*$/, '');
        const updated = `${title} (${labels[index]})`;
        if (button.title !== updated) button.title = updated;
      });
    }

    function handleClozeShortcut(event) {
      if (event.code !== 'KeyC' || !event.shiftKey || event.isComposing) return;
      const buttons = clozeButtons();
      if (buttons.length !== 2) return;
      if (event.metaKey && !event.ctrlKey) {
        // Stop the original web cloze handlers, including the older keyup
        // variant. Qt still owns the add-on's Command+Shift+C shortcut.
        event.stopImmediatePropagation();
        return;
      }
      if (!event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.type !== 'keydown' || event.repeat) return;
      const button = buttons[event.altKey ? 1 : 0];
      if (!button.disabled) button.click();
    }

    document.addEventListener('keydown', handleClozeShortcut, true);
    document.addEventListener('keyup', handleClozeShortcut, true);
    // Toolbar buttons can be mounted/replaced after the feature script runs.
    const clozeTooltipObserver = new MutationObserver(updateClozeTooltips);
    clozeTooltipObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['title'],
    });
    updateClozeTooltips();
  }
}
