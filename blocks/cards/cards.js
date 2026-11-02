import { createOptimizedPicture } from '../../scripts/aem.js';

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

  // --- STANDARD BOILERPLATE BEHAVIOR (For manual cards) ---
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.textContent = '';
  block.append(ul);
}
