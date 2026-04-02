document.addEventListener('DOMContentLoaded', () => {
  const scrollToTopBtn = document.getElementById('scroll-to-top');

  if (!scrollToTopBtn) return;

  // Show button when scrolled down 400px
  const toggleVisibility = () => {
    if (window.scrollY > 400) {
      scrollToTopBtn.classList.add('visible');
    } else {
      scrollToTopBtn.classList.remove('visible');
    }
  };

  // Smooth scroll to top when clicked
  scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  });

  // Throttle the scroll event listener a tiny bit for performance
  let isTicking = false;
  window.addEventListener('scroll', () => {
    if (!isTicking) {
      window.requestAnimationFrame(() => {
        toggleVisibility();
        isTicking = false;
      });
      isTicking = true;
    }
  });
});
