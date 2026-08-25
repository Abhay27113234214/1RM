import { logout } from "../../backend/auth.js";
/* ============================================================
   Workout-detail glue — dynamic, same patterns as home.js.
   Loads the workout via ?id= from your json-server:
       GET http://localhost:3000/workouts?id=<id>
       GET http://localhost:3000/users?id=<user_id>   (author)
============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const API = 'http://localhost:3000';

let current_user = null;
try { current_user = JSON.parse(localStorage.getItem('current_user')); } catch (e) { }
if (!current_user) {
    window.location.href = "http://127.0.0.1:5500/src/frontend/templates/index.html?message=not_logged_in&from=home&status=error"
}

const wk = await loadWorkout()

function initialsOf(name) {
    let out = '';
    String(name || '').trim().split(/\s+/).forEach(p => { if (p) out += p[0].toUpperCase(); });
    return out || '✱';
}
(function applyUser() {
    $$('.current_user_initials').forEach(el => el.textContent = initialsOf(current_user.name));
    $$('.current_user_name').forEach(el => {
        el.textContent = current_user.name.charAt(0).toUpperCase() + current_user.name.slice(1);
    });
})();

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

/* ---------- nav / drawer ---------- */
const navBar = $('#navBar');
const onScroll = () => navBar.classList.toggle('scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

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
$$('[data-todo]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    if (el.dataset.todo === 'signout') {
        logout()
        showToast('Signed out ✱ see you at the rack.');
        setTimeout(() => { location.href = 'index.html?message=logged_out&status=success'; }, 1200);
    }
}));

/* ---------- reveal ---------- */
const io = new IntersectionObserver(es => es.forEach(x => {
    if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
}), { threshold: .1 });
$$('.reveal').forEach(el => io.observe(el));

//  DATA HELPERS for your workout object shape
const EX_COLORS = ['#FF4A11', '#1E9E6A', '#3B6FE0', '#D89B0B', '#D6486F'];
const TYPE_LABEL = {
    weight_and_reps: 'weight × reps',
    distance_and_duration: 'distance · time',
    bodyweight_reps: 'bodyweight',
    duration: 'time',
    reps_and_duration: 'reps · time'
};
const TYPE_TAG = {
    weight_and_reps: 'strength',
    bodyweight_reps: 'strength',
    reps_and_duration: 'conditioning',
    distance_and_duration: 'cardio',
    duration: 'cardio'
};

function fmtDistance(m) {
    m = +m || 0;
    if (m >= 1000) {
        const km = Math.round(m / 100) / 10;
        return (Number.isInteger(km) ? km : km.toFixed(1)) + ' km';
    }
    return m + ' m';
}
function fmtSet(set, type) {
    if (type === 'weight_and_reps') {
        const kg = (set.kg !== undefined && set.kg !== '') ? escHtml(set.kg) + ' kg' : '—';
        const reps = (set.reps !== undefined && set.reps !== '') ? escHtml(set.reps) : '—';
        return kg + '<span class="dim">×</span>' + reps;
    }
    if (type === 'distance_and_duration') {
        return fmtDistance(set.distance) + '<span class="dim">·</span>' + escHtml(set.time || '—');
    }
    if (type === 'bodyweight_reps') {
        return escHtml(set.reps || '—') + '<span class="dim">reps</span>';
    }
    return Object.entries(set)
        .map(([k, v]) => escHtml(v) + '<span class="dim">' + escHtml(k) + '</span>')
        .join(' · ');
}
/* lifted kilos of one set (weight exercises only) */
function setKg(set) {
    const kg = parseFloat(set.kg); const reps = parseInt(set.reps, 10);
    return (isNaN(kg) ? 0 : kg) * (isNaN(reps) ? 0 : reps);
}


// this is the function that is estimating the 1RM of the user
function estOneRm(sets) {
    let best = null;
    Object.values(sets).forEach(s => {
        const kg = parseFloat(s.kg); const reps = parseInt(s.reps, 10);
        if (isNaN(kg) || !kg || isNaN(reps) || !reps) return;
        const est = kg * (1 + reps / 30);
        if (!best || est > best.est) best = { est };
    });
    return best ? Math.round(best.est * 2) / 2 : null;
}
function fmtWhen(dateStr, startTime) {
    let out = '';
    try {
        const d = new Date(dateStr + 'T00:00:00');
        out = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch (e) { out = dateStr || ''; }
    if (startTime) {
        try {
            const t = new Date(startTime);
            out += ' · ' + t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } catch (e) { }
    }
    return out;
}

// render kr rahe hai workout ko 
function renderWorkout(wk, author) {
    const exercises = wk.exercises || {};
    const names = Object.keys(exercises);

    document.title = '1RM ✱ ' + (wk.title || 'Session');
    $('#postWhen').textContent = fmtWhen(wk.date, wk.start_time) || '—';

    /* author */
    $('#authorAv').textContent = initialsOf(author.name);
    $('#authorName').textContent = author.name;
    $('#authorHandle').textContent = author.username ? '@' + author.username : '';
    $('#authorMeta').innerHTML = '<span>' + escHtml(fmtWhen(wk.date, wk.start_time)) + '</span>';

    /* title — one clean style, nothing floating near it */
    $('#postTitle').innerHTML = '<span class="t-star">✱</span>' + escHtml(wk.title || 'Untitled session');
    $('#postDesc').textContent = wk.description || '';
    if (!wk.description) $('#postDesc').hidden = true;

    /* photos: first big, the rest as thumbs */
    const photos = Array.isArray(wk.photos) ? wk.photos.filter(Boolean) : [];
    if (photos.length) {
        $('#postImg').src = photos[0];
        $('#postImgWrap').hidden = false;
        if (photos.length > 1) {
            const th = $('#postThumbs');
            th.hidden = false;
            th.innerHTML = photos.slice(1).map(p => '<img src="' + p + '" alt="Session photo">').join('');
        }
    }

    /* tags */
    const tags = [...new Set(names.map(n => TYPE_TAG[exercises[n].type]).filter(Boolean))];
    $('#postTags').innerHTML = tags.map(t => '<span class="wk-tag">' + escHtml(t) + '</span>').join('');
    if (tags.length) $('#imgTag').innerHTML = '<b>✱</b> ' + escHtml(tags[0]);

    /* totals */
    const vol = wk.total_volume || '0';
    const time = wk.total_time || '—';
    const exCount = names.length;
    let setCount = 0;
    names.forEach(n => { setCount += Object.keys(exercises[n].sets || {}).length; });
    $('#footVolume').textContent = vol + ' kg';
    $('#footTime').textContent = time;
    $('#footEx').textContent = exCount;
    $('#statVolume').textContent = vol;
    $('#statTime').textContent = time;
    $('#statEx').textContent = exCount;
    $('#statSets').textContent = setCount;

    /* spots */
    let spots = wk.spots !== undefined ? wk.spots : []; 
    $('#spotCount').textContent = spots.length;
    $('#spottedBy').textContent = '+ ' + Math.max(spots.length - 3, 0) + ' spotted this';
    if (author.self) $('#followBtn').style.display = 'none';

    /* exercise blocks */
    const list = $('#exList');
    list.innerHTML = '';
    names.forEach((name, i) => {
        const ex = exercises[name];
        const sets = ex.sets || {};
        const setKeys = Object.keys(sets);
        const color = EX_COLORS[i % EX_COLORS.length];
        const typeLbl = TYPE_LABEL[ex.type] || ex.type || 'sets';
        const est = ex.type === 'weight_and_reps' ? estOneRm(sets) : null;

        const block = document.createElement('div');
        block.className = 'ex-block';
        block.style.setProperty('--c', color);
        block.style.setProperty('--ad', (i * 70) + 'ms');

        let html =
            '<div class="ex-head">' +
            '<span class="nm">' + escHtml(name) + '</span>' +
            (est ? '<span class="est-badge">≈ ' + est + ' kg 1RM</span>' : '') +
            '<span class="ex-type">' + escHtml(typeLbl) + ' · ' + setKeys.length +
            (setKeys.length === 1 ? ' set' : ' sets') + '</span>' +
            '</div>';

        if (setKeys.length) {
            html += '<div class="set-list">';
            setKeys.forEach(k => {
                html +=
                    '<div class="set-row">' +
                    '<span class="set-no">Set <b>' + escHtml(String(k).padStart(2, '0')) + '</b></span>' +
                    '<span class="set-val">' + fmtSet(sets[k], ex.type) + '</span>' +
                    '</div>';
            });
            html += '</div>';
        }
        if (ex.notes) {
            html += '<div class="ex-note"><b>✱ note</b>“' + escHtml(ex.notes) + '”</div>';
        }
        block.innerHTML = html;
        list.appendChild(block);
    });

    /* volume-by-exercise bars */
    const volWrap = $('#volBars');
    volWrap.innerHTML = '';
    const vols = names.map((n, i) => {
        const ex = exercises[n];
        let v = 0;
        Object.values(ex.sets || {}).forEach(s => { v += setKg(s); });
        return { name: n, v, c: EX_COLORS[i % EX_COLORS.length] };
    }).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
    if (vols.length) {
        const max = vols[0].v;
        vols.forEach((x, i) => {
            const row = document.createElement('div');
            row.className = 'vb';
            row.style.setProperty('--c', x.c);
            row.innerHTML =
                '<div class="vb-top"><span class="vb-n">' + escHtml(x.name) + '</span>' +
                '<span class="vb-v">' + x.v.toLocaleString('en-US') + ' kg</span></div>' +
                '<div class="vb-track"><i style="width:' + Math.max(8, Math.round(x.v / max * 100)) + '%; --ad:' + (i * 90) + 'ms"></i></div>';
            volWrap.appendChild(row);
        });
    } else {
        volWrap.innerHTML = '<div class="side-note" style="margin-top:0">No loaded kilos in this one — pure bodyweight & engine work.</div>';
    }

    /* estimated maxes list */
    const estWrap = $('#estList');
    estWrap.innerHTML = '';
    const ests = names.map(n => ({ n, e: exercises[n].type === 'weight_and_reps' ? estOneRm(exercises[n].sets || {}) : null }))
        .filter(x => x.e);
    if (ests.length) {
        ests.sort((a, b) => b.e - a.e).forEach(x => {
            const row = document.createElement('div');
            row.className = 'em-row';
            row.innerHTML = '<span class="w">' + escHtml(x.n) + '</span><span class="v">' + x.e + ' kg</span>';
            estWrap.appendChild(row);
        });
    } else {
        estWrap.innerHTML = '<div class="side-note" style="margin-top:0">No loaded sets — nothing to estimate yet.</div>';
    }
}


async function loadWorkout() {
    const id = new URLSearchParams(location.search).get('id');
    if (id) {
        try {
            const res = await fetch(API + '/workouts?id=' + encodeURIComponent(id));
            const data = await res.json();
            const wk = Array.isArray(data) ? data[0] : data;
            if (wk && wk.exercises) return wk;
            showToast('Session not found.', 'error');
            window.location.href = "http://127.0.0.1:5500/src/frontend/templates/home.html?message=session_not_found&status=error"
        } catch (e) {
            showToast('Some Error occured. Try again after some time', 'error');
            window.location.href = "http://127.0.0.1:5500/src/frontend/templates/home.html"
        }
    }
}
async function loadAuthor(wk) {
    if (current_user.id && wk.user_id && current_user.id === wk.user_id) {
        return { name: current_user.name, username: current_user.username, self: true };
    }
    try {
        const res = await fetch(API + '/users?id=' + encodeURIComponent(wk.user_id));
        const users = await res.json();
        const u = Array.isArray(users) ? users[0] : users;
        if (u && u.name) return { name: u.name, username: u.username, self: false };
    } catch (e) { }
    return { name: '1RM Lifter', username: '', self: false };
}
(async function init() {
    const author = await loadAuthor(wk);
    renderWorkout(wk, author);
})();

/* =========================================================
   TABS
========================================================= */
const tabs = $$('.tab');
const panels = { workout: $('#panel-workout'), comments: $('#panel-comments') };
tabs.forEach(t => t.addEventListener('click', () => {
    if (t.classList.contains('on')) return;
    tabs.forEach(x => x.classList.remove('on'));
    t.classList.add('on');
    const key = t.dataset.tab;
    Object.entries(panels).forEach(([k, p]) => {
        if (k === key) {
            p.hidden = false;
            p.classList.remove('swap'); void p.offsetWidth; p.classList.add('swap');
            p.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
        } else {
            p.hidden = true;
        }
    });
}));

/* =========================================================
   SPOT / FOLLOW / SHARE
========================================================= */
let spots = wk.spots !== undefined ? wk.spots : []
const spotted = spots.includes(current_user.id)
const spotBtn = $('#spotBtn'), spotCount = $('#spotCount');
if (spotted) spotBtn.classList.add('on')
spotBtn.addEventListener('click', () => {
    const on = spotBtn.classList.toggle('on');
    spotCount.textContent = (+spotCount.textContent) + (on ? 1 : -1);
    if (on) {
        showToast("Spotted")
        wk['spots'].psuh(current_user.id)
    } else {
        const index = wk['spots'].indexOf(current_user.id)
        if (index > -1) {
            wk['spots'].splice(index, 1)
        }
    }
    
});


// yeh hm baad mein karenge 
const followBtn = $('#followBtn');
followBtn.addEventListener('click', () => {
    const on = followBtn.classList.toggle('on');
    followBtn.textContent = on ? 'Following ✱' : 'Follow';
    showToast(on ? 'Following ✱ their sessions will hit your feed.' : 'Unfollowed — no hard feelings.');
    /* TODO: persist */
});
$('#shareBtn').addEventListener('click', () => showToast('Link copied ✱ share the grind.'));



/* =========================================================
   COMMENTS — rounded cards, simple list
   TODO: fetch/persist via your backend
========================================================= */
const MY_INITIALS = initialsOf(current_user.name);
const cmtList = $('#cmtList');
let commentTotal = 0;

let get_proper_time_from_start = (oldTIme) => {
    const elapsed = Date.now() - oldTIme;
    const days = Math.floor(elapsed / 86400000);
    const hours = Math.floor((elapsed % 86400000) / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    let result = "";
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m`;
    return result.trim()
}

function addComment(c, delay) {
    const el = document.createElement('div');
    el.className = 'cmt-card';
    if (delay) el.style.setProperty('--ad', delay + 'ms');
    el.innerHTML =
        '<span class="av sm">' + escHtml(c.i) + '</span>' +
        '<div class="cmt-body">' +
        '<div class="cmt-meta"><b>' + escHtml(c.n) + '</b><span>' + escHtml(c.h) + ' · ' + escHtml(get_proper_time_from_start(c.t)) + '</span></div>' +
        '<p>' + escHtml(c.x) + '</p>' +
        '</div>';
    cmtList.appendChild(el);
    commentTotal++;
    $('#cmtCount').textContent = commentTotal;
}
wk.comments.forEach((c, i) => addComment(c, i * 80));

function postComment() {
    const input = $('#cmtInput');
    const val = input.value.trim();
    if (!val) { showToast('Say something first ✱', 'error'); return; }
    addComment({ i: MY_INITIALS, n: 'You', h: '@' + current_user.username, t: 'just now', x: val });
    wk['comments'].push({
        i: MY_INITIALS,
        n: current_user.name,
        h: '@'+current_user.username,
        t: Date.now(),
        x: val
    })
    input.value = '';
    input.focus();
}
$('#cmtPost').addEventListener('click', postComment);
$('#cmtInput').addEventListener('keydown', e => { if (e.key === 'Enter') postComment(); });

// workout ko save krne k litye agr koi workout vaale page se ht jaata hai to workout 
// apne aap save ho jaaye comments aur spot k sath
window.addEventListener("pagehide", async function() {
    let workout_save_response = await fetch(`http://localhost:3000/workouts/${wk.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(wk)
    })
    console.log(workout_save_response.status)
})