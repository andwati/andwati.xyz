document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const htmlElement = document.documentElement;

  const applyTheme = (theme) => {
    if (theme === 'dark') {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  };

  // Check local storage for theme preference
  const currentTheme = localStorage.getItem('theme');
  if (currentTheme === 'dark' || currentTheme === 'light') {
    applyTheme(currentTheme);
  } else {
    // Fallback to system preference
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    applyTheme(prefersDarkScheme.matches ? 'dark' : 'light');
  }

  // Toggle theme on click
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const nextTheme = htmlElement.classList.contains('dark') ? 'light' : 'dark';
      applyTheme(nextTheme);
    });
  }

  // Mobile nav toggle
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen);
    });

    // Close nav when a link is clicked
    navLinks.querySelectorAll('.nav-item').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Sync Utterances (comments iframe) theme with the site theme.
  // The iframe only reads its initial `theme` attribute once, so later
  // changes must go through postMessage per the utterances protocol.
  const syncUtterancesTheme = () => {
    const commentsEl = document.getElementById('comments');
    const frame = document.querySelector('.utterances-frame');
    if (!commentsEl || !frame) return;
    const theme = htmlElement.classList.contains('dark')
      ? commentsEl.dataset.utterancesThemeDark
      : commentsEl.dataset.utterancesThemeLight;
    // The iframe briefly shares our origin before it navigates to utteranc.es,
    // so posting with that targetOrigin throws until the navigation completes.
    try {
      frame.contentWindow.postMessage({ type: 'set-theme', theme }, 'https://utteranc.es');
    } catch (e) {
      // Ignore: frame hasn't navigated to utteranc.es yet.
    }
  };
  new MutationObserver(syncUtterancesTheme).observe(htmlElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  // The iframe loads asynchronously, so poll briefly until it's mounted.
  let utterancesTries = 0;
  const utterancesPoll = setInterval(() => {
    if (document.querySelector('.utterances-frame') || ++utterancesTries > 20) {
      clearInterval(utterancesPoll);
      syncUtterancesTheme();
    }
  }, 250);
});
