document.addEventListener('DOMContentLoaded', () => {
  const progressBar = document.getElementById('reading-progress-bar');
  if (!progressBar) return;

  const updateProgress = () => {
    // Calculate how far the user has scrolled down the page
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;

    // Calculate the total scrollable height
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    const clientHeight = document.documentElement.clientHeight || window.innerHeight;

    const windowHeight = scrollHeight - clientHeight;

    // Calculate percentage and update width
    const scrollPercentage = windowHeight > 0 ? (scrollTop / windowHeight) * 100 : 0;
    progressBar.style.width = scrollPercentage + '%';
  };

  // Update initially in case the user refreshes midway down the page
  updateProgress();

  // Throttle the scroll event listener a tiny bit for performance
  let isTicking = false;
  window.addEventListener('scroll', () => {
    if (!isTicking) {
      window.requestAnimationFrame(() => {
        updateProgress();
        isTicking = false;
      });
      isTicking = true;
    }
  });
});
