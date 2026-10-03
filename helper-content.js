export const HELPER_EXPLANATION_LIMIT = 4000;

export function helperExplanation(value) {
  if (typeof value !== 'string' || value.length > HELPER_EXPLANATION_LIMIT) throw new Error('Helper explanation must be text of at most 4000 characters');
  return value.replace(/\r\n?/g, '\n').trim();
}

// Plain text and paired **bold** only. Never parse owner content as HTML.
export function renderHelperExplanation(container, value) {
  const text = helperExplanation(value);
  const document = container.ownerDocument;
  const fragment = document.createDocumentFragment();
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    if (index) fragment.append(document.createElement('br'));
    let start = 0;
    for (const match of line.matchAll(/\*\*([^*]+)\*\*/g)) {
      fragment.append(document.createTextNode(line.slice(start, match.index)));
      const strong = document.createElement('strong');
      strong.textContent = match[1];
      fragment.append(strong);
      start = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(line.slice(start)));
  });
  container.replaceChildren(fragment);
  container.hidden = !text;
}
