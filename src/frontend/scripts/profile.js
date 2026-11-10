import { logout, getCurrentUser } from "./utils/userUtils.js";
import { authenticate } from "./utils/authUtils.js";
import { showToast, handleUrlFlashMessages } from "./utils/frontend_utils.js";
import { getWorkouts } from "./utils/workoutUtils.js";

/* ============================================================
   1. DOM HELPERS & FORMATTING UTILITIES
============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const escHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const fmtInt = n => Math.round(n).toLocaleString('en-US');
const trimNum = v => String(+(+v).toFixed(1));

function initialsOf(name) {
    let out = '';
    String(name || '').trim().split(/\s+/).forEach(p => { if (p) out += p[0].toUpperCase(); });
    return out || '✱';
}

const dayKey = (d) => {
    const date = (d instanceof Date && !isNaN(d)) ? d : new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
};

const dayLabel = (dateVal) => {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'Session';
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const checkD = new Date(d); checkD.setHours(0, 0, 0, 0);
    const diff = Math.round((t - checkD) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

const dotColorFor = (name) => {
    const n = (name || '').toLowerCase();
    if (/(squat|deadlift|lunge|calf|leg)/.test(n)) return '#1E9E6A';
    if (/(row|pull|lat|curl)/.test(n)) return '#3B6FE0';
    if (/(plank|crunch|raise|twist|ab)/.test(n)) return '#D89B0B';
    if (/(run|cycle|swim|jump|walk|rope)/.test(n)) return '#D6486F';
    return '#FF4A11';
};

const summarizeSet = (set) => {
    const kg = Array.isArray(set) ? parseFloat(set[0]) || 0 : parseFloat(set.kg) || 0;
    const reps = Array.isArray(set) ? parseFloat(set[1]) || 0 : parseFloat(set.reps) || 0;
    const time = Array.isArray(set) ? '' : (set.time || '');
    const dist = Array.isArray(set) ? 0 : (parseFloat(set.distance) || 0);
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

function get_proper_time_from_start(oldTime) {
    if (!oldTime) return 'just now';
    const timeMs = typeof oldTime === 'number' ? oldTime : new Date(oldTime).getTime();
    if (isNaN(timeMs)) return 'just now';
    const elapsed = Date.now() - timeMs;
    if (elapsed < 60000) return 'just now';
    const days = Math.floor(elapsed / 86400000);
    const hours = Math.floor((elapsed % 86400000) / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m`;
    return result.trim() || 'just now';
}

function volumeOfWorkout(workout) {
    let total = 0;
    const exercises = Array.isArray(workout.exercises) ? workout.exercises : Object.values(workout.exercises || {});
    exercises.forEach(ex => {
        const sets = Array.isArray(ex.sets) ? ex.sets : Object.values(ex.sets || {});
        sets.forEach(set => {
            const kg = Array.isArray(set) ? parseFloat(set[0]) || 0 : parseFloat(set.kg) || 0;
            const reps = Array.isArray(set) ? parseFloat(set[1]) || 0 : parseFloat(set.reps) || 0;
            total += kg * reps;
        });
    });
    return total;
}

function groupWorkoutsByDay(workouts) {
    const byDay = {};
    workouts.forEach(w => {
        const rawDate = w.date || w.createdAt || w.start_time;
        if (!rawDate) return;
        const dk = dayKey(new Date(rawDate));
        if (!dk) return;
        if (!byDay[dk]) byDay[dk] = { sessions: 0, volume: 0 };
        byDay[dk].sessions++;
        byDay[dk].volume += volumeOfWorkout(w);
    });
    return byDay;
}

function intensityFor(entry) {
    if (!entry) return 0;
    if (entry.sessions >= 2) return 4;
    if (entry.volume >= 9000) return 4;
    if (entry.volume >= 6000) return 3;
    if (entry.volume >= 2500) return 2;
    return 1;
}

function tooltipFor(entry, label) {
    if (!entry) return label + ' · rest day';
    const vol = Math.round(entry.volume).toLocaleString('en-US');
    return label + ' · ' + entry.sessions + ' session' + (entry.sessions > 1 ? 's' : '') +
        (entry.volume > 0 ? ' · ' + vol + ' kg' : ' · bodyweight / cardio');
}

/* ============================================================
   2. USER PROFILE DISPLAY & METADATA
============================================================ */
function getProfileData(currentUser) {
    const uid = String(currentUser?.id || currentUser?._id || currentUser?.username || 'user');
    let data = {};
    try {
        const stored = localStorage.getItem('user_profile_meta_' + uid);
        if (stored) data = JSON.parse(stored);
    } catch (_) {}

    return {
        name: data.name || currentUser?.name || 'Alex Kowalski',
        bio: (data.bio !== undefined) ? data.bio : (currentUser?.bio || '"Show up. Put in the work. The rack remembers every kilo." Everything below is yours alone — edit any number and the smart coach recalibrates on the spot.'),
        socialLinks: data.socialLinks || currentUser?.socialLinks || {
            instagram: 'alexk_fit',
            youtube: 'alexk_fit',
            twitter: 'alexk_fit',
            website: ''
        },
        followersCount: data.followersCount || currentUser?.followersCount || '1.4k',
        followingCount: data.followingCount || currentUser?.followingCount || '382'
    };
}

function saveProfileData(currentUser, data) {
    const uid = String(currentUser?.id || currentUser?._id || currentUser?.username || 'user');
    try {
        localStorage.setItem('user_profile_meta_' + uid, JSON.stringify(data));
    } catch (_) {}
}

function renderSocialLinks(links) {
    const container = $('#heroSocialLinks');
    if (!container) return;
    container.innerHTML = '';

    const ig = links?.instagram?.trim();
    const yt = links?.youtube?.trim();
    const tw = links?.twitter?.trim();
    const web = links?.website?.trim();

    let count = 0;
    const cleanHandle = (val) => val.replace(/^https?:\/\/(www\.)?/, '').replace(/^(instagram\.com|youtube\.com|x\.com|twitter\.com)\/?/i, '').replace(/^@/, '').replace(/\/$/, '');

    if (ig) {
        count++;
        const url = /^https?:\/\//i.test(ig) ? ig : `https://instagram.com/${cleanHandle(ig)}`;
        container.innerHTML += `
            <a href="${escHtml(url)}" target="_blank" rel="noopener noreferrer" class="hero-link-pill" title="Instagram: @${escHtml(cleanHandle(ig))}">
                <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                <span>${escHtml(cleanHandle(ig))}</span>
            </a>`;
    }

    if (yt) {
        count++;
        const cleanYt = cleanHandle(yt);
        const url = /^https?:\/\//i.test(yt) ? yt : `https://youtube.com/@${cleanYt}`;
        container.innerHTML += `
            <a href="${escHtml(url)}" target="_blank" rel="noopener noreferrer" class="hero-link-pill" title="YouTube: ${escHtml(cleanYt)}">
                <svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                <span>${escHtml(cleanYt)}</span>
            </a>`;
    }

    if (tw) {
        count++;
        const cleanTw = cleanHandle(tw);
        const url = /^https?:\/\//i.test(tw) ? tw : `https://x.com/${cleanTw}`;
        container.innerHTML += `
            <a href="${escHtml(url)}" target="_blank" rel="noopener noreferrer" class="hero-link-pill" title="X: @${escHtml(cleanTw)}">
                <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                <span>${escHtml(cleanTw)}</span>
            </a>`;
    }

    if (web) {
        count++;
        const url = /^https?:\/\//i.test(web) ? web : `https://${web}`;
        const display = web.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
        container.innerHTML += `
            <a href="${escHtml(url)}" target="_blank" rel="noopener noreferrer" class="hero-link-pill" title="Website: ${escHtml(display)}">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                <span>${escHtml(display)}</span>
            </a>`;
    }

    if (count === 0) {
        container.innerHTML = `
            <button class="hero-link-pill add-link" id="heroAddLinksBtn" type="button">
                <span>+ Add links</span>
            </button>`;
        const addBtn = $('#heroAddLinksBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                $('#editProfileBtn')?.click();
            });
        }
    }
}

function applyUser(currentUser) {
    if (!currentUser) return;
    const profileData = getProfileData(currentUser);
    const name = String(profileData.name || currentUser.name || '').trim();
    const initials = initialsOf(name);

    $$('.current_user_initials').forEach(el => el.textContent = initials);
    $$('.current_user_name').forEach(el => {
        el.textContent = name ? (name.charAt(0).toUpperCase() + name.slice(1)) : 'Athlete';
    });
    $$('.current_user_username').forEach(el => {
        el.textContent = '@' + String(currentUser.username || 'athlete').replace(/^@/, '');
    });

    const parts = name.split(/\s+/);
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ');
    const greetName = $('#greetName');
    if (greetName) {
        greetName.innerHTML = escHtml(first.toUpperCase()) +
            (last ? ' <em>' + escHtml(last) + '</em>' : '');
    }

    const bioEl = $('#heroBio');
    if (bioEl) {
        bioEl.textContent = profileData.bio;
    }

    const followersEl = $('#heroFollowers');
    if (followersEl) followersEl.textContent = profileData.followersCount;
    const followingEl = $('#heroFollowing');
    if (followingEl) followingEl.textContent = profileData.followingCount;

    renderSocialLinks(profileData.socialLinks);
}

/* ============================================================
   3. NAVIGATION & UI SHELL
============================================================ */
function setupNavigation() {
    const navBar = $('#navBar');
    const onScroll = () => navBar && navBar.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const dateLine = $('#dateLine');
    if (dateLine) {
        dateLine.innerHTML = '<b>✱</b> ' +
            new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) +
            ' <span class="live-dot"></span>';
    }

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

    $$('[data-todo]').forEach(el => el.addEventListener('click', e => {
        e.preventDefault();
        closeDrawer();
        const action = el.dataset.todo;
        if (action === 'settings') {
            $('#settingsPanel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (action === 'signout') {
            logout();
            showToast('Signed out ✱ see you at the rack.');
            setTimeout(() => {
                window.location.href = 'index.html?message=logged_out&status=success';
            }, 1200);
        }
    }));

    const io = new IntersectionObserver(entries => entries.forEach(x => {
        if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
    }), { threshold: .1 });
    $$('.reveal').forEach(el => io.observe(el));

    const cio = new IntersectionObserver(entries => entries.forEach(x => {
        if (!x.isIntersecting) return;
        cio.unobserve(x.target);
        const el = x.target;
        const target = parseFloat(el.dataset.count);
        if (isNaN(target)) return;
        const t0 = performance.now(), dur = 1400;
        (function tick(t) {
            const p = Math.min(1, (t - t0) / dur);
            const e = 1 - Math.pow(1 - p, 3);
            el.textContent = fmtInt(target * e);
            if (p < 1) requestAnimationFrame(tick);
        })(t0);
    }), { threshold: .5 });
    $$('[data-count]').forEach(el => cio.observe(el));

}

/* ============================================================
   3B. CONTENT TOGGLE TABS (SESSIONS, PRS, SPLITS/PROGRAMS)
============================================================ */
function setupContentTabs() {
    const tabs = $$('.c-tab');
    if (!tabs.length) return;
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            const targetId = tab.dataset.tab;
            $$('.tab-view').forEach(view => {
                if (view.id === targetId) {
                    view.hidden = false;
                    view.classList.add('active');
                } else {
                    view.hidden = true;
                    view.classList.remove('active');
                }
            });
        });
    });
}

/* ============================================================
   3C. USER SPLITS & PROGRAMS
============================================================ */
const DEFAULT_PROGRAMS = [
    {
        id: 'prog-1',
        title: 'Push Day A — Chest, Delts & Triceps',
        focus: 'Chest & Anterior Delts',
        schedule: 'Monday · Day 1',
        color: '#FF4A11',
        exercises: ['Barbell Bench Press · 4 × 6', 'Incline Dumbbell Press · 3 × 8', 'Seated Overhead Press · 3 × 8', 'Weighted Dips · 3 × 12', 'Lateral Raises · 4 × 15'],
        cue: '2s eccentric on bench press. Drive upper back into the pad. Rest 2–3m on heavy sets.',
        isDefault: true
    },
    {
        id: 'prog-2',
        title: 'Pull Day A — Lats & Posterior Chain',
        focus: 'Back, Rear Delts & Biceps',
        schedule: 'Tuesday · Day 2',
        color: '#3B6FE0',
        exercises: ['Conventional Deadlift · 4 × 4', 'Weighted Pull-ups · 4 × 6', 'Barbell Chest-Supported Row · 3 × 8', 'Face Pulls · 3 × 20', 'Incline DB Curls · 3 × 12'],
        cue: 'Lock lats in before breaking the floor. Pull elbow back rather than curling weight.',
        isDefault: true
    },
    {
        id: 'prog-3',
        title: 'Leg Day A — Quad & Knee Flexion',
        focus: 'Quads, Calves & Abs',
        schedule: 'Wednesday · Day 3',
        color: '#1E9E6A',
        exercises: ['Barbell Back Squat · 4 × 6', 'Romanian Deadlift · 3 × 8', 'Bulgarian Split Squat · 3 × 10', 'Standing Calf Raise · 4 × 15', 'Hanging Leg Raise · 3 × 15'],
        cue: 'Hit full depth with brace. Push floor apart on squat ascent.',
        isDefault: true
    },
    {
        id: 'prog-4',
        title: 'Upper Power — Density & Volume',
        focus: 'Upper Body Power & Hypertrophy',
        schedule: 'Friday · Day 5',
        color: '#D89B0B',
        exercises: ['Paused Bench Press · 3 × 3', 'Barbell Pendlay Row · 4 × 6', 'Overhead Press · 3 × 6', 'Incline Hammer Curls · 3 × 12', 'Overhead Cable Ext · 3 × 15'],
        cue: 'Strict pause at chest before pressing. Zero leg drive on Pendlay rows.',
        isDefault: true
    }
];

function getUserPrograms() {
    try {
        const stored = localStorage.getItem('user_programs');
        if (stored) return JSON.parse(stored);
    } catch (_) {}
    return DEFAULT_PROGRAMS;
}

function saveUserPrograms(progs) {
    try {
        localStorage.setItem('user_programs', JSON.stringify(progs));
    } catch (_) {}
}

function renderUserSplits() {
    const weekGrid = $('#splitWeekGrid');
    if (weekGrid) {
        const todayIdx = (new Date().getDay() + 6) % 7; // Mon = 0
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const splitDays = [
            { t: 'Push A', c: '#FF4A11' },
            { t: 'Pull A', c: '#3B6FE0' },
            { t: 'Legs A', c: '#1E9E6A' },
            { t: 'Push B', c: '#FF4A11' },
            { t: 'Pull B', c: '#3B6FE0' },
            { t: 'Upper', c: '#D89B0B' },
            { t: 'Rest', c: 'var(--muted)', rest: true }
        ];
        weekGrid.innerHTML = splitDays.map((item, i) => `
            <div class="sp-day ${item.rest ? 'rest' : ''} ${i === todayIdx ? 'today' : ''}">
                <span class="d">${days[i]}</span>
                <span class="t" style="--sc:${item.c}">${item.t}</span>
            </div>
        `).join('');
    }

    const list = $('#programsList');
    if (!list) return;
    const progs = getUserPrograms();
    if (!progs.length) {
        list.innerHTML = `<div class="panel-flat"><p class="month-sub">No custom programs yet. Click "+ New Program" above to create your first routine.</p></div>`;
        return;
    }

    list.innerHTML = progs.map(p => `
        <article class="panel-flat program-card" data-prog-id="${p.id}">
            <div class="prog-top">
                <div class="prog-title-row">
                    <span class="prog-dot" style="background:${p.color || '#FF4A11'}"></span>
                    <h3 class="prog-title">${escHtml(p.title)}</h3>
                    ${!p.isDefault ? `<button class="prog-del-btn" data-del-prog="${p.id}" title="Delete program">✕</button>` : ''}
                </div>
                <div class="prog-meta">
                    <span class="prog-badge"><b>✱</b> ${escHtml(p.focus || 'Strength')}</span>
                    <span class="prog-sched">${escHtml(p.schedule || 'Scheduled')}</span>
                </div>
            </div>
            <div class="prog-exercises">
                ${(Array.isArray(p.exercises) ? p.exercises : String(p.exercises).split(',')).map(ex => `
                    <span class="prog-ex-pill">${escHtml(ex.trim())}</span>
                `).join('')}
            </div>
            ${p.cue ? `<div class="prog-cue"><b>Coach Note:</b> “${escHtml(p.cue)}”</div>` : ''}
            <div class="prog-acts">
                <a href="workout.html" class="btn-start-prog">
                    <span class="dc-plus">+</span>
                    <span>Start this routine</span>
                    <span class="arr">→</span>
                </a>
            </div>
        </article>
    `).join('');
}

function setupProgramCreation() {
    const createBtn = $('#createProgramBtn');
    const modal = $('#programModal');
    const form = $('#programForm');

    function openModal() {
        if (!modal) return;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        setTimeout(() => $('#pmTitle')?.focus({ preventScroll: true }), 280);
    }

    function closeModal() {
        if (!modal) return;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    if (createBtn) createBtn.addEventListener('click', openModal);

    if (modal) {
        modal.addEventListener('click', e => {
            if (e.target.closest('[data-close-program]')) closeModal();
        });
    }

    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const title = $('#pmTitle')?.value.trim();
            const focus = $('#pmFocus')?.value.trim() || 'Strength';
            const schedule = $('#pmDays')?.value.trim() || 'Custom';
            const exStr = $('#pmExercises')?.value.trim();
            const notes = $('#pmNotes')?.value.trim() || '';

            if (!title || !exStr) {
                showToast('Provide a program title and exercises ✱', 'error');
                return;
            }

            const newProg = {
                id: 'prog-' + Date.now(),
                title: title,
                focus: focus,
                schedule: schedule,
                color: '#FF4A11',
                exercises: exStr.split(',').map(s => s.trim()).filter(Boolean),
                cue: notes,
                isDefault: false
            };

            const progs = getUserPrograms();
            progs.unshift(newProg);
            saveUserPrograms(progs);
            renderUserSplits();
            form.reset();
            closeModal();
            showToast('Program created ✱ ready to hit the rack.');
        });
    }

    document.addEventListener('click', e => {
        const delBtn = e.target.closest('[data-del-prog]');
        if (delBtn) {
            const id = delBtn.dataset.delProg;
            let progs = getUserPrograms();
            progs = progs.filter(p => p.id !== id);
            saveUserPrograms(progs);
            renderUserSplits();
            showToast('Program removed ✱');
        }
    });
}

/* ============================================================
   4. SETTINGS & PREFERENCES
============================================================ */
function setupSettingsAndPreferences() {
    $$('[data-group]').forEach(group => {
        group.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                group.querySelectorAll('button').forEach(b => b.classList.remove('active', 'on'));
                btn.classList.add(group.classList.contains('seg') ? 'on' : 'active');
                showToast('Preferences saved ✱ coach recalibrated.');
            });
        });
    });

    $$('.toggle').forEach(t => t.addEventListener('click', () => {
        const on = t.classList.toggle('on');
        showToast((t.dataset.name || 'Setting') + (on ? ' — on ✱' : ' — off.'));
    }));

    const loadMore = $('#loadMore');
    if (loadMore) {
        loadMore.addEventListener('click', () => {
            showToast('Older sessions load here ✱ wire up your pagination.');
        });
    }

    const prHistory = $('#prHistory');
    if (prHistory) {
        prHistory.addEventListener('click', () => {
            showToast('Full PR history opens here ✱ wire up the page.');
        });
    }

    const exportBtn = $('#exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            showToast('Exporting your log ✱ CSV on its way.');
        });
    }

    const signOutBtn = $('#signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            logout();
            showToast('Signed out ✱ see you at the rack.');
            setTimeout(() => {
                window.location.href = 'index.html?message=logged_out&status=success';
            }, 1200);
        });
    }
}

/* ============================================================
   5. EDIT PROFILE MODAL
============================================================ */
function setupEditProfileModal(currentUser) {
    const editModal = $('#editModal');
    let lastFocus = null;

    function openModal() {
        if (!editModal) return;
        lastFocus = document.activeElement;
        const profileData = getProfileData(currentUser);

        if ($('#efFullName')) $('#efFullName').value = profileData.name || currentUser.name || '';
        if ($('#efUser')) $('#efUser').value = '@' + String(currentUser.username || 'athlete').replace(/^@/, '');
        if ($('#efEmail')) $('#efEmail').value = currentUser.email || '';
        if ($('#efBio')) $('#efBio').value = profileData.bio || '';

        const links = profileData.socialLinks || {};
        if ($('#efInstagram')) $('#efInstagram').value = links.instagram || '';
        if ($('#efYoutube')) $('#efYoutube').value = links.youtube || '';
        if ($('#efTwitter')) $('#efTwitter').value = links.twitter || '';
        if ($('#efWebsite')) $('#efWebsite').value = links.website || '';

        editModal.classList.add('open');
        editModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        setTimeout(() => $('#efFullName')?.focus({ preventScroll: true }), 320);
    }

    function closeModal() {
        if (!editModal) return;
        editModal.classList.remove('open');
        editModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }

    if (editModal) {
        editModal.addEventListener('click', e => {
            if (e.target.closest('[data-close]')) closeModal();
        });
    }

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (editModal && editModal.classList.contains('open')) closeModal();
    });

    const editProfileBtn = $('#editProfileBtn');
    if (editProfileBtn) editProfileBtn.addEventListener('click', openModal);

    const avBtn = $('#avBtn');
    if (avBtn) avBtn.addEventListener('click', openModal);

    const navAvBtn = $('#navAvBtn');
    if (navAvBtn) navAvBtn.addEventListener('click', openModal);

    const editForm = $('#editForm');
    if (editForm) {
        editForm.addEventListener('submit', e => {
            e.preventDefault();
            const fullName = $('#efFullName')?.value.trim();
            if (!fullName) {
                showToast('Please enter your full name ✱', 'error');
                return;
            }

            const bio = $('#efBio')?.value.trim() ?? '';
            const socialLinks = {
                instagram: $('#efInstagram')?.value.trim() ?? '',
                youtube: $('#efYoutube')?.value.trim() ?? '',
                twitter: $('#efTwitter')?.value.trim() ?? '',
                website: $('#efWebsite')?.value.trim() ?? ''
            };

            currentUser.name = fullName;

            const profileData = getProfileData(currentUser);
            profileData.name = fullName;
            profileData.bio = bio;
            profileData.socialLinks = socialLinks;

            saveProfileData(currentUser, profileData);

            try {
                localStorage.setItem('current_user', JSON.stringify(currentUser));
            } catch (_) {}

            applyUser(currentUser);
            closeModal();
            showToast('Profile updated ✱ lookin\' sharp on the rack.');
        });
    }
}

/* ============================================================
   5B. BODY MEASUREMENTS MODAL
============================================================ */
function setupMeasurementModal(currentUser) {
    const measureModal = $('#measureModal');
    const measureForm = $('#measureForm');
    const editMeasureBtn = $('#editMeasureBtn');

    function openMeasureModal() {
        if (!measureModal) return;
        if ($('#mfHeight')) $('#mfHeight').value = $('#msHeight')?.textContent || '182';
        if ($('#mfWeight')) $('#mfWeight').value = $('#msWeight')?.textContent || '84.5';
        if ($('#mfFat')) $('#mfFat').value = $('#msFat')?.textContent || '14.2';

        measureModal.classList.add('open');
        measureModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        setTimeout(() => $('#mfWeight')?.focus({ preventScroll: true }), 320);
    }

    function closeMeasureModal() {
        if (!measureModal) return;
        measureModal.classList.remove('open');
        measureModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    if (editMeasureBtn) editMeasureBtn.addEventListener('click', openMeasureModal);

    if (measureModal) {
        measureModal.addEventListener('click', e => {
            if (e.target.closest('[data-close-measure]')) closeMeasureModal();
        });
    }

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (measureModal && measureModal.classList.contains('open')) closeMeasureModal();
    });

    if (measureForm) {
        measureForm.addEventListener('submit', e => {
            e.preventDefault();
            const h = $('#mfHeight')?.value;
            const w = $('#mfWeight')?.value;
            const f = $('#mfFat')?.value;

            if (h) {
                if ($('#msHeight')) $('#msHeight').textContent = h;
                if ($('#heroHeight')) $('#heroHeight').textContent = h;
            }
            if (w) {
                if ($('#msWeight')) $('#msWeight').textContent = w;
                if ($('#heroWeight')) $('#heroWeight').textContent = w;
            }
            if (f && $('#msFat')) {
                $('#msFat').textContent = f;
            }

            closeMeasureModal();
            showToast('Measurements saved ✱ coach recalibrated.');
        });
    }
}

/* ============================================================
   6. USER WORKOUTS FETCHING & STATS COMPUTATION
============================================================ */
async function fetchUserWorkouts(currentUser) {
    const currentUserId = String(currentUser?.id || currentUser?._id || '');
    try {
        const workouts = await getWorkouts({}, { date: -1 });
        if (Array.isArray(workouts)) {
            return workouts.filter(w => String(w.user?._id ?? w.user ?? w.user_id) === currentUserId);
        }
        return [];
    } catch (err) {
        console.error("fetchUserWorkouts failed:", err);
        return [];
    }
}

function renderMonthGrid(myWorkouts) {
    const grid = $('#monthGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const byDay = groupWorkoutsByDay(myWorkouts);

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

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));
    const gridEnd = new Date(lastDay);
    gridEnd.setDate(lastDay.getDate() + (6 - ((lastDay.getDay() + 6) % 7)));

    const head = grid.closest('.panel-flat')?.querySelector('.r-h');
    if (head) head.textContent = 'consistency · ' + firstDay.toLocaleDateString('en-US', { month: 'long' });

    for (let rowStart = new Date(gridStart); rowStart <= gridEnd; rowStart.setDate(rowStart.getDate() + 7)) {
        const label = document.createElement('span');
        label.className = 'm-lbl';
        label.textContent = rowStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        grid.appendChild(label);

        for (let d = 0; d < 7; d++) {
            const date = new Date(rowStart);
            date.setDate(rowStart.getDate() + d);

            const cell = document.createElement('div');
            const dstr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const inMonth = date >= firstDay && date <= lastDay;

            if (!inMonth) {
                cell.className = 'm-cell future';
                cell.dataset.tip = dstr + (date < firstDay ? ' · last month' : ' · next month');
            } else if (date > today) {
                cell.className = 'm-cell future';
                cell.dataset.tip = dstr + ' · coming up';
            } else {
                const entry = byDay[dayKey(date)];
                const level = intensityFor(entry);
                const isToday = date.getTime() === today.getTime();
                cell.className = 'm-cell l' + level + (isToday ? ' today' : '');
                cell.dataset.tip = tooltipFor(entry, dstr);
            }
            grid.appendChild(cell);
        }
    }
}

function renderStats(myWorkouts) {
    const byDay = groupWorkoutsByDay(myWorkouts);
    const keys = Object.keys(byDay).sort();

    let longest = 0, run = 0, prev = null;
    keys.forEach(k => {
        const d = new Date(k + 'T00:00:00');
        run = (prev && (d - prev) === 86400000) ? run + 1 : 1;
        if (run > longest) longest = run;
        prev = d;
    });

    const weeks = {};
    myWorkouts.forEach(w => {
        const rawDate = w.date || w.createdAt || w.start_time;
        if (!rawDate) return;
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return;
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const wk = dayKey(monday);
        weeks[wk] = (weeks[wk] || 0) + 1;
    });
    const bestWeek = Math.max(0, ...Object.values(weeks));
    const totalVol = myWorkouts.reduce((a, w) => a + volumeOfWorkout(w), 0);

    const hvs = document.querySelectorAll('.hs-row .hv');
    if (hvs[0]) hvs[0].textContent = longest;
    if (hvs[1]) hvs[1].textContent = bestWeek;
    if (hvs[2]) hvs[2].textContent = fmtInt(totalVol);
    if (hvs[3]) hvs[3].textContent = keys.length;

    const heroWorkoutCount = $('#heroWorkoutCount');
    if (heroWorkoutCount) heroWorkoutCount.textContent = myWorkouts.length;
    const totalWorkoutsStat = $('#heroTotalWorkoutsStat');
    if (totalWorkoutsStat) totalWorkoutsStat.textContent = myWorkouts.length;

    const bestWeekEl = $('.hero-hv.hv-bestweek');
    if (bestWeekEl) bestWeekEl.textContent = bestWeek;
    const volEl = $('.hero-hv.hv-volume');
    if (volEl) volEl.textContent = fmtInt(totalVol);
    const sessEl = $('.hero-hv.hv-sessions');
    if (sessEl) sessEl.textContent = keys.length;
}

function renderWeekBars(myWorkouts) {
    const row = document.querySelector('.tbar-row');
    if (!row) return;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const vols = [0, 0, 0, 0];

    myWorkouts.forEach(w => {
        const rawDate = w.date || w.createdAt || w.start_time;
        if (!rawDate) return;
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return;
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        const diff = Math.round((thisMonday - monday) / (7 * 86400000));
        if (diff >= 0 && diff < 4) vols[3 - diff] += volumeOfWorkout(w);
    });

    const max = Math.max(...vols, 1);
    row.innerHTML = vols.map((v, i) =>
        `<i class="tbar" style="height:${Math.max(8, Math.round(v / max * 100))}%; --td:${i * .12}s"></i>`
    ).join('');
}

/* ============================================================
   7. POST CARDS & FEED RENDERING
============================================================ */
function renderWorkoutInPostCard(element) {
    const exercises = element.exercises || [];
    if (Array.isArray(exercises)) {
        return exercises.map(ex => {
            const name = ex.exercise?.name || ex.name || 'Exercise';
            const sets = Array.isArray(ex.sets) ? ex.sets : Object.values(ex.sets || {});
            const count = sets.length;
            const last = sets[count - 1] || {};
            return `<div class="p-row" style="--c:${dotColorFor(name)}"> <span class="nm">${escHtml(name)}</span> <span class="mt">${count} set${count !== 1 ? 's' : ''} · ${summarizeSet(last)}</span> </div>`;
        }).join('');
    }

    return Object.entries(exercises).map(([name, ex]) => {
        const sets = Array.isArray(ex.sets) ? ex.sets : Object.values(ex.sets || {});
        const count = sets.length;
        const last = sets[count - 1] || {};
        return `<div class="p-row" style="--c:${dotColorFor(name)}"> <span class="nm">${escHtml(name)}</span> <span class="mt">${count} set${count !== 1 ? 's' : ''} · ${summarizeSet(last)}</span> </div>`;
    }).join('');
}

function buildPostCard(element, currentUser) {
    const initials = initialsOf(currentUser.name);
    const photo = (element.photos && element.photos.length >= 1) ? element.photos[0] : '../assets/default_workout_image.png';
    const spots = Array.isArray(element.spots) ? element.spots : [];
    const comments = Array.isArray(element.comments) ? element.comments : [];
    const currentUserId = String(currentUser.id || currentUser._id || '');
    const spotted = spots.some(s => String(s?._id ?? s) === currentUserId);
    const lastC = comments[comments.length - 1];
    const workoutId = element._id || element.id;

    return `
    <div class="post-shell" data-id="${workoutId}">
        <article class="post" tabindex="0" role="button" aria-label="Open ${escHtml(currentUser.name)}'s workout">
            <div class="p-head">
                <span class="av" style="background:#FF4A11">${escHtml(initials)}</span>
                <div class="p-who">
                    <div class="p-name">${escHtml(currentUser.name)}</div>
                    <div class="p-meta"><span>@${escHtml(currentUser.username || 'athlete')}</span><span>·</span><span>${get_proper_time_from_start(element.start_time || element.date)} ago</span></div>
                </div>
            </div>
            <h3 class="p-title">${escHtml(element.title || 'Session')}</h3>
            <div class="p-img">
                <img src="${photo}" alt="workout photo" loading="lazy">
                <span class="img-tag"><b>✱</b> strength</span>
            </div>
            <div class="p-rows">${renderWorkoutInPostCard(element)}</div>
            <div class="p-foot"><span>volume <b>${fmtInt(volumeOfWorkout(element))} kg</b></span><span>time <b>${format_total_time(element.total_time)}</b></span></div>
            <div class="p-acts">
                <button class="act ${spotted ? 'on' : ''}" data-action="spot"><span class="st">✱</span>Spot · <span class="spot-n">${spots.length}</span></button>
                <button class="act" data-action="comment">Comment · <span>${comments.length}</span></button>
                <button class="act share" data-action="share">Share</button>
            </div>
            ${lastC ? `<div class="p-comment"><b>${escHtml(lastC.n || lastC.user?.name || 'User')} · ${get_proper_time_from_start(lastC.t || lastC.createdAt)} ago</b>“${escHtml(lastC.x || lastC.comment || '')}”</div>` : ''}
            <div class="p-cbox" hidden>
                <input type="text" placeholder="Say something nice…">
                <button class="btn-primary" data-action="post-comment">Post</button>
            </div>
        </article>
    </div>`;
}

function renderMyPosts(myWorkouts, currentUser) {
    const feed = $('#myFeed');
    if (!feed) return;
    feed.innerHTML = '';

    const sorted = [...myWorkouts].sort((a, b) => {
        const dateA = a.date || a.createdAt || a.start_time || '';
        const dateB = b.date || b.createdAt || b.start_time || '';
        return String(dateB).localeCompare(String(dateA)) || (b.start_time || 0) - (a.start_time || 0);
    });

    if (!sorted.length) {
        feed.innerHTML = '<div class="day-sep">nothing logged yet</div>';
        return;
    }

    let lastLabel = null;
    sorted.forEach(element => {
        const rawDate = element.date || element.createdAt || element.start_time;
        const label = dayLabel(rawDate);
        if (label !== lastLabel) {
            feed.innerHTML += `<div class="day-sep">${label}</div>`;
            lastLabel = label;
        }
        feed.innerHTML += buildPostCard(element, currentUser);
    });
}

/* ============================================================
   8. FEED INTERACTIONS & POST NAVIGATION
============================================================ */
function setupPostInteractions(currentUser) {
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

    document.addEventListener('click', e => {
        const spot = e.target.closest('[data-action="spot"]');
        if (spot) {
            const on = spot.classList.toggle('on');
            const n = spot.querySelector('.spot-n');
            if (n) n.textContent = (+n.textContent) + (on ? 1 : -1);
            if (on) showToast('Spotted ✱ they felt that.');
            return;
        }

        const cmt = e.target.closest('[data-action="comment"]');
        if (cmt) {
            const box = cmt.closest('.post')?.querySelector('.p-cbox');
            if (box) {
                box.hidden = !box.hidden;
                if (!box.hidden) box.querySelector('input')?.focus();
            }
            return;
        }

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

        const postBtn = e.target.closest('[data-action="post-comment"]');
        if (postBtn) {
            const box = postBtn.closest('.p-cbox');
            const input = box?.querySelector('input');
            const val = input?.value.trim();
            if (!val) { showToast('Say something first ✱', 'error'); return; }
            const post = box.closest('.post');
            const c = document.createElement('div');
            c.className = 'p-comment';
            c.innerHTML = `<b>${escHtml(currentUser.name)} · just now</b>${escHtml(val)}`;
            post.insertBefore(c, post.querySelector('.p-acts'));
            input.value = '';
            box.hidden = true;
            showToast('Comment posted ✱');
            return;
        }

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
   9. INITIALIZATION (ORCHESTRATOR)
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
    setupContentTabs();
    setupSettingsAndPreferences();
    setupEditProfileModal(currentUser);
    setupMeasurementModal(currentUser);
    setupProgramCreation();
    setupPostInteractions(currentUser);

    const myWorkouts = await fetchUserWorkouts(currentUser);
    renderMonthGrid(myWorkouts);
    renderStats(myWorkouts);
    renderWeekBars(myWorkouts);
    renderMyPosts(myWorkouts, currentUser);
    renderUserSplits();
}

init();
