import { logout, getCurrentUser, getUserById } from "./utils/userUtils.js";
import { authenticate } from "./utils/authUtils.js";
import { showToast } from "./utils/frontend_utils.js";

/* ============================================================
   Workout-detail glue — dynamic, matches MongoDB MVC API shape.
   Loads the workout via ?id= from Express / MongoDB:
       GET http://localhost:5000/api/workouts/get/:id
============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const API = 'http://localhost:5000/api';

function initialsOf(name) {
    let out = '';
    String(name || '').trim().split(/\s+/).forEach(p => { if (p) out += p[0].toUpperCase(); });
    return out || '✱';
}

function applyUser(current_user) {
    if (!current_user) return;
    $$('.current_user_initials').forEach(el => el.textContent = initialsOf(current_user.name));
    $$('.current_user_name').forEach(el => {
        el.textContent = current_user.name ? (current_user.name.charAt(0).toUpperCase() + current_user.name.slice(1)) : 'Athlete';
    });
}

/* ---------- nav / drawer ---------- */
const navBar = $('#navBar');
const onScroll = () => navBar && navBar.classList.toggle('scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });
if (onScroll) onScroll();

const drawer = $('#drawer'), drawerBack = $('#drawerBack'), burger = $('#burgerBtn');
function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('open'); drawerBack.classList.add('open'); burger.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
}
function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open'); drawerBack.classList.remove('open'); burger.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
}
if (burger) burger.addEventListener('click', () => drawer && drawer.classList.contains('open') ? closeDrawer() : openDrawer());
if (drawerBack) drawerBack.addEventListener('click', closeDrawer);
const drawerX = $('#drawerX');
if (drawerX) drawerX.addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
$$('[data-todo]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    if (el.dataset.todo === 'signout') {
        logout();
        showToast('Signed out ✱ see you at the rack.');
        setTimeout(() => { location.href = 'index.html?message=logged_out&status=success'; }, 1200);
    }
}));

/* ---------- reveal ---------- */
const io = new IntersectionObserver(es => es.forEach(x => {
    if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
}), { threshold: .1 });
$$('.reveal').forEach(el => io.observe(el));

// DATA HELPERS for workout object shape
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
    if (!set) return '—';
    if (type === 'weight_and_reps') {
        const kg = (set.kg !== undefined && set.kg !== '' && set.kg !== null) ? escHtml(set.kg) + ' kg' : '—';
        const reps = (set.reps !== undefined && set.reps !== '' && set.reps !== null) ? escHtml(set.reps) : '—';
        return kg + '<span class="dim">×</span>' + reps;
    }
    if (type === 'distance_and_duration') {
        return fmtDistance(set.distance) + '<span class="dim">·</span>' + escHtml(set.time || '—');
    }
    if (type === 'bodyweight_reps') {
        return escHtml(set.reps || '—') + '<span class="dim">reps</span>';
    }
    if (type === 'duration') {
        return escHtml(set.time || '—');
    }
    return Object.entries(set)
        .filter(([k]) => k !== '_id')
        .map(([k, v]) => escHtml(v) + '<span class="dim">' + escHtml(k) + '</span>')
        .join(' · ') || '—';
}

/* lifted kilos of one set (weight exercises only) */
function setKg(set) {
    if (!set) return 0;
    const kg = parseFloat(set.kg);
    const reps = parseInt(set.reps, 10);
    return (isNaN(kg) ? 0 : kg) * (isNaN(reps) ? 0 : reps);
}

// Estimates 1RM (Epley formula)
function estOneRm(sets) {
    let best = null;
    const setsArr = Array.isArray(sets) ? sets : Object.values(sets || {});
    setsArr.forEach(s => {
        const kg = parseFloat(s.kg);
        const reps = parseInt(s.reps, 10);
        if (isNaN(kg) || !kg || isNaN(reps) || !reps) return;
        const est = kg * (1 + reps / 30);
        if (!best || est > best.est) best = { est };
    });
    return best ? Math.round(best.est * 2) / 2 : null;
}

function fmtWhen(dateVal, startTime) {
    let out = '';
    try {
        const d = dateVal ? new Date(dateVal) : (startTime ? new Date(startTime) : new Date());
        if (!isNaN(d.getTime())) {
            out = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }
    } catch (_) {}
    if (!out && dateVal) out = String(dateVal);

    if (startTime) {
        try {
            const t = new Date(Number(startTime));
            if (!isNaN(t.getTime())) {
                out += (out ? ' · ' : '') + t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            }
        } catch (_) {}
    }
    return out || '—';
}

function normalizeExercises(rawExercises) {
    if (!rawExercises) return [];
    if (Array.isArray(rawExercises)) {
        return rawExercises.map(item => {
            const exerciseObj = item.exercise;
            let name = 'Exercise';
            let type = item.type || 'weight_and_reps';

            if (typeof exerciseObj === 'object' && exerciseObj !== null) {
                name = exerciseObj.name || name;
                type = item.type || exerciseObj.exercise_type || type;
            } else if (typeof exerciseObj === 'string' && exerciseObj) {
                name = item.name || exerciseObj;
            } else if (item.name) {
                name = item.name;
            }

            let sets = [];
            if (Array.isArray(item.sets)) {
                sets = item.sets;
            } else if (typeof item.sets === 'object' && item.sets !== null) {
                sets = Object.values(item.sets);
            }

            return {
                name,
                type,
                notes: item.notes || '',
                sets
            };
        });
    }

    if (typeof rawExercises === 'object') {
        return Object.entries(rawExercises).map(([name, item]) => {
            const type = item.type || 'weight_and_reps';
            let sets = [];
            if (Array.isArray(item.sets)) {
                sets = item.sets;
            } else if (typeof item.sets === 'object' && item.sets !== null) {
                sets = Object.values(item.sets);
            }
            return {
                name,
                type,
                notes: item.notes || '',
                sets
            };
        });
    }

    return [];
}

// Render workout data into page
function renderWorkout(wk, author) {
    const exList = normalizeExercises(wk.exercises);

    document.title = '1RM ✱ ' + (wk.title || 'Session');
    $('#postWhen').textContent = fmtWhen(wk.date, wk.start_time) || '—';

    /* author */
    $('#authorAv').textContent = initialsOf(author.name);
    $('#authorName').textContent = author.name;
    $('#authorHandle').textContent = author.username ? '@' + author.username : '';
    $('#authorMeta').innerHTML = '<span>' + escHtml(fmtWhen(wk.date, wk.start_time)) + '</span>';

    /* title & desc */
    $('#postTitle').innerHTML = '<span class="t-star">✱</span>' + escHtml(wk.title || 'Untitled session');
    const descEl = $('#postDesc');
    if (descEl) {
        descEl.textContent = wk.description || '';
        descEl.hidden = !wk.description;
    }

    /* photos: first big, the rest as thumbs */
    const photos = Array.isArray(wk.photos) ? wk.photos.filter(Boolean) : [];
    if (photos.length) {
        $('#postImg').src = photos[0];
        $('#postImgWrap').hidden = false;
        const th = $('#postThumbs');
        if (photos.length > 1 && th) {
            th.hidden = false;
            th.innerHTML = photos.slice(1).map(p => '<img src="' + p + '" alt="Session photo">').join('');
        } else if (th) {
            th.hidden = true;
        }
    } else {
        $('#postImgWrap').hidden = true;
        if ($('#postThumbs')) $('#postThumbs').hidden = true;
    }

    /* tags */
    const tags = [...new Set(exList.map(e => TYPE_TAG[e.type] || 'strength').filter(Boolean))];
    $('#postTags').innerHTML = tags.map(t => '<span class="wk-tag">' + escHtml(t) + '</span>').join('');
    if (tags.length) $('#imgTag').innerHTML = '<b>✱</b> ' + escHtml(tags[0]);

    /* totals */
    let calculatedVol = 0;
    let setCount = 0;
    exList.forEach(ex => {
        setCount += ex.sets.length;
        ex.sets.forEach(s => { calculatedVol += setKg(s); });
    });
    const vol = wk.total_volume || (calculatedVol ? calculatedVol.toLocaleString('en-US') : '0');
    const time = wk.total_time || '—';
    const exCount = exList.length;

    $('#footVolume').textContent = vol + (String(vol).includes('kg') ? '' : ' kg');
    $('#footTime').textContent = time;
    $('#footEx').textContent = exCount;
    $('#statVolume').textContent = vol;
    $('#statTime').textContent = time;
    $('#statEx').textContent = exCount;
    $('#statSets').textContent = setCount;

    /* spots */
    const spots = Array.isArray(wk.spots) ? wk.spots : [];
    $('#spotCount').textContent = spots.length;
    $('#spottedBy').textContent = spots.length > 0 ? '+ ' + Math.max(spots.length - 3, 0) + ' spotted this' : 'be the first to spot';
    if (author.self && $('#followBtn')) $('#followBtn').style.display = 'none';

    /* exercise blocks */
    const list = $('#exList');
    list.innerHTML = '';
    exList.forEach((ex, i) => {
        const sets = ex.sets || [];
        const color = EX_COLORS[i % EX_COLORS.length];
        const typeLbl = TYPE_LABEL[ex.type] || ex.type || 'sets';
        const est = ex.type === 'weight_and_reps' ? estOneRm(sets) : null;

        const block = document.createElement('div');
        block.className = 'ex-block';
        block.style.setProperty('--c', color);
        block.style.setProperty('--ad', (i * 70) + 'ms');

        let html =
            '<div class="ex-head">' +
            '<span class="nm">' + escHtml(ex.name) + '</span>' +
            (est ? '<span class="est-badge">≈ ' + est + ' kg 1RM</span>' : '') +
            '<span class="ex-type">' + escHtml(typeLbl) + ' · ' + sets.length +
            (sets.length === 1 ? ' set' : ' sets') + '</span>' +
            '</div>';

        if (sets.length) {
            html += '<div class="set-list">';
            sets.forEach((set, sIdx) => {
                html +=
                    '<div class="set-row">' +
                    '<span class="set-no">Set <b>' + String(sIdx + 1).padStart(2, '0') + '</b></span>' +
                    '<span class="set-val">' + fmtSet(set, ex.type) + '</span>' +
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
    const vols = exList.map((ex, i) => {
        let v = 0;
        ex.sets.forEach(s => { v += setKg(s); });
        return { name: ex.name, v, c: EX_COLORS[i % EX_COLORS.length] };
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
    const ests = exList
        .filter(ex => ex.type === 'weight_and_reps')
        .map(ex => ({ n: ex.name, e: estOneRm(ex.sets) }))
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
    if (!id) {
        showToast('No session specified.', 'error');
        window.location.href = "home.html";
        return null;
    }
    try {
        const cleanId = id.startsWith(':') ? id.slice(1) : id;
        const res = await fetch(API + '/workouts/get/' + cleanId, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        const workout = data.workout;
        if (workout) return workout;
        showToast('Session not found.', 'error');
        window.location.href = "home.html?message=session_not_found&status=error";
        return null;
    } catch (e) {
        console.error('loadWorkout failed:', e);
        showToast('Could not load session. Check backend connection.', 'error');
        setTimeout(() => {
            window.location.href = "home.html";
        }, 1500);
        return null;
    }
}

async function loadAuthor(wk, current_user) {
    if (!wk) return { name: '1RM Lifter', username: '', self: false };
    const currentUserId = String(current_user?.id || current_user?._id || '');
    const wkUser = wk.user;
    const wkUserId = String(wkUser?._id ?? wkUser ?? '');

    const isSelf = Boolean(currentUserId && wkUserId && currentUserId === wkUserId);

    if (typeof wkUser === 'object' && wkUser !== null && wkUser.name) {
        return {
            name: wkUser.name,
            username: wkUser.username || '',
            self: isSelf
        };
    }

    if (isSelf) {
        return {
            name: current_user.name,
            username: current_user.username || '',
            self: true
        };
    }

    if (wkUserId && typeof wkUserId === 'string' && wkUserId.length === 24) {
        try {
            const res = await getUserById(wkUserId);
            const u = res?.user || res;
            const userObj = Array.isArray(u) ? u[0] : u;
            if (userObj && userObj.name) {
                return {
                    name: userObj.name,
                    username: userObj.username || '',
                    self: false
                };
            }
        } catch (_) {}
    }

    return { name: '1RM Lifter', username: '', self: false };
}

let get_proper_time_from_start = (oldTime) => {
    if (!oldTime) return 'just now';
    const timeMs = typeof oldTime === 'number' ? oldTime : new Date(oldTime).getTime();
    if (isNaN(timeMs)) return 'just now';
    const elapsed = Date.now() - timeMs;
    if (elapsed < 60000) return 'just now';
    const days = Math.floor(elapsed / 86400000);
    const hours = Math.floor((elapsed % 86400000) / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    let result = "";
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m`;
    return result.trim() || 'just now';
};

async function saveWorkoutChanges(wk, changes) {
    const rawId = wk._id || wk.id;
    if (!rawId) return null;
    try {
        const cleanId = String(rawId).startsWith(':') ? String(rawId).slice(1) : String(rawId);
        const res = await fetch(API + '/workouts/' + cleanId, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            },
            body: JSON.stringify(changes)
        });
        if (!res.ok) {
            console.error('saveWorkoutChanges error HTTP', res.status);
            return null;
        }
        const data = await res.json();
        return data.workout || null;
    } catch (e) {
        console.error('Failed to save workout changes:', e);
        return null;
    }
}

function initActionsAndComments(wk, current_user) {
    const currentUserId = String(current_user?.id || current_user?._id || '');
    let spots = Array.isArray(wk.spots) ? wk.spots : [];
    const spotted = spots.some(s => String(s?._id ?? s) === currentUserId);
    const spotBtn = $('#spotBtn'), spotCount = $('#spotCount');
    if (spotted && spotBtn) spotBtn.classList.add('on');

    if (spotBtn) {
        spotBtn.addEventListener('click', async () => {
            const on = spotBtn.classList.toggle('on');
            spotCount.textContent = (+spotCount.textContent) + (on ? 1 : -1);
            if (on) {
                showToast("Spotted ✱");
                if (!spots.some(s => String(s?._id ?? s) === currentUserId)) {
                    spots.push(currentUserId);
                }
            } else {
                const index = spots.findIndex(s => String(s?._id ?? s) === currentUserId);
                if (index > -1) {
                    spots.splice(index, 1);
                }
            }
            $('#spottedBy').textContent = spots.length > 0 ? '+ ' + Math.max(spots.length - 3, 0) + ' spotted this' : 'be the first to spot';
            await saveWorkoutChanges(wk, { spots });
        });
    }

    const followBtn = $('#followBtn');
    if (followBtn) {
        followBtn.addEventListener('click', () => {
            const on = followBtn.classList.toggle('on');
            followBtn.textContent = on ? 'Following ✱' : 'Follow';
            showToast(on ? 'Following ✱ their sessions will hit your feed.' : 'Unfollowed — no hard feelings.');
        });
    }

    const shareBtn = $('#shareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
            }
            showToast('Link copied ✱ share the grind.');
        });
    }

    /* comments */
    const cmtList = $('#cmtList');
    let commentTotal = 0;
    const comments = Array.isArray(wk.comments) ? wk.comments : [];

    function addComment(c, delay) {
        const el = document.createElement('div');
        el.className = 'cmt-card';
        if (delay) el.style.setProperty('--ad', delay + 'ms');
        const initial = c.i || initialsOf(c.n || c.user?.name || 'User');
        const name = c.n || c.user?.name || 'User';
        const handle = c.h || (c.user?.username ? '@' + c.user.username : '@user');
        const rawTime = c.t || c.createdAt;
        const timeRel = rawTime ? get_proper_time_from_start(rawTime) : 'just now';
        const time = timeRel === 'just now' ? 'just now' : timeRel + ' ago';
        const text = c.x || c.comment || '';
        el.innerHTML =
            '<span class="av sm">' + escHtml(initial) + '</span>' +
            '<div class="cmt-body">' +
            '<div class="cmt-meta"><b>' + escHtml(name) + '</b><span>' + escHtml(handle) + ' · ' + escHtml(time) + '</span></div>' +
            '<p>' + escHtml(text) + '</p>' +
            '</div>';
        cmtList.appendChild(el);
        commentTotal++;
        $('#cmtCount').textContent = commentTotal;
    }

    comments.forEach((c, i) => addComment(c, i * 80));

    async function postComment() {
        const input = $('#cmtInput');
        const val = input.value.trim();
        if (!val) { showToast('Say something first ✱', 'error'); return; }
        const newC = {
            i: initialsOf(current_user.name),
            n: current_user.name,
            h: '@' + current_user.username,
            t: Date.now(),
            x: val,
            user: current_user.id,
            comment: val
        };
        addComment(newC);
        if (!Array.isArray(wk.comments)) wk.comments = [];
        wk.comments.push(newC);
        input.value = '';
        input.focus();
        const updated = await saveWorkoutChanges(wk, { comments: wk.comments });
        if (updated && Array.isArray(updated.comments)) {
            wk.comments = updated.comments;
        }
    }

    const cmtPost = $('#cmtPost');
    if (cmtPost) cmtPost.addEventListener('click', postComment);
    const cmtInput = $('#cmtInput');
    if (cmtInput) cmtInput.addEventListener('keydown', e => { if (e.key === 'Enter') postComment(); });
}

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
        if (!p) return;
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
   INITIALIZATION
========================================================= */
async function init() {
    if (!(await authenticate())) {
        sessionStorage.removeItem('token');
        window.location.href = "index.html?message=not_logged_in&from=home&status=error";
        return;
    }
    const current_user = await getCurrentUser();
    applyUser(current_user);

    const wk = await loadWorkout();
    if (!wk) return;

    const author = await loadAuthor(wk, current_user);
    renderWorkout(wk, author);
    initActionsAndComments(wk, current_user);
}

init();