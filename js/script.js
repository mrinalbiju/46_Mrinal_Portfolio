/* ============================================================
   Mrinal Biju — Portfolio
   Vanilla ES6+: data-driven rendering, event handling,
   regex form validation, and localStorage persistence.
   ============================================================ */

/* ------------------------------------------------------------
   1. DATA — projects and skills live here as arrays of objects.
      The DOM is rendered from this data (no hardcoded cards).
   ------------------------------------------------------------ */

const projects = [
  {
    id: 'crowd',
    title: 'Crowd Panic & Stampede Risk Detection',
    period: 'Jan – Apr 2026',
    image: 'images/project-crowd.png',
    summary: 'Computer-vision system that reads crowd density and motion from video to predict stampede risk before it escalates.',
    points: [
      'Crowd density and motion pipeline built with CSRNet and Farneback optical flow, validated on the ShanghaiTech and UMN datasets.',
      'Sliding-window temporal features feeding a Gradient Boosting classifier for real-time risk scoring.',
      'Flask dashboard with a live annotated feed, density heatmaps and early-warning alerts for security staff.'
    ],
    tags: ['Python', 'OpenCV', 'Machine Learning', 'Flask'],
    links: { repo: 'https://github.com/mrinalbiju', demo: '' }
  },
  {
    id: 'safeshelf',
    title: 'SafeShelf — AI Grocery Companion',
    period: 'May – Jun 2026',
    image: 'images/project-safeshelf.png',
    summary: 'Scan a product, and SafeShelf checks its ingredients against your dietary constraints in real time.',
    points: [
      'Cross-platform iOS/Android app in React 19, TypeScript and Capacitor with barcode and camera scanning.',
      'FastAPI backend on SQLModel and async PostgreSQL exposing versioned REST APIs.',
      'Groq LLM combined with the USDA FoodData Central API to parse ingredients and flag conflicts.'
    ],
    tags: ['React', 'TypeScript', 'FastAPI', 'PostgreSQL'],
    links: { repo: 'https://github.com/mrinalbiju', demo: '' }
  },
  {
    id: 'musify',
    title: 'Musify — Music Streaming App',
    period: 'Dec 2024 – Feb 2025',
    image: 'images/project-musify.png',
    summary: 'A cross-platform music streaming frontend built in Flutter, with browsing, playback and playlist management.',
    points: [
      'Responsive widget-based UI covering browsing, playback controls, playlists and navigation.',
      'Built in a team of three during the ICT Academy Flutter programme.'
    ],
    tags: ['Flutter', 'Dart'],
    links: { repo: 'https://github.com/mrinalbiju', demo: '' }
  },
  {
    id: 'aikitchen',
    title: 'Customized AI Kitchen for India',
    period: 'May – Jun 2024',
    image: 'images/project-aikitchen.png',
    summary: 'Intel Unnati industrial training project — an AI assistant tuned to Indian culinary requirements and ingredients.',
    points: [
      'Python and AI pipeline adapted to regional recipes, ingredient substitution and dietary preferences.',
      'Completed as part of the Intel Unnati Industrial Training programme, 2024.'
    ],
    tags: ['Python', 'Machine Learning'],
    links: { repo: 'https://github.com/mrinalbiju', demo: '' }
  }
];

const skills = [
  { name: 'Python',              level: 'Advanced',     score: 90 },
  { name: 'JavaScript / TypeScript', level: 'Advanced', score: 85 },
  { name: 'React & React Native', level: 'Advanced',    score: 82 },
  { name: 'Java',                level: 'Intermediate', score: 72 },
  { name: 'Flutter & Dart',      level: 'Intermediate', score: 70 },
  { name: 'FastAPI & Node.js',   level: 'Intermediate', score: 75 },
  { name: 'SQL & PostgreSQL',    level: 'Intermediate', score: 68 }
];

/* Small helper: query one element. */
const $ = (selector, scope = document) => scope.querySelector(selector);

/* ------------------------------------------------------------
   2. THEME — toggled by button, persisted in localStorage.
   ------------------------------------------------------------ */

const THEME_KEY = 'mb-portfolio-theme';
const themeToggle = $('#theme-toggle');
const themeIcon = $('#theme-icon');

const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  const isDark = theme === 'dark';
  themeIcon.textContent = isDark ? '☀' : '☾';
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
};

/* Restore the saved theme, falling back to the OS preference. */
const savedTheme = localStorage.getItem(THEME_KEY);
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(savedTheme ?? (prefersDark ? 'dark' : 'light'));

themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
});

/* ------------------------------------------------------------
   3. FAVOURITES — a saved list of projects, also in localStorage.
   ------------------------------------------------------------ */

const FAV_KEY = 'mb-portfolio-favourites';
const loadFavourites = () => JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]');
let favourites = loadFavourites();

const toggleFavourite = (id) => {
  favourites = favourites.includes(id)
    ? favourites.filter((favId) => favId !== id)   // remove
    : [...favourites, id];                          // add (spread)
  localStorage.setItem(FAV_KEY, JSON.stringify(favourites));
};

/* ------------------------------------------------------------
   4. SKILLS — rendered from the skills array into a <dl>.
   ------------------------------------------------------------ */

const renderSkills = () => {
  $('#skill-list').innerHTML = skills
    .map(({ name, level, score }) => `
      <div class="skill-row">
        <dt>${name}</dt>
        <dd class="meter" role="img" aria-label="${name}: ${level}">
          <span style="width:${score}%"></span>
        </dd>
        <dd class="skill-level">${level}</dd>
      </div>`)
    .join('');
};

/* ------------------------------------------------------------
   5. PROJECTS — filter buttons + cards rendered from the data.
   ------------------------------------------------------------ */

const grid = $('#project-grid');
const filterBar = $('#filter-bar');
const emptyState = $('#empty-state');
let activeFilter = 'All';

/* Unique tag list across all projects, built with flatMap + Set. */
const allTags = ['All', ...new Set(projects.flatMap(({ tags }) => tags))];

const renderFilters = () => {
  filterBar.innerHTML = allTags
    .map((tag) => `
      <button class="filter-btn" type="button" data-filter="${tag}"
              aria-pressed="${tag === activeFilter}">${tag}</button>`)
    .join('');
};

const cardTemplate = ({ id, title, period, image, summary, tags }) => {
  const isFav = favourites.includes(id);
  return `
    <article class="card" data-id="${id}">
      <div class="card-media">
        <img src="${image}" alt="Screenshot of ${title}" loading="lazy" width="1200" height="800" />
        <p class="card-period">${period}</p>
        <button class="fav-btn" type="button" data-fav="${id}"
                aria-pressed="${isFav}"
                aria-label="${isFav ? 'Remove' : 'Save'} ${title} ${isFav ? 'from' : 'to'} favourites">
          ${isFav ? '★' : '☆'}
        </button>
      </div>
      <div class="card-body">
        <h3>${title}</h3>
        <p>${summary}</p>
        <ul class="tag-list">${tags.map((tag) => `<li>${tag}</li>`).join('')}</ul>
        <div class="card-actions">
          <button class="link-btn" type="button" data-details="${id}">View details</button>
          <a href="https://github.com/mrinalbiju" target="_blank" rel="noopener">Repository ↗</a>
        </div>
      </div>
    </article>`;
};

const renderProjects = () => {
  const visible = activeFilter === 'All'
    ? projects
    : projects.filter(({ tags }) => tags.includes(activeFilter));

  grid.innerHTML = visible.map(cardTemplate).join('');
  emptyState.hidden = visible.length > 0;
};

/* Event delegation: one listener covers every card in the grid. */
grid.addEventListener('click', (event) => {
  const favBtn = event.target.closest('[data-fav]');
  if (favBtn) {
    toggleFavourite(favBtn.dataset.fav);
    renderProjects();
    return;
  }
  const detailBtn = event.target.closest('[data-details]');
  if (detailBtn) openModal(detailBtn.dataset.details);
});

filterBar.addEventListener('click', (event) => {
  const btn = event.target.closest('.filter-btn');
  if (!btn) return;
  activeFilter = btn.dataset.filter;
  renderFilters();
  renderProjects();
});

/* ------------------------------------------------------------
   6. MODAL — opens full project details on click.
   ------------------------------------------------------------ */

const modal = $('#project-modal');

const openModal = (id) => {
  const project = projects.find((item) => item.id === id);
  if (!project) return;

  const { title, period, image, summary, points, tags, links } = project;
  const modalImg = $('#modal-img');
  modalImg.src = image;
  modalImg.alt = `Screenshot of ${title}`;
  modalImg.hidden = false;
  $('#modal-title').textContent = title;
  $('#modal-period').textContent = period;
  $('#modal-desc').textContent = summary;
  $('#modal-points').innerHTML = points.map((point) => `<li>${point}</li>`).join('');
  $('#modal-tags').innerHTML = tags.map((tag) => `<li>${tag}</li>`).join('');
  $('#modal-links').innerHTML = [
    links.repo && `<a href="${links.repo}" target="_blank" rel="noopener">GitHub repository ↗</a>`,
    links.demo && `<a href="${links.demo}" target="_blank" rel="noopener">Live demo ↗</a>`
  ].filter(Boolean).join('');

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  $('.modal-close', modal).focus();
};

const closeModal = () => {
  modal.hidden = true;
  document.body.style.overflow = '';
};

modal.addEventListener('click', (event) => {
  if (event.target.hasAttribute('data-close')) closeModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modal.hidden) closeModal();
});

/* ------------------------------------------------------------
   7. MOBILE NAVIGATION — hamburger toggle.
   ------------------------------------------------------------ */

const navToggle = $('#nav-toggle');
const siteNav = $('#site-nav');

const setNav = (open) => {
  siteNav.classList.toggle('open', open);
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
};

navToggle.addEventListener('click', () => {
  setNav(navToggle.getAttribute('aria-expanded') !== 'true');
});

/* Close the menu after following an in-page link. */
siteNav.addEventListener('click', (event) => {
  if (event.target.tagName === 'A') setNav(false);
});

/* ------------------------------------------------------------
   8. SCROLL-TO-TOP — fixed button, shown past the hero.
   ------------------------------------------------------------ */

const toTop = $('#to-top');

window.addEventListener('scroll', () => {
  toTop.classList.toggle('visible', window.scrollY > 500);
});

toTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* The name in the header also returns to the top of the page. */
$('.logo').addEventListener('click', (event) => {
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ------------------------------------------------------------
   9. CONTACT FORM — regex validation, inline messages, no reload.
   ------------------------------------------------------------ */

const form = $('#contact-form');
const formSuccess = $('#form-success');

/* Validation rules, each with its own pattern and message. */
const rules = {
  name: {
    pattern: /^[A-Za-z][A-Za-z .'-]{1,49}$/,
    message: 'Enter your name using letters only (2–50 characters).'
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/,
    message: 'Enter a valid email address, e.g. name@company.com.'
  },
  message: {
    pattern: /^[\s\S]{10,600}$/,
    message: 'Your message should be between 10 and 600 characters.'
  }
};

const validateField = (fieldName) => {
  const input = $(`#${fieldName}`);
  const errorEl = $(`#${fieldName}-error`);
  const { pattern, message } = rules[fieldName];
  const value = input.value.trim();

  if (!value) {
    input.parentElement.classList.add('invalid');
    errorEl.textContent = 'This field is required.';
    return false;
  }
  if (!pattern.test(value)) {
    input.parentElement.classList.add('invalid');
    errorEl.textContent = message;
    return false;
  }
  input.parentElement.classList.remove('invalid');
  errorEl.textContent = '';
  return true;
};

/* Validate as the user types, but only once a field has been touched. */
Object.keys(rules).forEach((fieldName) => {
  const input = $(`#${fieldName}`);
  input.addEventListener('blur', () => validateField(fieldName));
  input.addEventListener('input', () => {
    if (input.parentElement.classList.contains('invalid')) validateField(fieldName);
  });
});

form.addEventListener('submit', (event) => {
  event.preventDefault();                       // no page reload
  formSuccess.hidden = true;

  /* Validate every field — .map avoids short-circuiting so all errors show. */
  const allValid = Object.keys(rules).map(validateField).every(Boolean);
  if (!allValid) {
    $('.field.invalid input, .field.invalid textarea')?.focus();
    return;
  }

  formSuccess.hidden = false;
  form.reset();
});

/* ------------------------------------------------------------
   10. SCROLL REVEAL — sections fade up as they enter the viewport.
   ------------------------------------------------------------ */

const revealTargets = document.querySelectorAll('[data-reveal]');

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);     // reveal once, then stop watching
    });
    /* threshold 0 — sections taller than the viewport would otherwise
       never satisfy a percentage threshold. */
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });

  revealTargets.forEach((el) => revealObserver.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add('is-visible'));
}

/* ------------------------------------------------------------
   11. SCROLL SPY — highlights the nav link for the section in view.
   ------------------------------------------------------------ */

const navLinks = [...document.querySelectorAll('.site-nav a')];
const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window && sections.length) {
  const setCurrent = (id) => {
    navLinks.forEach((link) => {
      const isCurrent = link.getAttribute('href') === `#${id}`;
      if (isCurrent) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  const spy = new IntersectionObserver((entries) => {
    /* Of everything on screen, mark the one nearest the top. */
    const onScreen = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

    if (onScreen.length) setCurrent(onScreen[0].target.id);
  }, { rootMargin: '-25% 0px -55% 0px' });

  sections.forEach((section) => spy.observe(section));
}

/* ------------------------------------------------------------
   12. INIT
   ------------------------------------------------------------ */

$('#year').textContent = new Date().getFullYear();
renderSkills();
renderFilters();
renderProjects();
