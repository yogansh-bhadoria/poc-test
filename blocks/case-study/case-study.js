function createId(title, index) {
  const id = title
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return id || `case-study-section-${index + 1}`;
}

function setActiveLink(nav, sectionId) {
  nav.querySelectorAll('.case-study-nav-link').forEach((link) => {
    const isActive = link.dataset.target === sectionId;

    link.classList.toggle('active', isActive);

    if (isActive) {
      link.setAttribute('aria-current', 'true');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

// function removeDuplicateHeading(contentCell, title) {
//   const firstElement = contentCell.firstElementChild;

//   if (!firstElement) return;

//   const isHeading = /^H[1-6]$/.test(firstElement.tagName);

//   const headingText = firstElement.textContent
//     .trim()
//     .replace(/\s+/g, ' ')
//     .toLowerCase();

//   const titleText = title
//     .trim()
//     .replace(/\s+/g, ' ')
//     .toLowerCase();

//   if (isHeading && headingText === titleText) {
//     firstElement.remove();
//   }
// }

function createContentSection(row, index) {
  const cells = [...row.children];

  if (cells.length < 2) return null;

  const titleCell = cells[0];
  const contentCell = cells[1];
  const title = titleCell.textContent.trim();

  if (!title) return null;

  const sectionId = createId(title, index);

  /*
   * The content cell may already contain the same heading entered in DA.
   * Remove it before creating the section heading so it does not appear twice.
   */
  // removeDuplicateHeading(contentCell, title);

  const section = document.createElement('section');
  section.className = 'case-study-section';
  section.id = sectionId;

  const heading = document.createElement('h2');
  heading.className = 'case-study-heading';
  heading.textContent = title;

  const body = document.createElement('div');
  body.className = 'case-study-body';

  /*
   * Move all remaining authored content from the table cell
   * into the new section body.
   */
  while (contentCell.firstChild) {
    body.append(contentCell.firstChild);
  }

  section.append(heading, body);

  return {
    section,
    sectionId,
    title,
  };
}

function createNavItem(title, sectionId) {
  const item = document.createElement('li');
  item.className = 'case-study-nav-item';

  const link = document.createElement('a');
  link.className = 'case-study-nav-link';
  link.href = `#${sectionId}`;
  link.dataset.target = sectionId;
  link.textContent = title;

  link.addEventListener('click', (event) => {
    event.preventDefault();

    const section = document.getElementById(sectionId);

    if (!section) return;

    /*
     * Calculate the section's absolute position on the page.
     * Using window.scrollTo() prevents the aside panel from becoming
     * the element that receives the scrolling.
     */
    const headerOffset = 100;

    const sectionPosition = section.getBoundingClientRect().top
      + window.scrollY
      - headerOffset;

    window.scrollTo({
      top: sectionPosition,
      behavior: 'smooth',
    });

    setActiveLink(
      link.closest('.case-study-nav'),
      sectionId,
    );

    window.history.replaceState(null, '', `#${sectionId}`);
  });

  item.append(link);

  return item;
}

function observeSections(nav, sections) {
  if (!sections.length) return;

  if (!('IntersectionObserver' in window)) {
    setActiveLink(nav, sections[0].id);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort(
          (first, second) => Math.abs(first.boundingClientRect.top)
            - Math.abs(second.boundingClientRect.top),
        );

      if (visibleEntries.length) {
        setActiveLink(nav, visibleEntries[0].target.id);
      }
    },
    {
      root: null,
      rootMargin: '-20% 0px -65% 0px',
      threshold: [0, 0.1, 0.25],
    },
  );

  sections.forEach((section) => {
    observer.observe(section);
  });
}

function moveFollowingTestimonial(block, mainContent) {
  const testimonials = [...document.querySelectorAll('.testimonial')];

  const testimonial = testimonials.find(
    (item) => (
      /* eslint-disable-next-line no-bitwise */
      block.compareDocumentPosition(item) & Node.DOCUMENT_POSITION_FOLLOWING
    ),
  );

  if (!testimonial) return;

  const testimonialWrapper = testimonial.closest('.testimonial-wrapper');
  const elementToMove = testimonialWrapper || testimonial;

  const testimonialContainer = document.createElement('div');
  testimonialContainer.className = 'case-study-testimonial';

  testimonialContainer.append(elementToMove);
  mainContent.append(testimonialContainer);
}

export default function decorate(block) {
  const rows = [...block.children];

  if (!rows.length) return;

  const layout = document.createElement('div');
  layout.className = 'case-study-layout';

  const aside = document.createElement('aside');
  aside.className = 'case-study-aside';

  const nav = document.createElement('nav');
  nav.className = 'case-study-nav';
  nav.setAttribute('aria-label', 'Case study sections');

  const navList = document.createElement('ul');
  navList.className = 'case-study-nav-list';

  const mainContent = document.createElement('div');
  mainContent.className = 'case-study-main';

  const sections = [];

  rows.forEach((row, index) => {
    const sectionData = createContentSection(row, index);

    if (!sectionData) return;

    const { section, sectionId, title } = sectionData;

    navList.append(createNavItem(title, sectionId));
    mainContent.append(section);
    sections.push(section);
  });

  if (!sections.length) return;

  nav.append(navList);
  aside.append(nav);
  layout.append(aside, mainContent);

  block.replaceChildren(layout);
  moveFollowingTestimonial(block, mainContent);

  observeSections(nav, sections);

  setActiveLink(nav, sections[0].id);
}
