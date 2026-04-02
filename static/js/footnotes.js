(function () {
  'use strict';

  const refs = document.querySelectorAll('sup.footnote-reference');
  if (!refs.length) return;

  refs.forEach(function (sup) {
    const a = sup.querySelector('a');
    if (!a) return;

    const targetId = a.getAttribute('href').replace(/^#/, '');
    const refId = 'fnref-' + targetId;
    sup.id = refId;

    const def = document.getElementById(targetId);
    if (!def) return;

    // Append ↩ to the last <p> inside the definition
    const paras = def.querySelectorAll('p');
    const lastPara = paras[paras.length - 1];
    if (!lastPara) return;

    const backlink = document.createElement('a');
    backlink.href = '#' + refId;
    backlink.className = 'footnote-backref';
    backlink.setAttribute('aria-label', 'Back to reference');
    backlink.textContent = '↩';

    lastPara.appendChild(document.createTextNode('\u00a0'));
    lastPara.appendChild(backlink);
  });
})();
