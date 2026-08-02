/* ═══════════════════════════════════════════════════════
   SVERSE · UI design-file behaviour
   Just enough interactivity to review the designs: tabs,
   modals, toasts, toggles. No data layer — these are
   design files, not the app.
   ═══════════════════════════════════════════════════════ */

/* ── image helper ────────────────────────────────────── */
/* Lorem images keep the designs looking real. If the host
   is unreachable the gradient behind the <img> shows, so a
   page never renders as broken-image icons. */
const IMG = (seed, w, h) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

document.addEventListener('DOMContentLoaded', () => {
  /* tabs — [data-tabs] wraps buttons with data-tab, panes use data-pane */
  document.querySelectorAll('[data-tabs]').forEach((group) => {
    const scope = group.closest('[data-tabscope]') || document;
    group.querySelectorAll('button[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('button[data-tab]').forEach((b) => b.classList.remove('on'));
        scope.querySelectorAll('[data-pane]').forEach((p) => p.classList.remove('on'));
        btn.classList.add('on');
        const pane = scope.querySelector(`[data-pane="${btn.dataset.tab}"]`);
        if (pane) pane.classList.add('on');
        if (history.replaceState) {
          const u = new URL(location.href);
          u.searchParams.set('tab', btn.dataset.tab);
          history.replaceState(null, '', u);
        }
      });
    });
  });

  /* deep link ?tab= */
  const wanted = new URLSearchParams(location.search).get('tab');
  if (wanted) {
    const btn = document.querySelector(`button[data-tab="${wanted}"]`);
    if (btn) btn.click();
  }

  /* radio picks */
  document.querySelectorAll('[data-picks]').forEach((group) => {
    group.querySelectorAll('.pick').forEach((p) => {
      p.addEventListener('click', () => {
        group.querySelectorAll('.pick').forEach((x) => x.classList.remove('on'));
        p.classList.add('on');
      });
    });
  });

  /* toggles */
  document.querySelectorAll('.toggle').forEach((t) =>
    t.addEventListener('click', () => t.classList.toggle('on'))
  );

  /* modal open/close */
  document.querySelectorAll('[data-open]').forEach((btn) =>
    btn.addEventListener('click', () => openModal(btn.dataset.open))
  );
  document.querySelectorAll('.backdrop').forEach((back) => {
    back.querySelectorAll('[data-close]').forEach((x) =>
      x.addEventListener('click', () => (back.hidden = true))
    );
    back.addEventListener('click', (e) => { if (e.target === back) back.hidden = true; });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.backdrop:not([hidden])').forEach((b) => (b.hidden = true));
  });

  /* demo toasts */
  document.querySelectorAll('[data-toast]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const [ico, title, body] = btn.dataset.toast.split('|');
      toast(ico, title, body || '');
    })
  );

  /* equip buttons flip label in place */
  document.querySelectorAll('[data-equip]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const card = btn.closest('.item');
      const on = card.classList.toggle('on');
      btn.textContent = on ? 'Equipped ✓' : 'Equip';
      btn.classList.toggle('btn--grad', on);
      btn.classList.toggle('btn--ghost', !on);
      toast('🧥', on ? 'Equipped' : 'Unequipped', 'Loadout syncs to every T1 game you play.');
    })
  );
});

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.hidden = false;
}

function toast(ico, title, body) {
  let host = document.querySelector('.toasts');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toasts';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${ico}</span><div><strong>${title}</strong><small>${body}</small></div>`;
  host.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, 4000);
}

/* ── shared chrome renderers ─────────────────────────── */
const LOGO = `<svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
  <path d="M20 2 L36 12 L36 28 L20 38 L4 28 L4 12 Z" stroke="currentColor" stroke-width="2.5"/>
  <path d="M25 12 L15 12 L15 19 L25 19 L25 28 L15 28" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
</svg>`;

const NAVS = {
  player: {
    label: 'Player',
    items: [
      { href: '../01-store/store-browse.html', ico: '🛍', t: 'Store' },
      { href: '../01-store/market-global.html', ico: '⇄', t: 'Market' },
      { href: '../02-passport/inventory.html', ico: '🪪', t: 'My Passport' },
      { href: '../02-passport/wardrobe.html', ico: '🧥', t: 'Wardrobe' },
      { href: '../02-passport/deeds.html', ico: '📜', t: 'Deeds' },
      { href: '../02-passport/rewards.html', ico: '⚖️', t: 'Play-and-Earn' },
    ],
  },
  studio: {
    label: 'Studio console',
    items: [
      { href: '../03-studio/overview.html', ico: '◈', t: 'Overview' },
      { href: '../03-studio/game-editor.html', ico: '🎮', t: 'Games' },
      { href: '../03-studio/publish-wizard.html', ico: '🚀', t: 'Publish' },
      { href: '../03-studio/payouts.html', ico: '💰', t: 'Payouts' },
      { href: '../03-studio/settings.html', ico: '⚙', t: 'Settings' },
    ],
  },
  admin: {
    label: 'Admin',
    items: [
      { href: '../04-admin/reviews.html', ico: '🛡', t: 'Review queue' },
      { href: '../04-admin/ledger.html', ico: '📊', t: 'Ledger' },
    ],
  },
};

/**
 * Renders sidebar + topbar into .side / .top.
 * @param {'player'|'studio'|'admin'} nav
 * @param {string} active  href suffix to mark active, e.g. 'inventory.html'
 * @param {string} crumb   HTML for the breadcrumb
 * @param {string} balance SRV display value
 */
function chrome(nav, active, crumb, balance = '2,450') {
  const side = document.querySelector('.side');
  const top = document.querySelector('.top');
  const cfg = NAVS[nav];

  if (side) {
    const other = Object.entries(NAVS)
      .filter(([k]) => k !== nav)
      .map(([k, v]) => `<a href="${v.items[0].href}"><span class="side__ico">↗</span>${v.label}</a>`)
      .join('');
    side.innerHTML = `
      <a class="side__logo" href="../index.html">${LOGO}<b>SVERSE</b></a>
      <nav class="side__group">
        <p class="side__label">${cfg.label}</p>
        ${cfg.items
          .map(
            (i) =>
              `<a href="${i.href}" class="${i.href.endsWith(active) ? 'on' : ''}">
                 <span class="side__ico">${i.ico}</span>${i.t}</a>`
          )
          .join('')}
      </nav>
      <nav class="side__group">
        <p class="side__label">Switch context</p>
        ${other}
      </nav>
      <div class="side__foot">
        <a href="../index.html">← UI design index</a>
        <a href="../../website/index.html">Landing page ↗</a>
      </div>`;
  }

  if (top) {
    top.innerHTML = `
      <div class="crumb">${crumb}</div>
      <div class="top__right">
        <span class="balance"><i>S</i><span class="num">${balance}</span> SRV</span>
        <span class="avatar"><img src="${IMG('passport-you', 68, 68)}" alt="Your avatar" /></span>
      </div>`;
  }
}

/* ── storefront chrome (wide, no sidebar) ────────────── */
const SFNAV = [
  { href: '../01-store/store-browse.html', t: 'Games' },
  { href: '../01-store/market-global.html', t: 'Items & Market' },
  { sep: true },
  { href: '../02-passport/inventory.html', t: 'My library' },
  { href: '../02-passport/wardrobe.html', t: 'Wardrobe' },
  { href: '../02-passport/deeds.html', t: 'Deeds' },
  { href: '../02-passport/rewards.html', t: 'Rewards' },
];

/**
 * Wide storefront top bar. Replaces the sidebar shell on store/passport pages.
 * @param {string} active   href suffix to mark active
 * @param {string} balance  SRV display value
 * @param {string} placeholder  search placeholder
 */
function sfchrome(active, balance = '2,450', placeholder = 'Search games, items, studios…') {
  const host = document.querySelector('.sftop');
  if (!host) return;
  host.innerHTML = `
    <div class="sfwrap">
      <div class="sftop__r1">
        <a class="sftop__logo" href="../index.html">${LOGO}<b>SVERSE</b></a>
        <div class="sfsearch">
          <span class="sfsearch__i">⌕</span>
          <input placeholder="${placeholder}" />
        </div>
        <div class="sftop__right">
          <span class="balance"><i>S</i><span class="num">${balance}</span> SRV</span>
          <a class="btn btn--ghost btn--sm" href="../03-studio/overview.html">Studio ↗</a>
          <span class="avatar"><img src="${IMG('passport-you', 68, 68)}" alt="Your avatar" /></span>
        </div>
      </div>
    </div>
    <div class="sfwrap">
      <nav class="sfnav">
        ${SFNAV.map((n) =>
          n.sep
            ? '<span class="sfnav__sep"></span>'
            : `<a href="${n.href}" class="${n.href.endsWith(active) ? 'on' : ''}">${n.t}</a>`
        ).join('')}
      </nav>
    </div>`;
}

/** Hero carousel dot sync + arrow nav. */
function sfcarousel() {
  const hero = document.querySelector('.sfhero');
  if (!hero) return;
  const track = hero.querySelector('.sfhero__track');
  const dots = hero.querySelectorAll('.sfdots i');
  if (!track || !dots.length) return;
  track.addEventListener('scroll', () => {
    const i = Math.round(track.scrollLeft / track.clientWidth);
    dots.forEach((d, n) => d.classList.toggle('on', n === i));
  }, { passive: true });
  dots.forEach((d, n) =>
    d.addEventListener('click', () => track.scrollTo({ left: n * track.clientWidth, behavior: 'smooth' }))
  );
}
document.addEventListener('DOMContentLoaded', sfcarousel);

/**
 * Renders the design-file banner.
 * @param {string} id    page id, e.g. 'P-01'
 * @param {string} name  page name
 * @param {Array<[string,string]>} refs  [label, href] spec references
 */
function dfbar(id, name, refs = []) {
  const el = document.querySelector('.dfbar');
  if (!el) return;
  el.innerHTML = `
    <span class="dfbar__id">${id}</span>
    <span>${name}</span>
    <span class="dfbar__spec">
      ${refs.map(([l, h]) => `<a href="${h}">${l}</a>`).join('')}
      <a href="../index.html">All screens</a>
    </span>`;
}
