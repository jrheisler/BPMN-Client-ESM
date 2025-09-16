import { observeDOMRemoval } from '../core/stream.js';
import { container } from './layout.js';
import { reactiveText } from './text.js';

export function reactiveElement(stream, renderFn = v => v) {
  const placeholder = document.createElement('div');

  function update(value) {
    placeholder.innerHTML = '';
    const rendered = renderFn(value);
    if (rendered == null || rendered === false) {
      return;
    }

    if (rendered instanceof Node) {
      placeholder.appendChild(rendered);
    } else if (Array.isArray(rendered)) {
      rendered.forEach(el => {
        if (el instanceof Node) placeholder.appendChild(el);
      });
    } else {
      placeholder.textContent = String(rendered);
    }
  }

  update(stream.get());
  const unsub = stream.subscribe(update);

  observeDOMRemoval(placeholder, unsub);

  return placeholder;
}

export function conditional(showStream, childElementFn) {
  const wrapper = document.createElement('div');
  let child = null;

  function update(show) {
    wrapper.innerHTML = '';
    if (show) {
      child = childElementFn();
      wrapper.appendChild(child);
    }
  }

  const unsub1 = showStream.subscribe(update);
  update(showStream.get());

  observeDOMRemoval(wrapper, unsub1);
  return wrapper;
}

export function headerContainer(titleStream) {
  return container([
    reactiveText(titleStream, {
      size: '2rem',
      weight: 'bold',
      margin: '1rem 0',
      align: 'center'
    })
  ], {
    padding: '1rem',
    align: 'center'
  });
}
