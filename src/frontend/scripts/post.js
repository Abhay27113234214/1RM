import { logout, getCurrentUser, getUserById } from "./utils/userUtils.js";
import { authenticate } from "./utils/authUtils.js";
import { showToast, handleUrlFlashMessages } from "./utils/frontend_utils.js";
import { loadWorkout, patchWorkout } from "./utils/workoutUtils.js";

/* ============================================================
   1. CONFIG, CONSTANTS & DOM HELPERS
============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));



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

function initialsOf(name) {
    let out = '';
    String(name || '').trim().split(/\s+/).forEach(p => { if (p) out += p[0].toUpperCase(); });
    return out || '✱';
}

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

function setKg(set) {
    if (!set) return 0;
    const kg = parseFloat(set.kg);
    const reps = parseInt(set.reps, 10);
    return (isNaN(kg) ? 0 : kg) * (isNaN(reps) ? 0 : reps);
}

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

function get_proper_time_from_start(oldTime) {
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

/* ============================================================
   2. USER PROFILE DISPLAY
============================================================ */
function applyUser(currentUser) {
    if (!currentUser) return;
    $$('.current_user_initials').forEach(el => el.textContent = initialsOf(currentUser.name));
    $$('.current_user_name').forEach(el => {
        el.textContent = currentUser.name ? (currentUser.name.charAt(0).toUpperCase() + currentUser.name.slice(1)) : 'Athlete';
    });
}

/* ============================================================
   3. NAVIGATION & UI SHELL
============================================================ */
function setupNavigation() {
    const navBar = $('#navBar');
    const onScroll = () => navBar && navBar.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const drawer = $('#drawer');
    const drawerBack = $('#drawerBack');
    const burger = $('#burgerBtn');
    const drawerX = $('#drawerX');

    const openDrawer = () => {
        if (!drawer) return;
        drawer.classList.add('open');
        if (drawerBack) drawerBack.classList.add('open');
        if (burger) burger.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
        if (!drawer) return;
        drawer.classList.remove('open');
        if (drawerBack) drawerBack.classList.remove('open');
        if (burger) burger.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    };

    if (burger) burger.addEventListener('click', () => drawer && drawer.classList.contains('open') ? closeDrawer() : openDrawer());
    if (drawerBack) drawerBack.addEventListener('click', closeDrawer);
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

    const io = new IntersectionObserver(entries => entries.forEach(x => {
        if (x.isIntersecting) {
            x.target.classList.add('in');
            io.unobserve(x.target);
        }
    }), { threshold: .1 });
    $$('.reveal').forEach(el => io.observe(el));
}

/* ============================================================
   4. TABS NAVIGATION
============================================================ */
function setupTabs() {
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
}

/* ============================================================
   5. AUTHOR HELPER
============================================================ */
async function loadAuthor(wk, currentUser) {
    if (!wk) return { name: '1RM Lifter', username: '', self: false };
    const currentUserId = String(currentUser?.id || currentUser?._id || '');
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
            name: currentUser.name,
            username: currentUser.username || '',
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



/* ============================================================
   6. WORKOUT DETAIL RENDERING
============================================================ */
function renderWorkout(wk, author) {
    const exList = normalizeExercises(wk.exercises);

    document.title = '1RM ✱ ' + (wk.title || 'Session');
    const postWhen = $('#postWhen');
    if (postWhen) postWhen.textContent = fmtWhen(wk.date, wk.start_time) || '—';

    /* author */
    const authorAv = $('#authorAv');
    if (authorAv) authorAv.textContent = initialsOf(author.name);
    const authorName = $('#authorName');
    if (authorName) authorName.textContent = author.name;
    const authorHandle = $('#authorHandle');
    if (authorHandle) authorHandle.textContent = author.username ? '@' + author.username : '';
    const authorMeta = $('#authorMeta');
    if (authorMeta) authorMeta.innerHTML = '<span>' + escHtml(fmtWhen(wk.date, wk.start_time)) + '</span>';

    /* title & desc */
    const postTitle = $('#postTitle');
    if (postTitle) postTitle.innerHTML = '<span class="t-star">✱</span>' + escHtml(wk.title || 'Untitled session');
    const descEl = $('#postDesc');
    if (descEl) {
        descEl.textContent = wk.description || '';
        descEl.hidden = !wk.description;
    }

    /* photos */
    const photos = Array.isArray(wk.photos) ? wk.photos.filter(Boolean) : [];
    if (photos.length) {
        const postImg = $('#postImg');
        if (postImg) postImg.src = photos[0];
        const postImgWrap = $('#postImgWrap');
        if (postImgWrap) postImgWrap.hidden = false;
        const th = $('#postThumbs');
        if (photos.length > 1 && th) {
            th.hidden = false;
            th.innerHTML = photos.slice(1).map(p => '<img src="' + p + '" alt="Session photo">').join('');
        } else if (th) {
            th.hidden = true;
        }
    } else {
        const postImgWrap = $('#postImgWrap');
        if (postImgWrap) postImgWrap.hidden = true;
        const postThumbs = $('#postThumbs');
        if (postThumbs) postThumbs.hidden = true;
    }

    /* tags */
    const tags = [...new Set(exList.map(e => TYPE_TAG[e.type] || 'strength').filter(Boolean))];
    const postTags = $('#postTags');
    if (postTags) postTags.innerHTML = tags.map(t => '<span class="wk-tag">' + escHtml(t) + '</span>').join('');
    const imgTag = $('#imgTag');
    if (tags.length && imgTag) imgTag.innerHTML = '<b>✱</b> ' + escHtml(tags[0]);

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

    const footVolume = $('#footVolume');
    if (footVolume) footVolume.textContent = vol + (String(vol).includes('kg') ? '' : ' kg');
    const footTime = $('#footTime');
    if (footTime) footTime.textContent = time;
    const footEx = $('#footEx');
    if (footEx) footEx.textContent = exCount;
    const statVolume = $('#statVolume');
    if (statVolume) statVolume.textContent = vol;
    const statTime = $('#statTime');
    if (statTime) statTime.textContent = time;
    const statEx = $('#statEx');
    if (statEx) statEx.textContent = exCount;
    const statSets = $('#statSets');
    if (statSets) statSets.textContent = setCount;

    /* spots */
    const spots = Array.isArray(wk.spots) ? wk.spots : [];
    const spotCount = $('#spotCount');
    if (spotCount) spotCount.textContent = spots.length;
    const spottedBy = $('#spottedBy');
    if (spottedBy) spottedBy.textContent = spots.length > 0 ? '+ ' + Math.max(spots.length - 3, 0) + ' spotted this' : 'be the first to spot';
    const followBtn = $('#followBtn');
    if (author.self && followBtn) followBtn.style.display = 'none';

    /* exercise blocks */
    const list = $('#exList');
    if (list) {
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
    }

    /* volume-by-exercise bars */
    const volWrap = $('#volBars');
    if (volWrap) {
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
    }

    /* estimated maxes list */
    const estWrap = $('#estList');
    if (estWrap) {
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
}

/* ============================================================
   7. ACTIONS & COMMENTS
============================================================ */
function setupActionsAndComments(wk, currentUser) {
    const currentUserId = String(currentUser?.id || currentUser?._id || '');
    let spots = Array.isArray(wk.spots) ? wk.spots : [];
    const spotted = spots.some(s => String(s?._id ?? s) === currentUserId);
    const spotBtn = $('#spotBtn');
    const spotCount = $('#spotCount');
    if (spotted && spotBtn) spotBtn.classList.add('on');

    if (spotBtn) {
        spotBtn.addEventListener('click', async () => {
            const on = spotBtn.classList.toggle('on');
            if (spotCount) spotCount.textContent = (+spotCount.textContent) + (on ? 1 : -1);
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
            const spottedBy = $('#spottedBy');
            if (spottedBy) spottedBy.textContent = spots.length > 0 ? '+ ' + Math.max(spots.length - 3, 0) + ' spotted this' : 'be the first to spot';
            await patchWorkout(wk._id || wk.id, { spots });
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
        if (!cmtList) return;
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
        const cmtCount = $('#cmtCount');
        if (cmtCount) cmtCount.textContent = commentTotal;
    }

    comments.forEach((c, i) => addComment(c, i * 80));

    async function postComment() {
        const input = $('#cmtInput');
        if (!input) return;
        const val = input.value.trim();
        if (!val) { showToast('Say something first ✱', 'error'); return; }
        const newC = {
            i: initialsOf(currentUser.name),
            n: currentUser.name,
            h: '@' + currentUser.username,
            t: Date.now(),
            x: val,
            user: currentUser.id || currentUser._id,
            comment: val
        };
        addComment(newC);
        if (!Array.isArray(wk.comments)) wk.comments = [];
        wk.comments.push(newC);
        input.value = '';
        input.focus();
        const res = await patchWorkout(wk._id || wk.id, { comments: wk.comments });
        const updated = res.workout || res;
        if (updated && Array.isArray(updated.comments)) {
            wk.comments = updated.comments;
        }
    }

    const cmtPost = $('#cmtPost');
    if (cmtPost) cmtPost.addEventListener('click', postComment);
    const cmtInput = $('#cmtInput');
    if (cmtInput) cmtInput.addEventListener('keydown', e => { if (e.key === 'Enter') postComment(); });
}

/* ============================================================
   8. INITIALIZATION (ORCHESTRATOR)
============================================================ */
async function init() {
    handleUrlFlashMessages();

    if (!(await authenticate())) {
        sessionStorage.removeItem('token');
        window.location.href = "index.html?message=not_logged_in&from=home&status=error";
        return;
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        window.location.href = "index.html?message=not_logged_in&from=home&status=error";
        return;
    }

    applyUser(currentUser);
    setupNavigation();
    setupTabs();

    const wk = await loadWorkout();
    if (!wk) return;

    const author = await loadAuthor(wk, currentUser);
    renderWorkout(wk, author);
    setupActionsAndComments(wk, currentUser);
}

init();
