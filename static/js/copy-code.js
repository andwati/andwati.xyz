document.addEventListener('DOMContentLoaded', () => {
  // Select all <pre> elements that contain code blocks
  const preBlocks = document.querySelectorAll('pre');

  const copyIcon =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>';
  const checkIcon =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

  preBlocks.forEach((pre) => {
    // Create the copy button
    const button = document.createElement('button');
    button.innerHTML = copyIcon;
    button.className = 'copy-code-btn';
    button.setAttribute('aria-label', 'Copy code');
    button.setAttribute('title', 'Copy code');

    // Add the button to the <pre> block
    // Assuming pre is position relative in CSS
    pre.appendChild(button);

    button.addEventListener('click', async () => {
      // Find the <code> element within the <pre>
      const code = pre.querySelector('code');
      if (!code) return;

      // Get the text content, removing any leading/trailing whitespace
      const text = code.innerText;

      try {
        if (navigator.clipboard && window.isSecureContext) {
          // Modern Async Clipboard API
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback for insecure contexts (like local network IPs via HTTP)
          const textArea = document.createElement('textarea');
          textArea.value = text;

          // Move outside the screen to make it invisible
          textArea.style.position = 'absolute';
          textArea.style.left = '-999999px';

          document.body.appendChild(textArea);
          textArea.select();

          document.execCommand('copy');
          textArea.remove();
        }

        // Add visual feedback
        button.innerHTML = checkIcon;
        button.classList.add('copied');
        button.setAttribute('aria-label', 'Copied');
        button.setAttribute('title', 'Copied!');

        // Revert back after 2 seconds
        setTimeout(() => {
          button.innerHTML = copyIcon;
          button.classList.remove('copied');
          button.setAttribute('aria-label', 'Copy code');
          button.setAttribute('title', 'Copy code');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy code: ', err);
      }
    });
  });
});
