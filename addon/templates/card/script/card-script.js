var injectScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};
(async () => {
  // Check if the scripts already exists in order to prevent duplicate loading
  if (typeof hasMyCustomScript === 'undefined') {
    await injectScript('_anki-global-kit.min.js');
  }
})();
