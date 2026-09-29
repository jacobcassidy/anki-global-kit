/**
 * Convert common Markdown syntax to safe HTML for the submitted answer.
 */
export function markdownToHtml(markdown) {
  const escapeHtml = (text) =>
    text.replace(/[&<>"']/g, (character) => {
      const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return entities[character];
    });

  const renderInline = (text) => {
    const codeSpans = [];
    let html = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => {
      const token = `\u0000${codeSpans.length}\u0000`;
      codeSpans.push(`<code>${code}</code>`);
      return token;
    });

    html = html
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/_([^_\n]+)_/g, '<em>$1</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // Restore code spans after the other Markdown replacements.
    // eslint-disable-next-line no-control-regex
    html = html.replace(/\u0000(\d+)\u0000/g, (_, index) => codeSpans[Number(index)]);

    return html;
  };

  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let code = [];
  let inCodeBlock = false;
  const listStack = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(`<p>${renderInline(paragraph.join('\n')).replace(/\n/g, '<br>')}</p>`);
      paragraph = [];
    }
  };
  const closeTopList = () => {
    const list = listStack.pop();
    if (list) blocks.push(`</li></${list.type}>`);
  };
  const closeLists = () => {
    while (listStack.length) closeTopList();
  };
  const openList = (type, indent) => {
    blocks.push(`<${type}><li>`);
    listStack.push({ type, indent });
  };

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      flushParagraph();
      closeLists();
      if (inCodeBlock) {
        blocks.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        code = [];
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      code.push(line);
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
    const listItem = line.match(/^([ \t]*)(?:([-+*])\s+|(\d+)\.\s+)(.*)$/);
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (!line.trim() || heading || listItem || quote) flushParagraph();

    if (!line.trim()) {
      closeLists();
    } else if (heading) {
      closeLists();
      const level = heading[1].length;
      blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
    } else if (listItem) {
      const indent = listItem[1].replace(/\t/g, '    ').length;
      const nextListType = listItem[3] ? 'ol' : 'ul';

      while (listStack.length && indent < listStack[listStack.length - 1].indent) {
        closeTopList();
      }

      const currentList = listStack[listStack.length - 1];
      if (!currentList) {
        openList(nextListType, indent);
      } else if (indent > currentList.indent) {
        // A more-indented item is nested inside the preceding list item.
        openList(nextListType, indent);
      } else if (indent === currentList.indent && currentList.type !== nextListType) {
        closeTopList();
        openList(nextListType, indent);
      } else {
        // Continue the current list at the same indentation.
        blocks.push('</li><li>');
      }
      blocks.push(renderInline(listItem[4]));
    } else if (quote) {
      closeLists();
      blocks.push(`<blockquote><p>${renderInline(quote[1])}</p></blockquote>`);
    } else {
      closeLists();
      paragraph.push(line);
    }
  }

  flushParagraph();
  closeLists();
  if (inCodeBlock) blocks.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  return blocks.join('\n').replace(/<li>\n/g, '<li>');
}
