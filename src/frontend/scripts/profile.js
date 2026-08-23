
/* ============================================================
   Profile glue — same patterns as home.js / index.js.
   TODOs mark your backend hooks.
============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

/* ---------- current user (home.js pattern + demo fallback) ---------- */
let current_user = null;
try { current_user = JSON.parse(localStorage.getItem('current_user')); } catch (e) { }
/* TODO: for strict auth remove this fallback and redirect like home.js */
if (!current_user || !current_user.name) {
    current_user = { name: 'Alex Kowalski', username: 'alexk_fit', email: 'alex@example.com' };
}
function applyUser() {
    const name = current_user.name.trim();
    let initials = '';
    name.split(/\s+/).forEach(p => { if (p) initials += p[0].toUpperCase(); });
    $$('.current_user_initials').forEach(el => el.textContent = initials);
    $$('.current_user_name').forEach(el => {
        el.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    });
    $$('.current_user_username').forEach(el => {
        el.textContent = '@' + String(current_user.username || '').replace(/^@/, '');
    });
    const parts = name.split(/\s+/);
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ');
    $('#greetName').innerHTML = escHtml(first.toUpperCase()) +
        (last ? ' <em>' + escHtml(last) + '</em>' : '');
}
applyUser();

/* ---------- toast (home.js) ---------- */
function showToast(message, type = 'ok', duration = 3800) {
    const zone = $('#toastZone');
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
        t.addEventListener('animationend', () => t.remove());
        setTimeout(() => t.remove(), 500);
    }
    const timer = setTimeout(dismiss, duration);
    t.querySelector('.t-x').addEventListener('click', dismiss);
}

/* ---------- nav border ---------- */
const navBar = $('#navBar');
const onScroll = () => navBar.classList.toggle('scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ---------- date line ---------- */
$('#dateLine').innerHTML = '<b>✱</b> ' +
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) +
    ' <span class="live-dot"></span>';

/* ---------- drawer ---------- */
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
$$('[data-todo]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    closeDrawer();
    const action = el.dataset.todo;
    if (action === 'settings') {
        $('#settingsPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (action === 'signout') {
        signOut();
    }
}));

/* ---------- reveal ---------- */
const io = new IntersectionObserver(es => es.forEach(x => {
    if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
}), { threshold: .1 });
$$('.reveal').forEach(el => io.observe(el));

/* ---------- counters ---------- */
const fmtInt = n => Math.round(n).toLocaleString('en-US');
const cio = new IntersectionObserver(es => es.forEach(x => {
    if (!x.isIntersecting) return;
    cio.unobserve(x.target);
    const el = x.target;
    const target = parseFloat(el.dataset.count);
    const t0 = performance.now(), dur = 1400;
    (function tick(t) {
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmtInt(target * e);
        if (p < 1) requestAnimationFrame(tick);
    })(t0);
}), { threshold: .5 });
$$('[data-count]').forEach(el => cio.observe(el));

/* ---------- month calendar: real weeks, Mon→Sun, 4 rows ---------- */
(function buildMonth() {
    const grid = $('#monthGrid');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const mondayIdx = (today.getDay() + 6) % 7;
    const start = new Date(today);
    start.setDate(today.getDate() - mondayIdx - 21);

    const corner = document.createElement('span');
    corner.className = 'm-corner'; corner.textContent = 'wk';
    grid.appendChild(corner);
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(d => {
        const s = document.createElement('span');
        s.className = 'm-dow'; s.textContent = d;
        grid.appendChild(s);
    });

    let mseed = 23;
    const mrnd = () => { mseed = (mseed * 1103515245 + 12345) % 2147483648; return mseed / 2147483648; };

    for (let w = 0; w < 4; w++) {
        const rowStart = new Date(start);
        rowStart.setDate(start.getDate() + w * 7);
        const lbl = document.createElement('span');
        lbl.className = 'm-lbl';
        lbl.textContent = rowStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        grid.appendChild(lbl);

        for (let d = 0; d < 7; d++) {
            const date = new Date(rowStart);
            date.setDate(rowStart.getDate() + d);
            const diff = Math.round((today - date) / 86400000);
            const dstr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const cell = document.createElement('div');

            if (diff < 0) {
                cell.className = 'm-cell future';
                cell.dataset.tip = dstr + ' · coming up';
            } else {
                const dow = date.getDay();
                let level;
                if (diff === 0) level = 4;
                else if (diff <= 6) level = diff % 2 ? 2 : 3;
                else if (dow === 0) level = mrnd() < .3 ? 1 : 0;
                else level = mrnd() < .62
                    ? Math.min(4, 1 + Math.floor(mrnd() * 3) + (mrnd() < .14 ? 1 : 0))
                    : 0;
                cell.className = 'm-cell l' + level + (diff === 0 ? ' today' : '');
                if (level === 0) {
                    cell.dataset.tip = dstr + ' · rest day';
                } else {
                    const sessions = level > 2 ? 2 : 1;
                    const vol = sessions * (24 + Math.floor(mrnd() * 22)) * 100;
                    cell.dataset.tip = dstr + ' · ' + sessions +
                        (sessions > 1 ? ' sessions' : ' session') + ' · ' + vol.toLocaleString('en-US') + ' kg';
                }
            }
            grid.appendChild(cell);
        }
    }
})();

/* ---------- goals chips / segs ---------- */
$$('[data-group]').forEach(group => {
    group.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            group.querySelectorAll('button').forEach(b => b.classList.remove('active', 'on'));
            btn.classList.add(group.classList.contains('seg') ? 'on' : 'active');
            showToast('Preferences saved ✱ coach recalibrated.');
            /* TODO: persist via your backend */
        });
    });
});

/* ---------- settings toggles ---------- */
$$('.toggle').forEach(t => t.addEventListener('click', () => {
    const on = t.classList.toggle('on');
    showToast((t.dataset.name || 'Setting') + (on ? ' — on ✱' : ' — off.'));
    /* TODO: persist */
}));

/* ---------- post interactions ---------- */
document.addEventListener('click', e => {
    const spot = e.target.closest('[data-action="spot"]');
    if (spot) {
        const on = spot.classList.toggle('on');
        const n = spot.querySelector('.spot-n');
        if (n) n.textContent = (+n.textContent) + (on ? 1 : -1);
        if (on) showToast('Spotted ✱ they felt that.');
        /* TODO: persist */
    }
    const cmt = e.target.closest('[data-action="comment"]');
    if (cmt) {
        const box = cmt.closest('.post').querySelector('.p-cbox');
        if (box) { box.hidden = !box.hidden; if (!box.hidden) box.querySelector('input').focus(); }
    }
    const share = e.target.closest('[data-action="share"]');
    if (share) showToast('Link copied ✱ share the grind.');
    const postBtn = e.target.closest('[data-action="post-comment"]');
    if (postBtn) {
        const box = postBtn.closest('.p-cbox');
        const input = box.querySelector('input');
        const val = input.value.trim();
        if (!val) { showToast('Say something first ✱', 'error'); return; }
        const post = box.closest('.post');
        const c = document.createElement('div');
        c.className = 'p-comment';
        c.innerHTML = '<b>You · just now</b>' + escHtml(val);
        post.insertBefore(c, post.querySelector('.p-acts'));
        input.value = '';
        box.hidden = true;
        showToast('Comment posted ✱');
        /* TODO: persist */
    }
});

$('#loadMore').addEventListener('click', () => {
    showToast('Older sessions load here ✱ wire up your pagination.');
});
$('#prHistory').addEventListener('click', () => {
    showToast('Full PR history opens here ✱ wire up the page.');
});
$('#exportBtn').addEventListener('click', () => {
    showToast('Exporting your log ✱ CSV on its way.');
    /* TODO: your real export */
});
function signOut() {
    showToast('Signed out ✱ see you at the rack.');
    /* TODO: call logout() from backend/auth.js like home.js */
    setTimeout(() => {
        window.location.href = 'index.html?message=logged_out&status=success';
    }, 1200);
}
$('#signOutBtn').addEventListener('click', signOut);

/* ---------- edit modal ---------- */
const editModal = $('#editModal');
let lastFocus = null;
function openModal() {
    lastFocus = document.activeElement;
    const parts = current_user.name.trim().split(/\s+/);
    $('#efFirst').value = parts[0] || '';
    $('#efLast').value = parts.slice(1).join(' ');
    $('#efUser').value = String(current_user.username || '').replace(/^@/, '');
    $('#efEmail').value = current_user.email || '';
    $('#efHeight').value = $('#msHeight').textContent;
    $('#efWeight').value = $('#msWeight').textContent;
    $('#efFat').value = $('#msFat').textContent;
    editModal.classList.add('open');
    editModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#efFirst').focus({ preventScroll: true }), 320);
}
function closeModal() {
    editModal.classList.remove('open');
    editModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}
editModal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (editModal.classList.contains('open')) closeModal();
    else if (drawer.classList.contains('open')) closeDrawer();
});
$('#editProfileBtn').addEventListener('click', openModal);
$('#editMeasureBtn').addEventListener('click', openModal);
$('#avBtn').addEventListener('click', openModal);

$('#editForm').addEventListener('submit', e => {
    e.preventDefault();
    const first = $('#efFirst').value.trim();
    const last = $('#efLast').value.trim();
    if (!first) { showToast('Add at least a first name ✱', 'error'); return; }
    current_user.name = (first + ' ' + last).trim();
    const un = $('#efUser').value.trim();
    if (un) current_user.username = un;
    current_user.email = $('#efEmail').value.trim();
    try { localStorage.setItem('current_user', JSON.stringify(current_user)); } catch (err) { }
    applyUser();
    if ($('#efHeight').value) $('#msHeight').textContent = $('#efHeight').value;
    if ($('#efWeight').value) $('#msWeight').textContent = $('#efWeight').value;
    if ($('#efFat').value) $('#msFat').textContent = $('#efFat').value;
    closeModal();
    showToast('Profile updated ✱ the coach recalibrated.');
    /* TODO: persist via backend (addMeasurements-style call) */
});
