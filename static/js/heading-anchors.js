(function () {
  'use strict';

  document.querySelectorAll('.post-body h2[id], .post-body h3[id]').forEach(function (heading) {
    var a = document.createElement('a');
    a.href = '#' + heading.id;
    a.className = 'heading-anchor';
    a.setAttribute('aria-label', 'Link to this section');
    a.setAttribute('tabindex', '-1');
    a.textContent = '#';
    heading.appendChild(a);
  });
})();
