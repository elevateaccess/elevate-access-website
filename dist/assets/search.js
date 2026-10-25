'use strict';
(() => {
  const form = document.querySelector('[data-site-search]');
  if (!form) return;
  const input = document.getElementById('search-query');
  const status = document.getElementById('search-status');
  const region = document.getElementById('search-results');
  const list = region.querySelector('ol');
  const more = document.getElementById('search-more');
  let enginePromise;
  let importAttempt = 0;
  let results = [];
  let rendered = 0;
  let request = 0;
  const engine = () => {
    if (!enginePromise) {
      const bundle = '/pagefind/pagefind.js' + (importAttempt ? '?retry=' + importAttempt : '');
      importAttempt++;
      enginePromise = import(bundle).catch(error => {
        enginePromise = null;
        throw error;
      });
    }
    return enginePromise;
  };
  const syncLinks = query => {
    document.querySelectorAll('.language-switcher a').forEach(link => {
      const url = new URL(link.href);
      if (query) url.searchParams.set('q', query);
      else url.searchParams.delete('q');
      link.href = url.href;
    });
  };
  // Preserve Pagefind's highlight marks while rendering all content as safe DOM.
  const excerpt = html => {
    const template = document.createElement('template');
    template.innerHTML = html;
    const fragment = document.createDocumentFragment();
    const append = (nodes, target) => nodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) target.append(document.createTextNode(node.textContent));
      else if (node.nodeType === Node.ELEMENT_NODE) {
        if (['SCRIPT', 'STYLE'].includes(node.tagName)) return;
        if (node.tagName === 'MARK') {
          const mark = document.createElement('mark');
          append(node.childNodes, mark);
          target.append(mark);
        } else append(node.childNodes, target);
      }
    });
    append(template.content.childNodes, fragment);
    return fragment;
  };
  const renderBatch = async (id, moveFocus = false) => {
    const start = rendered;
    const batch = await Promise.all(results.slice(start, start + 10).map(result => result.data()));
    if (id !== request) return;
    let firstLink;
    for (const result of batch) {
      const url = new URL(result.url, location.origin);
      const spanish = document.documentElement.lang.startsWith('es');
      if (url.origin !== location.origin || url.pathname.startsWith('/es/') !== spanish) throw new Error('Invalid search result');
      const item = document.createElement('li');
      const heading = document.createElement('h3');
      const link = document.createElement('a');
      link.href = url.pathname + url.hash;
      link.textContent = result.meta.title;
      heading.append(link);
      const text = document.createElement('p');
      text.append(excerpt(result.excerpt || result.meta.description || ''));
      item.append(heading, text);
      list.append(item);
      firstLink ||= link;
    }
    rendered += batch.length;
    more.hidden = rendered >= results.length;
    if (moveFocus) firstLink?.focus();
  };
  const search = async (query, updateURL) => {
    const id = ++request;
    query = query.trim().replace(/\s+/g, ' ').slice(0, 160);
    input.value = query;
    list.replaceChildren();
    region.hidden = true;
    region.removeAttribute('aria-busy');
    more.hidden = true;
    results = [];
    rendered = 0;
    syncLinks(query);
    if (updateURL) {
      const url = new URL(location.href);
      if (query) url.searchParams.set('q', query);
      else url.searchParams.delete('q');
      if (url.href !== location.href) history.pushState(null, '', url);
    }
    if (!query) {
      status.textContent = form.dataset.blank;
      return;
    }
    status.textContent = form.dataset.loading;
    region.setAttribute('aria-busy', 'true');
    try {
      const pagefind = await engine();
      const response = await pagefind.search(query);
      if (id !== request) return;
      results = response.results;
      if (results.length) {
        await renderBatch(id);
        if (id !== request) return;
        region.hidden = false;
      }
      status.textContent = results.length === 0 ? form.dataset.empty : results.length === 1 ? form.dataset.countOne : form.dataset.countMany.replace('{count}', String(results.length));
    } catch {
      if (id !== request) return;
      enginePromise = null;
      list.replaceChildren();
      region.hidden = true;
      more.hidden = true;
      status.textContent = form.dataset.error;
    } finally {
      if (id === request) region.removeAttribute('aria-busy');
    }
  };
  form.addEventListener('submit', event => {
    event.preventDefault();
    search(input.value, true);
  });
  more.addEventListener('click', async () => {
    const id = request;
    more.disabled = true;
    try { await renderBatch(id, true); }
    catch { if (id === request) status.textContent = form.dataset.error; }
    finally { more.disabled = false; }
  });
  const fromURL = () => {
    const query = new URL(location.href).searchParams.get('q') || '';
    if (query) search(query, false);
    else {
      ++request;
      input.value = '';
      syncLinks('');
      list.replaceChildren();
      region.hidden = true;
      more.hidden = true;
      region.removeAttribute('aria-busy');
      status.textContent = '';
    }
  };
  window.addEventListener('popstate', fromURL);
  fromURL();
})();
