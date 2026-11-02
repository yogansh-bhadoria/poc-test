import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js'; // NEW

function renderCards(pages, ul) {
  ul.innerHTML = '';

  pages.forEach((page) => {
    const li = document.createElement('li');

    const imageDiv = document.createElement('div');
    imageDiv.className = 'cards-card-image';

    if (page.cover && page.cover.trim() !== '') {
      const picture = createOptimizedPicture(
        page.cover,
        page.title || '',
        false,
        [{ width: '750' }],
      );
      imageDiv.append(picture);
    }

    const tag = document.createElement('span');
    tag.className = 'cards-card-tag';
    tag.textContent = page.category;
    imageDiv.append(tag);

    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'cards-card-body';

    bodyDiv.innerHTML = `
  <h3><a href="${page.path}">${page.title || ''}</a></h3>
  <p>${page.description || ''}</p>
`;

    li.append(imageDiv, bodyDiv);
    ul.append(li);
  });
}

// NEW: counts the number in a card title up from 0 (e.g. "80%+" → 0%+ … 80%+)
function animateCount(titleEl) {
  // Find the text that contains the number, so any <strong>/<a> markup is kept
  const walker = document.createTreeWalker(titleEl, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  while (textNode && !/\d/.test(textNode.nodeValue)) textNode = walker.nextNode();
  if (!textNode) return;

  const original = textNode.nodeValue;
  const match = original.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/s);
  if (!match) return;

  const [, prefix, numberText, suffix] = match;
  const target = parseFloat(numberText);
  const decimals = (numberText.split('.')[1] || '').length;
  const duration = 1500;

  textNode.nodeValue = `${prefix}${(0).toFixed(decimals)}${suffix}`;

  const run = () => {
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const value = (target * progress).toFixed(decimals);
      textNode.nodeValue = `${prefix}${value}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
      else textNode.nodeValue = original; // end on the exact authored text
    };
    requestAnimationFrame(step);
  };

  // Start counting only when the card scrolls into view
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      observer.disconnect();
      run();
    }
  }, { threshold: 0.5 });
  observer.observe(titleEl);
}

export default async function decorate(block) {
  // Check if this block is set to query mode: | Cards (query) |
  const isQuery = block.classList.contains('query');

  if (isQuery) {
    // 1. Fetch query-index.json
    const response = await fetch('/query-index.json');
    if (!response.ok) return;

    const json = await response.json();
    const allPages = json.data || [];

    // 2. Filter out index page itself and take up to 10 pages
    const pagesToShow = allPages
      .filter((page) => page.path !== window.location.pathname)
      .slice(0, 10);

    // 3. Generate the Cards HTML structure
    const ul = document.createElement('ul');

    const dropdownTitle = document.createElement('p');
    dropdownTitle.textContent = block.children[0].children[0].textContent.trim();

    const dropdown = document.createElement('select');
    dropdown.className = 'asset-type-dropdown';

    const sortingValues = block.children[0].children[1].querySelector('ul');
    const assetTypes = sortingValues.querySelectorAll('li');
    assetTypes.forEach((category) => {
      const type = document.createElement('option');
      type.textContent = category.textContent.trim();
      dropdown.append(type);
    });

    dropdown.addEventListener('change', (e) => {
      if (e.target.value.trim() === 'All Asset Types') {
        renderCards(pagesToShow, ul);
      } else {
        const filteredPages = pagesToShow.filter(
          (page) => (
            page.category.toLowerCase()
            === e.target.value.trim().toLowerCase()
          ),
        );
        renderCards(filteredPages, ul);
      }
    });

    renderCards(pagesToShow, ul);

    const displayText = document.createElement('p');
    displayText.textContent = 'Showing latest insights';

    // Replace whatever was inside the block table with our cards list
    block.textContent = '';
    block.append(dropdownTitle);
    block.append(dropdown);
    block.append(displayText);
    block.append(ul);
    return;
  }

  // --- STANDARD BEHAVIOR (For manual cards) ---
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li); // NEW: keeps the card clickable in UE
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img')); // NEW: keeps the image clickable in UE
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
    block.append(ul);

  // NEW: start the count-up on each card's title (first line of the card body)
  ul.querySelectorAll('.cards-card-body').forEach((body) => {
    const titleEl = body.firstElementChild;
    if (titleEl) animateCount(titleEl);
  });
}
}
