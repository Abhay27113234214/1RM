import { logout } from "../../backend/auth.js"

import { logout } from "../../backend/auth.js"

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

/* ---------- current user (home.js pattern + demo fallback) ---------- */
let current_user = null;
try { current_user = JSON.parse(localStorage.getItem('current_user')); } catch (e) { }
if (!current_user) {
    window.location.href = "http://127.0.0.1:5500/src/frontend/templates/index.html?message=not_logged_in&from=home&status=error"
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

const navBar = $('#navBar');
const onScroll = () => navBar.classList.toggle('scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

$('#dateLine').innerHTML = '<b>✱</b> ' +
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) +
    ' <span class="live-dot"></span>';

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

const io = new IntersectionObserver(es => es.forEach(x => {
    if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
}), { threshold: .1 });
$$('.reveal').forEach(el => io.observe(el));

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


// ab yeh jo hai yeh month functionality hai, k aapne pichle 4 hafto mein total kitna weight uthaya vagera vagera 

const dayKey = (d) => {
    return d.getFullYear() + '-' + // getFullYear returns a string like 2026
    String(d.getMonth() + 1).padStart(2, '0') + '-' + // .getMonth is 0 based so +1, padStart adds a zero if the string is shorted than 2 characters
    String(d.getDate()).padStart(2, '0'); // getDate gets today's date 
}
// to yeh jo uper vaala function hai yeh aaj ki date nikal k deta hai jaise maine json-server mein store ki hui hai 

// yeh function to hr ek workout ki volume calculate krne k liye hai bsss
function volumeOfWorkout(workout) {
    let total = 0;
    Object.values(workout.exercises || {}).forEach(ex => {
        Object.values(ex.sets || {}).forEach(set => {
            // purani rows [kg, reps] arrays hain, nayi rows {kg, reps} objects to isi liye yeh terinary operator lagana pad raha hai
            const kg = Array.isArray(set) ? parseFloat(set[0]) || 0 : parseFloat(set.kg) || 0;
            const reps = Array.isArray(set) ? parseFloat(set[1]) || 0 : parseFloat(set.reps) || 0;
            total += kg * reps;
        });
    });
    return total;
}

// ek din mein mai ek se zayada sessions ya workouts bhi to kr sakta hoon
function groupWorkoutsByDay(workouts) {
    const byDay = {};
    workouts.forEach(w => {
        if (!w.date) return;
        if (!byDay[w.date]) byDay[w.date] = { sessions: 0, volume: 0 };
        byDay[w.date].sessions++;
        byDay[w.date].volume += volumeOfWorkout(w);
    });
    return byDay;
}

// yeh to vo heatmap k liye, konsa cell kitna dark hoga
// ek din ki jitni zayada volume uske corresponding cell utna hi zayada dark
function intensityFor(entry) {
    if (!entry) return 0;
    if (entry.sessions >= 2) return 4;      // two-a-day
    if (entry.volume >= 9000) return 4;     // huge day
    if (entry.volume >= 6000) return 3;     // big day
    if (entry.volume >= 2500) return 2;     // normal day
    return 1;                               // light / cardio only
}

// hover krne pe jo text aata hai kisi cell pe 
function tooltipFor(entry, label) {
    if (!entry) return label + ' · rest day';
    const vol = Math.round(entry.volume).toLocaleString('en-US');
    return label + ' · ' + entry.sessions + ' session' + (entry.sessions > 1 ? 's' : '') +
        (entry.volume > 0 ? ' · ' + vol + ' kg' : ' · bodyweight / cardio');
}

async function buildMonth() {
    const grid = $('#monthGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const me = JSON.parse(localStorage.getItem('current_user'));
    if (!me) return;

    /* ---- fetch my workouts, bucket by day ---- */
    let mine = [];
    try {
        const res = await fetch('http://localhost:3000/workouts?user_id:eq=' + me.id);
        mine = await res.json();
    } catch (e) { mine = []; }
    const byDay = groupWorkoutsByDay(mine); // maine jitne bhi workouts aaj tk kare hai unko group karo date k base peb

    // yeh uper vaala saara weeks ka header dikhane k liye
    const corner = document.createElement('span');
    corner.className = 'm-corner';
    corner.textContent = 'wk';
    grid.appendChild(corner);
    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(letter => {
        const s = document.createElement('span');
        s.className = 'm-dow';
        s.textContent = letter;
        grid.appendChild(s);
    });

    // month boudaries
    const today    = new Date(); today.setHours(0, 0, 0, 0); 
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);       // jo bhi mahina aur saal chl raha hai vo lo aur uske pehle din pe jao  
    const lastDay  = new Date(today.getFullYear(), today.getMonth() + 1, 0);   // jo bhi mahin achl raha hai uske pehle din pe jao

    // grid Monday se shuru ho k Sunday pe khatam (4, 5 ya 6 rows — month pe depend karta hai)
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));
    const gridEnd = new Date(lastDay);
    gridEnd.setDate(lastDay.getDate() + (6 - ((lastDay.getDay() + 6) % 7)));

    const head = grid.closest('.panel-flat')?.querySelector('.r-h');
    if (head) head.textContent = 'consistency · ' + firstDay.toLocaleDateString('en-US', { month: 'long' });


    for (let rowStart = new Date(gridStart); rowStart <= gridEnd; rowStart.setDate(rowStart.getDate() + 7)) { // hm date object pe iterate bhi kr sakte hai
        // hm iterate karenge hafte by hafte aur poori grid generate karenge 
        const label = document.createElement('span');
        label.className = 'm-lbl';
        label.textContent = rowStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        grid.appendChild(label);

        for (let d = 0; d < 7; d++) {
            const date = new Date(rowStart);
            date.setDate(rowStart.getDate() + d);

            const cell  = document.createElement('div');
            const dstr  = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const inMonth = date >= firstDay && date <= lastDay;

            if (!inMonth) {
                // pichle/agle month ka din — sirf grid ko poora karne k liye, faded
                cell.className = 'm-cell future';
                cell.dataset.tip = dstr + (date < firstDay ? ' · last month' : ' · next month');
            } else if (date > today) {
                // abhi aane vaala din
                cell.className = 'm-cell future';
                cell.dataset.tip = dstr + ' · coming up';
            } else {
                // real data — 1st se aaj tak
                const entry   = byDay[dayKey(date)];
                const level   = intensityFor(entry);
                const isToday = date.getTime() === today.getTime();
                cell.className = 'm-cell l' + level + (isToday ? ' today' : '');
                cell.dataset.tip = tooltipFor(entry, dstr);
            }
            grid.appendChild(cell);
        }
    }
}
buildMonth();

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
    logout()
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