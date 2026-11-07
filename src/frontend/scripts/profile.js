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
   2. USER PROFILE DISPLAY
============================================================ */
function applyUser(currentUser) {
    if (!currentUser) return;
    const name = String(currentUser.name || '').trim();
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
        const parts = String(currentUser.name || '').trim().split(/\s+/);
        if ($('#efFirst')) $('#efFirst').value = parts[0] || '';
        if ($('#efLast')) $('#efLast').value = parts.slice(1).join(' ');
        if ($('#efUser')) $('#efUser').value = String(currentUser.username || '').replace(/^@/, '');
        if ($('#efEmail')) $('#efEmail').value = currentUser.email || '';
        if ($('#efHeight')) $('#efHeight').value = $('#msHeight')?.textContent || '';
        if ($('#efWeight')) $('#efWeight').value = $('#msWeight')?.textContent || '';
        if ($('#efFat')) $('#efFat').value = $('#msFat')?.textContent || '';

        editModal.classList.add('open');
        editModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        setTimeout(() => $('#efFirst')?.focus({ preventScroll: true }), 320);
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

    const editMeasureBtn = $('#editMeasureBtn');
    if (editMeasureBtn) editMeasureBtn.addEventListener('click', openModal);

    const avBtn = $('#avBtn');
    if (avBtn) avBtn.addEventListener('click', openModal);

    const editForm = $('#editForm');
    if (editForm) {
        editForm.addEventListener('submit', e => {
            e.preventDefault();
            const first = $('#efFirst')?.value.trim();
            const last = $('#efLast')?.value.trim() || '';
            if (!first) {
                showToast('Add at least a first name ✱', 'error');
                return;
            }
            currentUser.name = (first + ' ' + last).trim();
            const un = $('#efUser')?.value.trim();
            if (un) currentUser.username = un;
            currentUser.email = $('#efEmail')?.value.trim();

            try {
                localStorage.setItem('current_user', JSON.stringify(currentUser));
            } catch (_) {}

            applyUser(currentUser);

            if ($('#efHeight')?.value && $('#msHeight')) $('#msHeight').textContent = $('#efHeight').value;
            if ($('#efWeight')?.value && $('#msWeight')) $('#msWeight').textContent = $('#efWeight').value;
            if ($('#efFat')?.value && $('#msFat')) $('#msFat').textContent = $('#efFat').value;

            closeModal();
            showToast('Profile updated ✱ the coach recalibrated.');
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
    setupSettingsAndPreferences();
    setupEditProfileModal(currentUser);
    setupPostInteractions(currentUser);

    const myWorkouts = await fetchUserWorkouts(currentUser);
    renderMonthGrid(myWorkouts);
    renderStats(myWorkouts);
    renderWeekBars(myWorkouts);
    renderMyPosts(myWorkouts, currentUser);
}

init();
