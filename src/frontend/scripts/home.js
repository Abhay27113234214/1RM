import { getCurrentUser, logout } from "./utils/userUtils.js";
import { showToast, handleUrlFlashMessages } from "./utils/frontend_utils.js";
import { authenticate } from "./utils/authUtils.js";
import { getWorkouts, getWorkout, patchWorkout } from "./utils/workoutUtils.js";

/* ============================================================
   DOM HELPERS & UTILITIES
============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));



function initialsOf(name) {
    let out = '';
    String(name || '').trim().split(/\s+/).forEach(p => { if (p) out += p[0].toUpperCase(); });
    return out || '✱';
}

const localDateKey = (d = new Date()) => {
    const date = (d instanceof Date && !isNaN(d)) ? d : new Date(d);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
};

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

const trimNum = v => String(+(+v).toFixed(1));

const dotColorFor = (name) => {
    const n = (name || '').toLowerCase();
    if (/(squat|deadlift|lunge|calf|leg)/.test(n)) return '#1E9E6A';
    if (/(row|pull|lat|curl)/.test(n)) return '#3B6FE0';
    if (/(plank|crunch|raise|twist|ab)/.test(n)) return '#D89B0B';
    if (/(run|cycle|swim|jump|walk|rope)/.test(n)) return '#D6486F';
    return '#FF4A11';
};

const summarizeSet = (set) => {
    const kg = parseFloat(set.kg) || 0;
    const reps = parseFloat(set.reps) || 0;
    const time = set.time || '';
    const dist = parseFloat(set.distance) || 0;
    if (kg && reps) return reps + ' × ' + trimNum(kg) + ' kg';
    if (time && kg) return time + ' · ' + trimNum(kg) + ' kg';
    if (dist && time) return trimNum(dist) + ' m · ' + time;
    if (kg && dist) return trimNum(kg) + ' kg · ' + trimNum(dist) + ' m';
    if (time) return time;
    if (dist) return trimNum(dist) + ' m';
    if (reps) return reps + ' reps';
    return '—';
};

function format_total_time(t) {
    if (!t) return '—';
    const p = String(t).split(':').map(Number);
    let h = 0, m = 0, s = 0;
    if (p.length === 3) { h = p[0]; m = p[1]; s = p[2]; }
    else if (p.length === 2) { m = p[0]; s = p[1]; }
    else { s = p[0]; }
    if (s >= 30) m += 1;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m} min`;
    return `${s}s`;
}

function workoutVolume(w) {
    let v = 0;
    if (Array.isArray(w.exercises)) {
        w.exercises.forEach(ex => {
            const sets = Array.isArray(ex.sets) ? ex.sets : Object.values(ex.sets || {});
            sets.forEach(s => {
                const kg = Array.isArray(s) ? parseFloat(s[0]) || 0 : parseFloat(s.kg) || 0;
                const reps = Array.isArray(s) ? parseFloat(s[1]) || 0 : parseFloat(s.reps) || 0;
                v += kg * reps;
            });
        });
    } else {
        Object.values(w.exercises || {}).forEach(ex => {
            const sets = Array.isArray(ex.sets) ? ex.sets : Object.values(ex.sets || {});
            sets.forEach(s => {
                const kg = Array.isArray(s) ? parseFloat(s[0]) || 0 : parseFloat(s.kg) || 0;
                const reps = Array.isArray(s) ? parseFloat(s[1]) || 0 : parseFloat(s.reps) || 0;
                v += kg * reps;
            });
        });
    }
    return v;
}

/* ============================================================
   USER PROFILE DISPLAY
============================================================ */
function applyUser(currentUser) {
    if (!currentUser) return;
    const initials = initialsOf(currentUser.name);

    $$('.current_user_initials').forEach(el => el.textContent = initials);
    $$('.current_user_name').forEach(el => {
        el.textContent = currentUser.name ? (currentUser.name.charAt(0).toUpperCase() + currentUser.name.slice(1)) : 'Athlete';
    });
    $$('.current_user_username').forEach(el => {
        el.textContent = currentUser.username ? `@${currentUser.username}` : '@athlete';
    });
}

/* ============================================================
   NAVIGATION & UI SHELL
============================================================ */
function setupRailDots() {
    const railEl = document.querySelector('.home .rail');
    if (!railEl) return;

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

function setupNavigation() {
    const navBar = $('#navBar');
    const onScroll = () => navBar && navBar.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const todayLine = $('#todayLine');
    if (todayLine) {
        todayLine.innerHTML = '<b>✱</b> ' + new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) + ' <span class="live-dot"></span>';
    }

    const io = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
        }
    }), { threshold: .1 });
    $$('.reveal').forEach(el => io.observe(el));

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

    $$('[data-profile]').forEach(el => el.addEventListener('click', e => {
        e.preventDefault();
        closeDrawer();
        window.location.href = "profile.html";
    }));

    $$('[data-todo]').forEach(el => el.addEventListener('click', e => {
        e.preventDefault();
        const action = el.dataset.todo;
        if (action === "signout") {
            logout();
            showToast('Signed out ✱ see you at the rack.');
            setTimeout(() => {
                window.location.href = "index.html?message=logged_out&status=success";
            }, 1000);
        }
    }));

    setupRailDots();
}

/* ============================================================
   RESUME WORKOUT FLOATER
============================================================ */
function checkResumeFloat() {
    const float = $('#resumeFloat');
    if (!float) return;

    let active = null;
    try { active = JSON.parse(localStorage.getItem('current_user_workout')); } catch (_) { }

    if (!active) {
        float.hidden = true;
        float.classList.remove('on');
        return;
    }

    if (!active.exercises || Object.keys(active.exercises).length === 0) {
        localStorage.removeItem('current_user_workout');
        float.hidden = true;
        float.classList.remove('on');
        return;
    }

    if ($('#rfEx')) $('#rfEx').textContent = Object.keys(active.exercises).at(-1);
    if ($('#rfTimeWrap')) $('#rfTimeWrap').style.display = (active.startedAt || active.start_time) ? '' : 'none';

    float.hidden = false;
    setTimeout(() => float.classList.add('on'), 350);

    if (active.time && $('#rfTime')) $('#rfTime').textContent = active.time;
}

function setupResumeFloater() {
    checkResumeFloat();
    window.addEventListener('pageshow', checkResumeFloat);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkResumeFloat();
    });
}

/* ============================================================
   PROFILE INCOMPLETE BANNER
============================================================ */
function setupProfileBanner(currentUser) {
    const banner = $('#profileBanner');
    if (!banner) return;

    let user = currentUser;
    if (!user) {
        try { user = JSON.parse(localStorage.getItem('current_user')); } catch (_) { }
    }

    if (!user || user.incomplete !== true) {
        banner.hidden = true;
        return;
    }

    banner.hidden = false;

    function hideBanner() {
        banner.style.height = banner.offsetHeight + 'px';
        requestAnimationFrame(() => {
            banner.classList.add('bye');
            banner.style.height = '0px';
            banner.style.marginTop = '0';
            banner.style.paddingTop = '0';
            banner.style.paddingBottom = '0';
        });
        setTimeout(() => banner.remove(), 450);
    }

    const bannerX = $('#profileBannerX');
    if (bannerX) bannerX.addEventListener('click', hideBanner);

    const bannerLink = $('#profileBannerLink');
    if (bannerLink) {
        bannerLink.addEventListener('click', e => {
            e.preventDefault();
            window.location.href = 'profile.html?setup=1';
        });
    }
}

/* ============================================================
   POST CARDS RENDERING & FEED
============================================================ */
function renderWorkoutInPostCard(element) {
    const exercises = element.exercises || [];
    if (Array.isArray(exercises)) {
        return exercises.map(exItem => {
            const name = exItem.exercise?.name || exItem.name || 'Exercise';
            const sets = exItem.sets || [];
            const count = sets.length;
            const last = sets[count - 1] || {};
            return `
                <div class="p-row" style="--c:${dotColorFor(name)}">
                    <span class="nm">${esc(name)}</span>
                    <span class="mt">${count} set${count !== 1 ? 's' : ''} · ${summarizeSet(last)}</span>
                </div>`;
        }).join('');
    }

    return Object.entries(exercises).map(([name, ex]) => {
        const sets = Object.values(ex.sets || {});
        const count = sets.length;
        const last = sets[count - 1] || {};
        return `
            <div class="p-row" style="--c:${dotColorFor(name)}">
                <span class="nm">${esc(name)}</span>
                <span class="mt">${count} set${count !== 1 ? 's' : ''} · ${summarizeSet(last)}</span>
            </div>`;
    }).join('');
}

function buildPostCard(element, currentUser) {
    const user = (typeof element.user === 'object' && element.user !== null)
        ? element.user
        : { name: currentUser?.name || 'Athlete', username: currentUser?.username || 'athlete' };

    const initials = initialsOf(user.name);
    const photo = (element.photos && element.photos.length >= 1) ? element.photos[0] : "../assets/default_workout_image.png";
    const spots = Array.isArray(element.spots) ? element.spots : [];
    const comments = Array.isArray(element.comments) ? element.comments : [];
    const currentUserId = String(currentUser?.id || currentUser?._id || '');
    const spotted = spots.some(s => String(s?._id ?? s) === currentUserId);
    const lastC = comments[comments.length - 1];

    return `
        <div class="post-shell" data-id="${element._id || element.id}">
            <article class="post" tabindex="0" role="button" aria-label="Open ${esc(user.name)}'s workout">
                <div class="p-head">
                    <span class="av" style="background:#FF4A11">${esc(initials)}</span>
                    <div class="p-who">
                        <div class="p-name">${esc(user.name)}</div>
                        <div class="p-meta"><span>@${esc(user.username || 'athlete')}</span><span>·</span><span>${get_proper_time_from_start(element.start_time)} ago</span></div>
                    </div>
                </div>
                <h3 class="p-title">${esc(element.title || 'Untitled session')}</h3>
                <div class="p-img">
                    <img src="${photo}" alt="workout photo" loading="lazy">
                    <span class="img-tag"><b>✱</b> strength</span>
                </div>
                <div class="p-rows">${renderWorkoutInPostCard(element)}</div>
                <div class="p-foot"><span>volume <b>${element.total_volume || '0'} kg</b></span><span>time <b>${format_total_time(element.total_time)}</b></span></div>
                <div class="p-acts">
                    <button class="act ${spotted ? 'on' : ''}" data-action="spot"><span class="st">✱</span>Spot · <span data-count>${spots.length}</span></button>
                    <button class="act" data-action="comment">Comment · <span data-ccount>${comments.length}</span></button>
                    <button class="act share" data-action="share">Share</button>
                </div>
                ${lastC ? `<div class="p-comment"><b>${esc(lastC.n || lastC.user?.name || 'User')} · ${get_proper_time_from_start(lastC.t || lastC.createdAt)} ago</b>“${esc(lastC.x || lastC.comment || '')}”</div>` : ''}
                <div class="p-cbox" hidden>
                    <input type="text" placeholder="Say something nice…">
                    <button class="btn-primary" data-action="send">Post</button>
                </div>
            </article>
        </div>
    `;
}

async function renderPosts(currentUser) {
    try {
        const workouts = await getWorkouts({}, { date: -1 });
        if (!Array.isArray(workouts)) return [];

        const today = localDateKey();
        const currentUserId = String(currentUser?.id || currentUser?._id || '');

        const mineToday = workouts.filter(w => {
            const wUserId = String(w.user?._id ?? w.user ?? w.user_id);
            const wDate = localDateKey(new Date(w.date || w.createdAt || w.start_time));
            return wUserId === currentUserId && wDate === today;
        });

        const feedList = workouts.filter(w => {
            const wUserId = String(w.user?._id ?? w.user ?? w.user_id);
            return wUserId !== currentUserId;
        });

        const startWorkoutBtn = $('#startWorkout');
        if (mineToday.length >= 1 && startWorkoutBtn) {
            startWorkoutBtn.hidden = true;
        }

        const myToday = $('#myToday');
        if (myToday) {
            let myHtml = '<div class="my-today-lbl">your sessions today</div>';
            for (const workout of mineToday) {
                myHtml += buildPostCard(workout, currentUser);
            }
            myToday.innerHTML = myHtml;
        }

        const feed = $('#feed');
        if (feed) {
            let feedHtml = '';
            for (const workout of feedList) {
                feedHtml += buildPostCard(workout, currentUser);
            }
            feed.innerHTML = feedHtml;
        }

        return workouts;
    } catch (err) {
        console.error("renderPosts error:", err);
        return [];
    }
}

/* ============================================================
   FEED ACTIONS & POST NAVIGATION
============================================================ */
function setupFeedInteractions(currentUser) {
    const currentUserId = String(currentUser?.id || currentUser?._id || '');
    const OPEN_DELAY = 250;
    let openingPost = false;

    function openPost(post) {
        const id = post.closest('.post-shell')?.dataset.id;
        if (!id || openingPost) return;
        openingPost = true;
        post.closest('.post-shell')?.classList.add('opening');
        setTimeout(() => {
            window.location.href = 'post.html?id=' + id;
        }, OPEN_DELAY);
    }

    document.addEventListener('click', async e => {
        /* 1. Spot Action */
        const spot = e.target.closest('[data-action="spot"]');
        if (spot) {
            const shell = spot.closest('.post-shell');
            const workoutId = shell?.dataset.id;
            if (!workoutId) return;

            const res = await getWorkout(workoutId);
            const w = res.workout || res;
            let spots = Array.isArray(w.spots) ? w.spots : [];
            const has = spots.some(uid => String(uid?._id ?? uid) === currentUserId);

            spots = has
                ? spots.filter(uid => String(uid?._id ?? uid) !== currentUserId)
                : [...spots, currentUserId];

            const updatedRes = await patchWorkout(w._id || w.id, { spots });
            const updated = updatedRes.workout || updatedRes;

            spot.classList.toggle('on', !has);
            const countEl = spot.querySelector('[data-count]');
            if (countEl) countEl.textContent = updated.spots ? updated.spots.length : spots.length;
            return;
        }

        /* 2. Comment Box Toggle */
        const cmt = e.target.closest('[data-action="comment"]');
        if (cmt) {
            const box = cmt.closest('.post')?.querySelector('.p-cbox');
            if (box) {
                box.hidden = !box.hidden;
                if (!box.hidden) box.querySelector('input')?.focus();
            }
            return;
        }

        /* 3. Send Comment */
        const send = e.target.closest('[data-action="send"]');
        if (send) {
            const post = send.closest('.post');
            const shell = post?.closest('.post-shell');
            const workoutId = shell?.dataset.id;
            const input = post?.querySelector('.p-cbox input');
            const text = input?.value.trim();
            if (!text || !workoutId) {
                input?.focus();
                return;
            }

            send.disabled = true;
            const res = await getWorkout(workoutId);
            const w = res.workout || res;
            const comments = Array.isArray(w.comments) ? w.comments : [];

            comments.push({
                i: initialsOf(currentUser.name),
                n: currentUser.name,
                h: currentUser.username ? `@${currentUser.username}` : '@athlete',
                x: text,
                t: Date.now(),
                user: currentUserId,
                comment: text
            });

            const updatedRes = await patchWorkout(w._id || w.id, { comments });
            const updated = updatedRes.workout || updatedRes;
            send.disabled = false;

            const lastC = (updated.comments && updated.comments.length)
                ? updated.comments[updated.comments.length - 1]
                : comments[comments.length - 1];

            const html = `<b>${esc(lastC.n || lastC.user?.name || currentUser.name)} · ${get_proper_time_from_start(lastC.t || lastC.createdAt)} ago</b>“${esc(lastC.x || lastC.comment || '')}”`;
            let pComment = post.querySelector('.p-comment');
            if (pComment) {
                pComment.innerHTML = html;
            } else {
                pComment = document.createElement('div');
                pComment.className = 'p-comment';
                pComment.innerHTML = html;
                post.querySelector('.p-cbox')?.before(pComment);
            }

            const ccountEl = post.querySelector('[data-ccount]');
            if (ccountEl) ccountEl.textContent = updated.comments ? updated.comments.length : comments.length;
            input.value = '';
            post.querySelector('.p-cbox').hidden = true;
            return;
        }

        /* 4. Follow Action */
        const follow = e.target.closest('[data-action="follow"]');
        if (follow) {
            const on = follow.classList.toggle('on');
            follow.textContent = on ? 'Following ✱' : 'Follow';
            return;
        }

        /* 5. Share Action */
        const share = e.target.closest('[data-action="share"]');
        if (share) {
            const shell = share.closest('.post-shell');
            const workoutId = shell?.dataset.id;
            const shareUrl = workoutId ? `${window.location.origin}/src/frontend/templates/post.html?id=${workoutId}` : window.location.href;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(shareUrl);
            }
            showToast('Link copied ✱ share the grind.');
            return;
        }

        /* 6. Post Card Click Navigation */
        const post = e.target.closest('.post');
        if (!post) return;
        if (e.target.closest('button, a, input, textarea')) return;
        openPost(post);
    });

    document.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const post = e.target.closest('.post');
        if (!post) return;
        if (e.target.closest('input, textarea, button, a')) return;
        e.preventDefault();
        openPost(post);
    });
}

/* ============================================================
   WEEK ACTIVITY SUMMARY
============================================================ */
async function renderWeek(currentUser, workouts = null) {
    const wkEl = document.querySelector('.home .rail .wk');
    if (!wkEl) return;

    const cells = Array.from(wkEl.children);
    if (cells.length !== 7) return;

    const currentUserId = String(currentUser?.id || currentUser?._id || '');
    let mine = [];

    if (Array.isArray(workouts)) {
        mine = workouts.filter(w => String(w.user?._id ?? w.user ?? w.user_id) === currentUserId);
    } else {
        try {
            const res = await getWorkouts({ user: currentUserId }, { date: -1 });
            mine = Array.isArray(res) ? res : [];
        } catch (_) {
            mine = [];
        }
    }

    const now = new Date();
    const todayIdx = (now.getDay() + 6) % 7; // 0 = Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - todayIdx);

    const perDay = Array(7).fill(0);
    let weekSessions = 0, weekVol = 0;

    mine.forEach(w => {
        const rawDate = w.date || w.createdAt || w.start_time;
        const wDateStr = localDateKey(new Date(rawDate));
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            if (wDateStr === localDateKey(d)) {
                perDay[i]++;
                weekSessions++;
                weekVol += workoutVolume(w);
            }
        }
    });

    cells.forEach((c, i) => {
        c.className = '';
        if (perDay[i] === 1) c.classList.add('l2');
        if (perDay[i] >= 2) c.classList.add('l4');
        if (i === todayIdx) c.classList.add('today');
    });

    const panel = wkEl.closest('.panel-flat');
    if (panel) {
        const hvs = panel.querySelectorAll('.hv');
        const hls = panel.querySelectorAll('.hl');
        const goal = parseInt((currentUser?.trainingDays || '').split('-')[1]) || 5;
        if (hvs[0]) hvs[0].textContent = weekSessions;
        if (hls[0]) hls[0].textContent = '/ ' + goal + ' sessions';
        if (hvs[1]) hvs[1].textContent = Math.round(weekVol).toLocaleString('en-US');
        if (hls[1]) hls[1].textContent = 'kg volume';
    }
}

/* ============================================================
   INITIALIZATION
============================================================ */
async function init() {
    handleUrlFlashMessages({
        workout_completed: () => {
            localStorage.removeItem('current_user_workout');
        }
    });

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
    setupResumeFloater();
    setupProfileBanner(currentUser);
    setupFeedInteractions(currentUser);

    const workouts = await renderPosts(currentUser);
    await renderWeek(currentUser, workouts);
}

init();
