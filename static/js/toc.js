(function () {
  'use strict';

  const sidebar = document.querySelector('.post-toc-sidebar');
  if (!sidebar) return;

  const links = Array.from(sidebar.querySelectorAll('a[data-toc-id]'));
  if (!links.length) return;

  const headingIds = links.map((a) => a.dataset.tocId);
  const headings = headingIds.map((id) => document.getElementById(id)).filter(Boolean);

  let activeId = null;

  function setActive(id) {
    if (id === activeId) return;
    activeId = id;
    links.forEach((a) => {
      if (a.dataset.tocId === id) {
        a.classList.add('toc-active');
      } else {
        a.classList.remove('toc-active');
      }
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      // Find the topmost visible heading
      const visible = headings.filter((h) => {
        const rect = h.getBoundingClientRect();
        return rect.top >= 0 && rect.top < window.innerHeight * 0.6;
      });

      if (visible.length > 0) {
        setActive(visible[0].id);
      } else {
        // If scrolled past all headings, keep last active
        const above = headings.filter((h) => h.getBoundingClientRect().top < 0);
        if (above.length > 0) {
          setActive(above[above.length - 1].id);
        }
      }
    },
    {
      rootMargin: '-10% 0px -60% 0px',
      threshold: 0,
    },
  );

  headings.forEach((h) => observer.observe(h));

  // Set initial active on load
  const firstVisible = headings.find((h) => {
    const rect = h.getBoundingClientRect();
    return rect.top >= 0;
  });
  if (firstVisible) setActive(firstVisible.id);
})();
