(function () {
  'use strict';

  var body = document.getElementById('term-body');
  if (!body) return;

  var path = window.location.pathname;
  var promptUser = body.dataset.prompt || 'user@pwnbox';
  var hostname = body.dataset.hostname || 'pwnbox';
  var whoami = body.dataset.whoami || 'l0st_r3ader';

  var links = [
    { href: body.dataset.linkHome, label: '~/home' },
    { href: body.dataset.linkPosts, label: '~/posts' },
    { href: body.dataset.linkTags, label: '~/tags' },
  ];

  var steps = [
    { type: 'cmd', text: 'cd ' + path },
    { type: 'out-error', text: 'bash: cd: ' + path + ': No such file or directory' },
    { type: 'cmd', text: 'whoami' },
    { type: 'out', text: whoami },
    { type: 'cmd', text: 'ls ~/recovery/' },
    { type: 'ls' },
  ];

  var CHAR_DELAY = 28;
  var LINE_DELAY = 180;

  function ps1() {
    var s = document.createElement('span');
    s.className = 'term-ps1';
    s.textContent = promptUser + '@' + hostname + ':~$ ';
    return s;
  }

  function appendCmdLine(text, callback) {
    var row = document.createElement('div');
    row.className = 'term-row';
    row.appendChild(ps1());
    var input = document.createElement('span');
    input.className = 'term-input';
    row.appendChild(input);
    body.appendChild(row);

    var i = 0;
    function tick() {
      if (i < text.length) {
        input.textContent += text[i++];
        setTimeout(tick, CHAR_DELAY);
      } else {
        setTimeout(callback, LINE_DELAY);
      }
    }
    tick();
  }

  function appendOut(text, extraClass, callback) {
    var div = document.createElement('div');
    div.className = 'term-out' + (extraClass ? ' ' + extraClass : '');
    div.textContent = text;
    body.appendChild(div);
    setTimeout(callback, LINE_DELAY);
  }

  function appendLs(callback) {
    var div = document.createElement('div');
    div.className = 'term-out-ls';
    links.forEach(function (l) {
      var a = document.createElement('a');
      a.href = l.href;
      a.textContent = l.label;
      div.appendChild(a);
    });
    body.appendChild(div);
    setTimeout(callback, LINE_DELAY);
  }

  function appendCursor() {
    var row = document.createElement('div');
    row.className = 'term-row';
    row.appendChild(ps1());
    var cur = document.createElement('span');
    cur.className = 'term-cursor';
    cur.setAttribute('aria-hidden', 'true');
    row.appendChild(cur);
    body.appendChild(row);
  }

  function runSteps(i) {
    if (i >= steps.length) {
      appendCursor();
      return;
    }
    var step = steps[i];
    var next = function () {
      runSteps(i + 1);
    };

    if (step.type === 'cmd') appendCmdLine(step.text, next);
    else if (step.type === 'out-error') appendOut(step.text, 'term-out-error', next);
    else if (step.type === 'out') appendOut(step.text, 'term-out-muted', next);
    else if (step.type === 'ls') appendLs(next);
    else next();
  }

  runSteps(0);
})();
