import { logout } from "../../backend/auth.js";
/* ============================================================
   Visual-only glue. YOUR logic plugs into the TODOs:
     hasWorkoutToday       → hide #startWorkout when true
     .post click / Enter   → open workout detail page   (TODO)
     [data-profile]        → open profile page          (TODO)
     [data-todo]           → settings / sign out        (TODO)
     #feed, #feed2         → render with #postTpl
     #loadMore             → pagination
   ============================================================ */

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
// similar arrow functions for quick dom element selection

const current_user = JSON.parse(localStorage.getItem('current_user'))
if (!current_user) {
    window.location.href = "http://127.0.0.1:5500/src/frontend/templates/index.html?message=not_logged_in&status=error"
}

function dynamic_user_data_replacing() {
    // for the initials 
    let user_initial_spans = $$('.current_user_initials')
    let initials = ""
    current_user.name.trim().split(" ").forEach((spl) => initials += spl[0].toUpperCase())
    user_initial_spans.forEach((span) => {
        span.innerHTML = initials
    })

    // for name 
    let user_name_ele = $$('.current_user_name')
    user_name_ele.forEach((ele) => {
        ele.innerHTML = current_user.name.charAt(0).toUpperCase() + current_user.name.slice(1)
    })

    // for username 
    let user_username_ele = $$('.current_user_username')
    user_username_ele.forEach((ele) => {
        ele.innerHTML = `@${current_user.username}`
    })
}
dynamic_user_data_replacing()

/* nav border on scroll */
const navBar = $('#navBar');
const onScroll = () => navBar.classList.toggle('scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* date line */
$('#todayLine').innerHTML = '<b>✱</b> ' + new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) + ' <span class="live-dot"></span>';

/* ---------- start workout card: only if nothing logged today ---------- */
// TODO: replace with your real check (your store / API)
const hasWorkoutToday = false;
if (hasWorkoutToday) $('#startWorkout').hidden = true;

/* reveal on scroll */
const io = new IntersectionObserver(es => es.forEach(x => {
    if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
}), { threshold: .1 });
$$('.reveal').forEach(el => io.observe(el));

/* ---------- slide-in menu ---------- */
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

/* ---------- TODO: profile / settings / sign out ---------- */
$$('[data-profile]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault(); closeDrawer();
    // TODO: open the profile page, e.g. location.href = 'profile.html';
}));
$$('[data-todo]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    let action = el.dataset.todo
    if (action === "settings") {

    } else if (action === "signout") {
        logout()
        window.location.href = "http://127.0.0.1:5500/src/frontend/templates/index.html?message=logged_out&status=success"
    }
}));

/* ---------- TODO: clicking a workout card opens its page ---------- */
$$('.post').forEach(p => {
    const open = () => {
        // TODO: open this workout's detail page, e.g.:
        // location.href = 'workout.html?id=' + p.closest('.post-shell').dataset.id;
    };
    p.addEventListener('click', e => {
        if (e.target.closest('button, a, input')) return; /* inner controls handle themselves */
        open();
    });
    p.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
});

/* ---------- visual-only: spot / follow / comment ---------- */
document.addEventListener('click', e => {
    const spot = e.target.closest('[data-action="spot"]');
    if (spot) {
        const on = spot.classList.toggle('on');
        const n = spot.querySelector('[data-count]');
        if (n) n.textContent = (+n.textContent) + (on ? 1 : -1);
    }
    const follow = e.target.closest('[data-action="follow"]');
    if (follow) {
        const on = follow.classList.toggle('on');
        follow.textContent = on ? 'Following ✱' : 'Follow';
    }
    const cmt = e.target.closest('[data-action="comment"]');
    if (cmt) {
        const box = cmt.closest('.post').querySelector('.p-cbox');
        if (box) { box.hidden = !box.hidden; if (!box.hidden) box.querySelector('input').focus(); }
    }
});

const railEl = document.querySelector('.home .rail');
if (railEl) {
    const slides = Array.from(railEl.children).filter(c => !c.classList.contains('rail-foot'));
    const railDots = document.createElement('div');
    railDots.className = 'rail-dots';
    slides.forEach(() => railDots.appendChild(document.createElement('i')));
    railEl.after(railDots);
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

(function () {
  const banner = $('#profileBanner');
  if (!banner) return;

  let user = null;
  try { user = JSON.parse(localStorage.getItem('current_user')); } catch (e) {}
  if (!user) return;

  const userKey = user.email || user.username || user.id || 'me';

  if (user.incomplete === true) {
    banner.hidden = false;
  }

  /* ✕ — dismiss, and remember it for this user */
  $('#profileBannerX').addEventListener('click', () => {
    hideBanner();
  });

  /* banner click — open your profile-completion flow */
  $('#profileBannerLink').addEventListener('click', e => {
    e.preventDefault();
    // TODO: route to your measurements/goals setup, e.g.:
    // location.href = 'profile.html?setup=1';
  });

  function hideBanner() {
    /* lock the height, then collapse smoothly so the page doesn't jump */
    banner.style.height = banner.offsetHeight + 'px';
    requestAnimationFrame(() => {
      banner.classList.add('bye');
      banner.style.height = '0px';
      banner.style.marginTop = '0';
      banner.style.paddingTop = '0';
      banner.style.paddingBottom = '0';
    });
    setTimeout(() => banner.remove(), 450); /* safety net */
  }
})();