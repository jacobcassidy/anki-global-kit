import { syntaxLanguageAliases, syntaxLanguageRules } from './languages.js';

export function getSyntaxLanguage(topicText) {
  const topic = (topicText || '').trim();
  for (const [pattern, language] of syntaxLanguageAliases) {
    if (pattern.test(topic)) return language;
  }
  return null;
}

export function escapeSyntaxText(text) {
  return text.replace(/[&<>"']/g, (character) => {
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return entities[character];
  });
}

export function highlightCodeText(codeText, language) {
  const rules = syntaxLanguageRules[language];
  const stringPattern =
    '"""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|`(?:\\\\.|[^`\\\\])*`|"(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'';
  const tokenPattern = new RegExp(
    `(${rules.comments})|(${stringPattern})|(\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b)|([A-Za-z_$][\\w$]*)|([+\\-*/%=<>!&|^~]+)|([{}()[\\].,:;])`,
    'g',
  );
  const keywords = new Set(rules.keywords.split(/\s+/));
  const builtins = new Set(rules.builtins.split(/\s+/));
  const pieces = [];
  let cursor = 0;
  let match;

  while ((match = tokenPattern.exec(codeText)) !== null) {
    pieces.push(escapeSyntaxText(codeText.slice(cursor, match.index)));
    const token = match[0];
    let tokenClass = '';

    if (match[1]) tokenClass = 'c1';
    else if (match[2]) tokenClass = 's';
    else if (match[3]) tokenClass = 'm';
    else if (match[4]) {
      if (keywords.has(token)) tokenClass = 'k';
      else if (builtins.has(token)) tokenClass = 'nb';
      else if (/^\s*class\s+$/.test(codeText.slice(Math.max(0, match.index - 12), match.index))) {
        tokenClass = 'nc';
      } else if (/^\s*(?:async\s+)?def\s+$/.test(codeText.slice(Math.max(0, match.index - 16), match.index))) {
        tokenClass = 'nf';
      } else if (/^\s*\(/.test(codeText.slice(match.index + token.length))) {
        tokenClass = 'nf';
      }
    } else if (match[5]) tokenClass = 'o';
    else if (match[6]) tokenClass = 'p';

    const escapedToken = escapeSyntaxText(token);
    pieces.push(tokenClass ? `<span class="${tokenClass}">${escapedToken}</span>` : escapedToken);
    cursor = tokenPattern.lastIndex;
  }

  pieces.push(escapeSyntaxText(codeText.slice(cursor)));
  return pieces.join('');
}

export function highlightSubmittedCode(container, topicText) {
  container.querySelectorAll('pre > code').forEach((code) => {
    if (code.dataset.syntaxHighlighted === 'true') return;
    const language =
      getSyntaxLanguage(code.dataset.language) || (code.dataset.language ? null : getSyntaxLanguage(topicText));
    if (!language) return;
    code.innerHTML = highlightCodeText(code.textContent, language);
    code.classList.add('shigeSyntax', `language-${language}`);
    code.dataset.syntaxHighlighted = 'true';
  });
}
