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

  // Sync cookieconsent dark mode reactively with the site theme
  const syncCCTheme = () => {
    const ccMain = document.getElementById('cc-main');
    if (!ccMain) return;
    ccMain.classList.toggle('cc--darkmode', htmlElement.classList.contains('dark'));
  };
  new MutationObserver(syncCCTheme).observe(htmlElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  // Initial sync in case banner is already mounted
  setTimeout(syncCCTheme, 100);
});
