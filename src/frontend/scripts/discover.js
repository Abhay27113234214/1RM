import { logout } from "../../backend/auth.js";

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ---------- auth guard (same as home) ---------- */
const current_user = JSON.parse(localStorage.getItem('current_user'));
if (!current_user) {
  window.location.href = "http://127.0.0.1:5500/src/frontend/templates/index.html?message=not_logged_in&status=error";
}

/* ---------- dynamic user data (same as home) ---------- */
function dynamic_user_data_replacing() {
  let initials = "";
  current_user.name.trim().split(" ").forEach(spl => initials += spl[0].toUpperCase());
  $$('.current_user_initials').forEach(span => span.innerHTML = initials);
  $$('.current_user_name').forEach(ele =>
    ele.innerHTML = current_user.name.charAt(0).toUpperCase() + current_user.name.slice(1));
  $$('.current_user_username').forEach(ele =>
    ele.innerHTML = `@${current_user.username}`);
}
dynamic_user_data_replacing();

/* ---------- toasts (same markup/behaviour as index.js) ---------- */
function showToast(message, type = 'ok', duration = 3400) {
  let zone = $('#toastZone');
  if (!zone) {
    zone = document.createElement('div');
    zone.id = 'toastZone';
    zone.className = 'toast-zone';
    document.body.appendChild(zone);
  }
  const isError = type === 'error';
  const t = document.createElement('div');
  t.className = 'toast ' + (isError ? 't-err' : 't-ok');
  t.innerHTML =
    '<span class="t-star">✱</span>' +
    '<div class="t-body">' +
      '<b class="t-title">' + (isError ? 'Hold up' : 'Nice') + '</b>' +
      '<span class="t-msg">' + message + '</span>' +
    '</div>' +
    '<button class="t-x" aria-label="Dismiss">✕</button>' +
    '<i class="t-bar" style="animation-duration:' + duration + 'ms"></i>';
  zone.appendChild(t);
  let gone = false;
  function dismiss() {
    if (gone) return;
    gone = true;
    clearTimeout(timer);
    t.style.height = t.offsetHeight + 'px';
    requestAnimationFrame(() => {
      t.classList.add('bye');
      t.style.height = '0px';
      t.style.paddingTop = '0';
      t.style.paddingBottom = '0';
      t.style.marginTop = '-10px';
    });
    setTimeout(() => t.remove(), 500);
  }
  const timer = setTimeout(dismiss, duration);
  t.querySelector('.t-x').addEventListener('click', dismiss);
}

/* ---------- nav border on scroll (same as home) ---------- */
const navBar = $('#navBar');
const onScroll = () => navBar.classList.toggle('scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- date line (same as home) ---------- */
$('#todayLine').innerHTML = '<b>✱</b> ' +
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) +
  ' <span class="live-dot"></span>';

/* ---------- reveal on scroll (same as home) ---------- */
const io = new IntersectionObserver(es => es.forEach(x => {
  if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
}), { threshold: .1 });
$$('.reveal').forEach(el => io.observe(el));

/* ---------- slide-in menu (same as home) ---------- */
const drawer = $('#drawer'), drawerBack = $('#drawerBack'), burger = $('#burgerBtn');
function openDrawer() {
  drawer.classList.add('open'); drawerBack.classList.add('open'); burger.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  drawer.classList.remove('open'); drawerBack.classList.remove('open'); burger.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
}
burger.addEventListener('click', () => drawer.classList.contains('open') ? closeDrawer() : openDrawer());
drawerBack.addEventListener('click', closeDrawer);
$('#drawerX').addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

/* ---------- profile / settings / sign out (same as home) ---------- */
$$('[data-profile]').forEach(el => el.addEventListener('click', e => {
  e.preventDefault(); closeDrawer();
  // TODO: location.href = 'profile.html';
}));
$$('[data-todo]').forEach(el => el.addEventListener('click', e => {
  e.preventDefault();
  const action = el.dataset.todo;
  if (action === "settings") {
    // TODO: open settings
  } else if (action === "signout") {
    logout();
    window.location.href = "http://127.0.0.1:5500/src/frontend/templates/index.html?message=logged_out&status=success";
  }
}));

/* ============================================================
DATA — creators only, using the same image URLs from home.html.
Added `spots` to match home page's Spot feature.
============================================================ */
const IMG = {
  squat:   'https://image.qwenlm.ai/public_source/ee22d622-2276-4959-8a0e-f65a28451fea/1f41c75e0-9af2-44db-a45c-33950d808340.png',
  runner:  'https://image.qwenlm.ai/public_source/ee22d622-2276-4959-8a0e-f65a28451fea/1c1e9d2c0-5c2a-494d-8a3a-ad39e72ede97.png',
  strong:  'https://image.qwenlm.ai/public_source/ee22d622-2276-4959-8a0e-f65a28451fea/1cf2f6474-1f00-459e-98fc-d3a64e74e45d.png',
  barbell: 'https://image.qwenlm.ai/public_source/ee22d622-2276-4959-8a0e-f65a28451fea/1ca2da95c-b059-4cf3-99ed-e71f92315ded.png'
};

const CREATORS = [
  {
    id: 'c1', day: 'today', when: '2h',
    name: 'Maya Chen', handle: '@mayalifts', initials: 'MC', verified: true,
    followers: '12.4k', streak: 18, collabs: 12, comments: 8, plans: 214, spots: 142,
    title: 'Push days, heavy triples, honest logs.',
    img: IMG.barbell, tag: 'Push',
    rows: [
      { nm: 'Bench Press',    mt: '5 × 5 · 85 kg',  c: '#FF4A11', pr: true },
      { nm: 'Overhead Press', mt: '4 × 6 · 50 kg',  c: '#D89B0B' },
      { nm: 'Weighted Dips',  mt: '3 × 8 · +15 kg', c: '#1E9E6A' }
    ],
    comment: { who: 'Maya C.', when: '2h ago', text: 'Paused bench finally clicked — 2s down, explode up. Adding 2.5 kg Friday.' }
  },
  {
    id: 'c2', day: 'today', when: '5h',
    name: 'Jonas Weber', handle: '@jonaspulls', initials: 'JW', verified: false,
    followers: '3.1k', streak: 7, collabs: 4, comments: 3, plans: 46, spots: 38,
    title: 'Deadlift day is the best day.',
    img: IMG.strong, tag: 'Pull',
    rows: [
      { nm: 'Deadlift',          mt: '4 × 4 · 190 kg', c: '#FF4A11' },
      { nm: 'Weighted Pull-ups', mt: '4 × 6 · +24 kg', c: '#3B6FE0' },
      { nm: 'Barbell Row',       mt: '4 × 8 · 85 kg',  c: '#1E9E6A' }
    ],
    comment: { who: 'Jonas W.', when: '5h ago', text: 'RPE 7 across. Top sets moved fast — going heavier next week.' }
  },
  {
    id: 'c3', day: 'today', when: '8h',
    name: 'Priya Raman', handle: '@priya.sq', initials: 'PR', verified: true,
    followers: '8.9k', streak: 31, collabs: 9, comments: 14, plans: 128, spots: 215,
    title: 'Squat nerd. 31-day streak and counting.',
    img: IMG.squat, tag: 'Legs',
    rows: [
      { nm: 'Back Squat',            mt: '5 × 3 · 112.5 kg', c: '#FF4A11', pr: true },
      { nm: 'Romanian Deadlift',     mt: '3 × 8 · 100 kg',   c: '#1E9E6A' },
      { nm: 'Bulgarian Split Squat', mt: '3 × 10 · 22 kg',   c: '#3B6FE0' }
    ],
    comment: { who: 'Priya R.', when: '8h ago', text: '112.5 moved like 95 — film every top set, future me says thanks.' }
  },
  {
    id: 'c4', day: 'week', when: 'Mon',
    name: 'Coach Elena Voss', handle: '@elenavoss', initials: 'EV', verified: true,
    followers: '124k', streak: 64, collabs: 31, comments: 42, plans: 89, spots: 412,
    title: 'Programming that actually works.',
    img: IMG.barbell, tag: 'Coach',
    rows: [
      { nm: 'Bench Press',    mt: '4 × 6 · @80%',   c: '#FF4A11' },
      { nm: 'Overhead Press', mt: '4 × 8 · @75%',   c: '#D89B0B' },
      { nm: 'Weighted Dips',  mt: '3 × 8 · +20 kg', c: '#1E9E6A' }
    ],
    comment: { who: 'Elena V.', when: 'Mon', text: 'Week 3 of 8 — RPE 7–8, no grinders. Volume drops in the deload.' }
  },
  {
    id: 'c5', day: 'week', when: 'Tue',
    name: 'Tomás Silva', handle: '@tomascore', initials: 'TS', verified: false,
    followers: '940', streak: 4, collabs: 2, comments: 1, plans: 21, spots: 12,
    title: 'Small account, big engines.',
    img: IMG.runner, tag: 'Core',
    rows: [
      { nm: 'Ab Wheel',          mt: '4 × 12',        c: '#D89B0B' },
      { nm: 'Hanging Leg Raise', mt: '3 × 12',        c: '#FF4A11' },
      { nm: '5K Run',            mt: '24:30 · tempo', c: '#D6486F' }
    ],
    comment: { who: 'Tomás S.', when: 'Tue', text: 'Zone 2 the whole way. Nose-breathing pace, no heroics.' }
  },
  {
    id: 'c6', day: 'week', when: 'Wed',
    name: 'Sana Fit', handle: '@sanafit', initials: 'SF', verified: true,
    followers: '210k', streak: 45, collabs: 21, comments: 67, plans: 172, spots: 864,
    title: 'No gym? No problem.',
    img: IMG.barbell, tag: 'Home',
    rows: [
      { nm: 'Goblet Squat',  mt: '4 × 12 · 24 kg',     c: '#1E9E6A' },
      { nm: 'DB RDL',        mt: '4 × 10 · 2 × 16 kg', c: '#FF4A11' },
      { nm: 'Walking Lunge', mt: '3 × 12 · 2 × 10 kg', c: '#3B6FE0' }
    ],
    comment: { who: 'Sana F.', when: 'Wed', text: 'No rack, no problem. 40 minutes, one pair of dumbbells.' }
  }
];

/* second batch, appended by Load more */
const EXTRA = [
  {
    id: 'c7', day: 'week', when: 'last week',
    name: 'Marcus Iron', handle: '@marcusiron', initials: 'MI', verified: true,
    followers: '86.5k', streak: 22, collabs: 15, comments: 23, plans: 96, spots: 320,
    title: 'Bench specialization is a lifestyle.',
    img: IMG.barbell, tag: 'Bench',
    rows: [
      { nm: 'Close-grip Bench', mt: '5 × 5 · 100 kg', c: '#FF4A11', pr: true },
      { nm: 'Weighted Dips',    mt: '4 × 8 · +20 kg', c: '#1E9E6A' },
      { nm: 'JM Press',         mt: '3 × 10 · 40 kg', c: '#D89B0B' }
    ],
    comment: { who: 'Marcus I.', when: 'last week', text: 'Benching often beats benching sometimes. Volume first, intensity later.' }
  },
  {
    id: 'c8', day: 'week', when: 'last week',
    name: 'Leo Park', handle: '@leopark', initials: 'LP', verified: false,
    followers: '12.4k', streak: 40, collabs: 6, comments: 9, plans: 64, spots: 95,
    title: 'Skills before sets.',
    img: IMG.strong, tag: 'Skills',
    rows: [
      { nm: 'Muscle-ups',        mt: '5 × 3',          c: '#FF4A11' },
      { nm: 'Weighted Pull-ups', mt: '4 × 5 · +32 kg', c: '#3B6FE0' },
      { nm: 'Front Lever Rows',  mt: '4 × 6 · tuck',   c: '#1E9E6A' }
    ],
    comment: { who: 'Leo P.', when: 'last week', text: 'Fresh nervous system, nothing to failure.' }
  },
  {
    id: 'c9', day: 'week', when: 'last week',
    name: 'Ava Strong', handle: '@avastrong', initials: 'AS', verified: false,
    followers: '18.9k', streak: 12, collabs: 8, comments: 11, plans: 88, spots: 184,
    title: 'Heavy days, honest logs.',
    img: IMG.squat, tag: 'Glutes',
    rows: [
      { nm: 'Hip Thrust',     mt: '4 × 10 · 140 kg', c: '#FF4A11', pr: true },
      { nm: 'B-stance RDL',   mt: '3 × 8 · 40 kg',   c: '#1E9E6A' },
      { nm: 'Cable Kickback', mt: '3 × 15 · 25 kg',  c: '#D6486F' }
    ],
    comment: { who: 'Ava S.', when: 'last week', text: 'PR attempt Friday — who wants to collab and load plates?' }
  },
  {
    id: 'c10', day: 'week', when: 'last week',
    name: 'Nia Okafor', handle: '@niaokafor', initials: 'NO', verified: true,
    followers: '22k', streak: 29, collabs: 11, comments: 17, plans: 54, spots: 210,
    title: 'Lift heavy, run far, recover properly.',
    img: IMG.runner, tag: 'Cardio',
    rows: [
      { nm: '5K Run',      mt: '22:48 · tempo PR', c: '#FF4A11', pr: true },
      { nm: 'Rowing',      mt: '4 × 500 m',        c: '#3B6FE0' },
      { nm: 'Incline Walk',mt: '20 min · zone 2',  c: '#1E9E6A' }
    ],
    comment: { who: 'Nia O.', when: 'last week', text: 'The engine is built in zone 2, proven on race day.' }
  }
];

/* ============================================================
RENDER — card markup is a 1:1 copy of home's post card
Added the Spot button inside p-acts.
============================================================ */
const following = new Set();

function creatorHTML(c) {
  const isF = following.has(c.handle);
  const rows = c.rows.map(r => `
    <div class="p-row${r.pr ? ' pr' : ''}" style="--c:${r.c}">
      <span class="nm">${r.nm}</span>
      <span class="mt">${r.pr ? '<b class="pr-tag">PR</b> ' : ''}${r.mt}</span>
    </div>`).join('');

  return `
  <div class="post-shell reveal" data-id="${c.id}">
    <article class="post" tabindex="0" role="button" aria-label="Open ${c.name}'s profile">
      <div class="p-head">
        <span class="av">${c.initials}</span>
        <div class="p-who">
          <div class="p-name">${c.name}${c.verified ? '<i class="vbadge" title="Verified">✱</i>' : ''}</div>
          <div class="p-meta">${c.handle} · ${c.followers} followers · ${c.when}</div>
        </div>
        <span class="streak">✱ ${c.streak}-day streak</span>
      </div>

      <h3 class="p-title">${c.title}</h3>

      <div class="p-img">
        <img src="${c.img}" alt="${c.name} training" loading="lazy">
        <span class="img-tag">✱ <b>${c.tag}</b></span>
      </div>

      <div class="p-rows">${rows}</div>

      <div class="p-foot">
        <span><b>${c.followers}</b> followers</span>
        <span><b>${c.plans}</b> plans shared</span>
        <span><b>${c.collabs}</b> collabs</span>
      </div>

      <div class="p-acts">
        <button class="act" data-action="spot"><span class="st">✱</span>Spot · <span data-count>${c.spots}</span></button>
        <button class="act${isF ? ' on' : ''}" data-action="follow" data-follow-id="${c.handle}">
          <span class="st">✱</span><span class="lb">${isF ? 'Following' : 'Follow'}</span>
        </button>
        <button class="act" data-action="collab" data-name="${c.name}">
          <span class="st">✱</span><span class="lb">Collab</span> · <b data-count>${c.collabs}</b>
        </button>
        <button class="act" data-action="comment">
          <span class="lb">Comment</span> · <b>${c.comments}</b>
        </button>
        <button class="act share" data-action="share"><span class="lb">Share</span></button>
      </div>

      <div class="p-comment"><b>${c.comment.who} · ${c.comment.when}</b>"${c.comment.text}"</div>

      <div class="p-cbox" hidden>
        <input type="text" placeholder="Say something nice…" />
        <button class="act" data-action="post">Post</button>
      </div>
    </article>
  </div>`;
}

function renderFeed() {
  const feed = $('#feed');
  if (!CREATORS.length) {
    feed.innerHTML = `
      <div class="d-empty">
        <b>No public <span>creators</span> yet ✱</b>
        Check back soon — the open gym is opening.
      </div>`;
    return;
  }

  const sep   = label => `<div class="day-sep">${label}</div>`;
  const today = CREATORS.filter(c => c.day === 'today');
  const week  = CREATORS.filter(c => c.day === 'week');

  let html = sep(CREATORS.length + ' public ' + (CREATORS.length === 1 ? 'creator' : 'creators'));
  if (today.length) html += today.map(creatorHTML).join('');
  if (week.length)  html += sep('Earlier this week') + week.map(creatorHTML).join('');
  feed.innerHTML = html;

  feed.querySelectorAll('.reveal').forEach(el => io.observe(el));

  feed.querySelectorAll('.post').forEach(post => {
    const open = () => {
      const id = post.closest('.post-shell').dataset.id;
      // TODO: location.href = 'profile.html?id=' + id;
      console.log('open profile', id);
    };
    post.addEventListener('click', e => {
      if (e.target.closest('button, a, input')) return;
      open();
    });
    post.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
}
renderFeed();

/* ---------- keep every Follow button for a handle in sync (feed + rail) ---------- */
function syncFollow(handle, on) {
  $$('[data-follow-id="' + handle + '"]').forEach(btn => {
    btn.classList.toggle('on', on);
    if (btn.classList.contains('f-btn')) {
      btn.textContent = on ? 'Following' : 'Follow';
    } else {
      const lb = btn.querySelector('.lb');
      if (lb) lb.textContent = on ? 'Following' : 'Follow';
    }
  });
}

/* ---------- all card actions (delegated, same pattern as home.js) ---------- */
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === 'spot') {
    const on = btn.classList.toggle('on');
    const n = btn.querySelector('[data-count]');
    if (n) n.textContent = (+n.textContent) + (on ? 1 : -1);
  }

  else if (action === 'follow') {
    const handle = btn.dataset.followId;
    const on = !following.has(handle);
    on ? following.add(handle) : following.delete(handle);
    syncFollow(handle, on);
    if (on) showToast('Following ' + handle + ' ✱ Their posts will show in your feed.');
    // TODO: call your follow/unfollow endpoint with `handle`
  }

  else if (action === 'collab') {
    const on = btn.classList.toggle('on');
    const n = btn.querySelector('[data-count]');
    if (n) n.textContent = (+n.textContent) + (on ? 1 : -1);
    if (on) showToast('Collab request sent to ' + btn.dataset.name + ' ✱');
    // TODO: call your collab-request endpoint
  }

  else if (action === 'comment') {
    const box = btn.closest('.post').querySelector('.p-cbox');
    if (box) { box.hidden = !box.hidden; if (!box.hidden) box.querySelector('input').focus(); }
  }

  else if (action === 'post') {
    const box = btn.closest('.p-cbox');
    const input = box.querySelector('input');
    if (!input.value.trim()) { showToast('Write something first ✱', 'error'); return; }
    showToast('Comment posted ✱');
    // TODO: call your comment endpoint with input.value
    input.value = '';
    box.hidden = true;
  }

  else if (action === 'share') {
    const id = btn.closest('.post-shell')?.dataset.id || '';
    if (navigator.clipboard) navigator.clipboard.writeText(location.href.split('#')[0] + '#' + id).catch(() => {});
    showToast('Profile link copied ✱');
  }
});

/* ---------- load more (pagination stub) ---------- */
let extraLoaded = false;
$('#loadMore').addEventListener('click', () => {
  if (extraLoaded) return;
  extraLoaded = true;
  CREATORS.push(...EXTRA);
  renderFeed();
  const b = $('#loadMore');
  b.textContent = "You're all caught up ✱";
  b.classList.add('done');
  // TODO: replace with real pagination
});

/* ---------- rail → mobile carousel dots (same as home.js) ---------- */
const railEl = document.querySelector('.home .rail');
if (railEl) {
  const slides = Array.from(railEl.children).filter(c => !c.classList.contains('rail-foot'));
  const railDots = document.querySelector('.rail-dots');
  slides.forEach(() => railDots.appendChild(document.createElement('i')));
  const dotList = Array.from(railDots.children);
  const syncDots = () => {
    const left = railEl.getBoundingClientRect().left;
    let idx = 0, best = Infinity;
    slides.forEach((s, i) => {
      const d = Math.abs(s.getBoundingClientRect().left - left - 20);
      if (d < best) { best = d; idx = i; }
    });
    dotList.forEach((dd, i) => dd.classList.toggle('on', i === idx));
  };
  railEl.addEventListener('scroll', () => requestAnimationFrame(syncDots), { passive: true });
  window.addEventListener('resize', syncDots);
  syncDots();
}