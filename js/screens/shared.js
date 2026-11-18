// Small building blocks every screen uses. Everything is built with
// createElement and text nodes, never innerHTML, so AI text can't inject HTML.

// el('button', { class: 'primary', onclick: fn }, 'Save')
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    if (name === 'class') node.className = value;
    else if (name.startsWith('on')) node.addEventListener(name.slice(2).toLowerCase(), value);
    else if (name in node) node[name] = value;
    else node.setAttribute(name, value);
  }
  // append() turns strings into text nodes, which is what keeps this safe.
  for (const child of children.flat()) {
    if (child !== null && child !== undefined && child !== false) node.append(child);
  }
  return node;
}

// Every error gets a message and a Retry button.
export function errorBox(message, onRetry) {
  return el('div', { class: 'error-box', role: 'alert' },
    el('p', {}, message),
    onRetry ? el('button', { type: 'button', onclick: onRetry }, 'Retry') : null,
  );
}
