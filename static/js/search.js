document.addEventListener('DOMContentLoaded', () => {
  const searchToggleBtn = document.querySelector('.search-toggle');
  if (!searchToggleBtn) return;

  // Check if elasticlunr is available
  if (typeof elasticlunr === 'undefined') {
    console.warn('Elasticlunr not loaded. Search will not work.');
    return;
  }

  // Modal elements
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  const resultsContainer = document.getElementById('search-results');

  if (!overlay || !input || !resultsContainer) return;

  let index = null;
  let isIndexLoading = false;
  let selectedIndex = -1;
  let resultItems = [];

  // Initialize search index (loaded lazily on first open)
  const initSearch = async () => {
    if (index || isIndexLoading) return;
    isIndexLoading = true;

    try {
      // Fetch the Zola-generated index
      const response = await fetch('/search_index.en.js');
      const jsText = await response.text();

      // The file defines `window.searchIndex = {...}`
      // We use a safe evaluation approach if it's purely assignment
      // Or just append it as a script tag
      const script = document.createElement('script');
      script.innerHTML = jsText;
      document.body.appendChild(script);

      // Wait for it to parse
      setTimeout(() => {
        if (window.searchIndex) {
          index = elasticlunr.Index.load(window.searchIndex);
          // Search immediately if there's text
          if (input.value.trim().length > 0) {
            performSearch();
          }
        }
      }, 50);
    } catch (e) {
      console.error('Failed to load search index:', e);
    }
  };

  // Open Modal
  const openSearch = () => {
    overlay.classList.add('active');

    // Slight delay ensures the browser focuses the input after the display transition starts
    setTimeout(() => {
      input.focus();
    }, 50);

    initSearch();
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  };

  // Close Modal
  const closeSearch = () => {
    overlay.classList.remove('active');
    input.value = '';
    resultsContainer.innerHTML = '';
    document.body.style.overflow = '';
    selectedIndex = -1;
    resultItems = [];
  };

  // Bind Toggle Button
  searchToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (overlay.classList.contains('active')) {
      closeSearch();
    } else {
      openSearch();
    }
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSearch();
  });

  // Handle Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl+K -> Open Search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }

    if (!overlay.classList.contains('active')) return;

    // Escape -> Close Search
    if (e.key === 'Escape') {
      closeSearch();
    }

    // Arrow Navigation
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (resultItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        selectedIndex = (selectedIndex + 1) % resultItems.length;
      } else {
        selectedIndex = (selectedIndex - 1 + resultItems.length) % resultItems.length;
      }

      updateSelection();
    }

    // Enter -> Navigate to selected
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && resultItems[selectedIndex]) {
        window.location.href = resultItems[selectedIndex].href;
      } else if (resultItems.length > 0) {
        // Default to first item if none selected
        window.location.href = resultItems[0].href;
      }
    }
  });

  const updateSelection = () => {
    resultItems.forEach((el, i) => {
      if (i === selectedIndex) {
        el.classList.add('selected');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('selected');
      }
    });
  };

  // Perform the Search
  const performSearch = () => {
    if (!index) {
      resultsContainer.innerHTML = '<div class="no-results">Loading search index...</div>';
      return;
    }

    const query = input.value.trim();
    if (query.length === 0) {
      resultsContainer.innerHTML = '';
      selectedIndex = -1;
      resultItems = [];
      return;
    }

    const options = {
      bool: 'OR',
      expand: true,
    };

    const results = index.search(query, options);

    if (results.length === 0) {
      resultsContainer.innerHTML = `<div class="no-results">No results found for "${query}"</div>`;
      selectedIndex = -1;
      resultItems = [];
      return;
    }

    // Build HTML
    let html = '';
    results.forEach((res) => {
      // The doc is stored inside the index.documentStore
      // For Zola + elasticlunr, res.ref IS the URL.
      const url = res.ref;
      const doc = index.documentStore.docs[res.ref];

      if (!doc) return;

      // Truncate summary if needed
      let body = doc.body || '';
      if (body.length > 150) {
        body = body.substring(0, 150) + '...';
      }

      const title = doc.title || url;

      html += `
                <a href="${url}" class="search-result-item">
                    <div class="result-title">${title}</div>
                    <div class="result-summary">${body}</div>
                </a>
            `;
    });

    resultsContainer.innerHTML = html;

    // Cache DOM elements for keyboard navigation
    resultItems = Array.from(resultsContainer.querySelectorAll('.search-result-item'));
    selectedIndex = -1; // Reset selection on new search

    // Mouse hover updates selection index
    resultItems.forEach((item, i) => {
      item.addEventListener('mouseenter', () => {
        selectedIndex = i;
        updateSelection();
      });
    });
  };

  // Debounce the input
  let debounceTimer;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      performSearch();
    }, 150);
  });
});
