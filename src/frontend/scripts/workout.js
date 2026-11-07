import { logout, getCurrentUser } from "./utils/userUtils.js";
import { authenticate } from "./utils/authUtils.js";
import { showToast, handleUrlFlashMessages } from "./utils/frontend_utils.js";

/* ============================================================
   CONFIG & METADATA
============================================================ */
const API_BASE = "http://localhost:5000/api";

const FIELD_META = {
    kg: { head: 'kg', ph: 'kg', mode: 'decimal', cls: 's-kg' },
    reps: { head: 'reps', ph: 'reps', mode: 'numeric', cls: 's-reps' },
    time: { head: 'time', ph: 'm:ss', mode: '', cls: 's-time' },
    distance: { head: 'dist', ph: 'm', mode: 'decimal', cls: 's-dist' },
};

const TYPE_FIELDS = {
    'weight_and_reps': ['kg', 'reps'],
    'bodyweight_reps': ['reps'],
    'weighted_bodyweight': ['kg', 'reps'],
    'assisted_bodyweight': ['kg', 'reps'],
    'duration': ['time'],
    'duration_and_weight': ['kg', 'time'],
    'distance_and_duration': ['distance', 'time'],
    'weight_and_distance': ['kg', 'distance'],
};

const FIELD_COLS = {
    kg: 'var(--w-kg)',
    reps: 'var(--w-reps)',
    time: 'var(--w-time)',
    distance: 'var(--w-dist)'
};

const fieldsFor = type => TYPE_FIELDS[type] || TYPE_FIELDS['weight_and_reps'];
const colsFor = type => '28px minmax(0, 1fr) ' + fieldsFor(type).map(f => FIELD_COLS[f]).join(' ') + ' 38px 28px';

function fieldHead(f, type) {
    if (f === 'kg' && type === 'weighted_bodyweight') return '+kg';
    if (f === 'kg' && type === 'assisted_bodyweight') return 'assist';
    return FIELD_META[f].head;
}

/* ============================================================
   DOM HELPERS & TIME UTILITIES
============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const exList = $('#exList');

const fmtClock = ms => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0');
};

const localDateKey = (d = new Date()) => {
    const date = (d instanceof Date && !isNaN(d)) ? d : new Date(d);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
};

function setupDateHeader() {
    const barDate = $('#barDate');
    if (barDate) {
        barDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
}

/* ============================================================
   WORKOUT STATE & PERSISTENCE
============================================================ */
let workout = null;
let startedAt = Date.now();

function saveSessionState() {
    if (!workout) return;
    const elapsed = Math.max(0, Date.now() - startedAt);
    workout.pause_time = Date.now();
    workout.elapsed_time = elapsed;
    workout.time = fmtClock(elapsed);
    workout.start_time = startedAt;
    workout.startedAt = startedAt;
    localStorage.setItem("current_user_workout", JSON.stringify(workout));
}

function restoreSession() {
    if (!workout) return;

    // 1. Calculate already elapsed (banked) workout time
    let bankedTime = 0;
    if (typeof workout.elapsed_time === 'number') {
        bankedTime = workout.elapsed_time;
    } else if (workout.pause_time && workout.start_time) {
        bankedTime = Math.max(0, workout.pause_time - workout.start_time);
    }

    // 2. Adjust startedAt and workout.start_time so the clock seamlessly resumes
    startedAt = Date.now() - bankedTime;
    workout.start_time = startedAt;
    workout.startedAt = startedAt;
    workout.elapsed_time = bankedTime;
    workout.time = fmtClock(bankedTime);
    delete workout.pause_time;
    localStorage.setItem("current_user_workout", JSON.stringify(workout));

    const ssTime = $('#ssTime');
    if (ssTime) ssTime.textContent = fmtClock(bankedTime);

    // 3. Restore exercises and completed sets
    if (workout.exercises && Object.keys(workout.exercises).length > 0) {
        if (exList) exList.innerHTML = '';
        Object.entries(workout.exercises).forEach(([ex_name, ex_data]) => {
            const type = ex_data.type || 'weight_and_reps';
            const tpl = $('#exTpl').content.cloneNode(true).querySelector('.ex-card');
            tpl.dataset.type = type;
            tpl.querySelector('[data-bind="name"]').textContent = ex_name;
            tpl.querySelector('[data-bind="eq"]').textContent = type;
            tpl.querySelector('[data-bind="last"]').textContent = 'resuming your session ✱';

            buildSets(tpl);

            const sets = tpl.querySelector('.sets');
            const emptyRow = sets.querySelector('.set-row');
            if (emptyRow) emptyRow.remove();

            if (ex_data.sets) {
                Object.entries(ex_data.sets).forEach(([, set_vals]) => {
                    const row = makeSetRow(tpl, null);
                    Object.entries(set_vals).forEach(([field, value]) => {
                        const input = row.querySelector(`[data-field="${field}"]`);
                        if (input) input.value = value;
                    });
                    row.classList.add('done');
                    const doneBtn = row.querySelector('[data-done]');
                    if (doneBtn) doneBtn.classList.add('on');
                    sets.appendChild(row);
                });
            }

            if (ex_data.notes) {
                const noteBox = tpl.querySelector('.note-box');
                const textarea = noteBox.querySelector('textarea');
                textarea.value = ex_data.notes;
                noteBox.classList.add('open');
                tpl.querySelector('[data-note]').classList.add('has');
            }

            if (exList) exList.appendChild(tpl);
        });

        updateStats();
    }
}

function updateStats() {
    if (!exList) return;
    const countEl = $('#ssCount');
    if (countEl) countEl.textContent = exList.querySelectorAll('.ex-card').length;

    let vol = 0;
    exList.querySelectorAll('.set-row.done').forEach(r => {
        const kg = parseFloat(r.querySelector('[data-field="kg"]')?.value) || 0;
        const reps = parseFloat(r.querySelector('[data-field="reps"]')?.value) || 0;
        vol += kg * reps;
    });

    const volEl = $('#ssVol');
    if (volEl) volEl.textContent = Math.round(vol).toLocaleString('en-US');
}

function setupWorkoutSession() {
    try {
        workout = JSON.parse(localStorage.getItem("current_user_workout"));
    } catch (_) {
        workout = null;
    }

    if (workout && (workout.start_time || workout.startedAt || (workout.exercises && Object.keys(workout.exercises).length > 0))) {
        restoreSession();
    } else {
        workout = {
            start_time: Date.now(),
            startedAt: Date.now(),
            exercises: {}
        };
        startedAt = workout.start_time;
        const ssTime = $('#ssTime');
        if (ssTime) ssTime.textContent = '0:00';
        localStorage.setItem("current_user_workout", JSON.stringify(workout));
    }

    setInterval(() => {
        const ssTime = $('#ssTime');
        if (ssTime) ssTime.textContent = fmtClock(Date.now() - startedAt);
    }, 1000);

    window.addEventListener("pagehide", saveSessionState);
    window.addEventListener("beforeunload", saveSessionState);

    $$('.set-row').forEach(row => {
        const kg = row.querySelector('.s-kg'); if (kg && !kg.dataset.field) kg.dataset.field = 'kg';
        const reps = row.querySelector('.s-reps'); if (reps && !reps.dataset.field) reps.dataset.field = 'reps';
        ensureDel(row);
    });

    updateStats();
}

/* ============================================================
   SET ROW & EXERCISE CARD BUILDERS
============================================================ */
function makeSetRow(card, copyFrom) {
    const type = card.dataset.type || 'weight_and_reps';
    const fields = fieldsFor(type);
    const row = document.createElement('div');
    row.className = 'set-row';
    const count = card.querySelectorAll('.set-row').length;
    let html = '<span class="s-no">' + (count + 1) + '</span><span class="s-last">—</span>';
    fields.forEach(f => {
        const m = FIELD_META[f];
        const val = copyFrom ? (copyFrom.querySelector('[data-field="' + f + '"]')?.value || '') : '';
        const inputmode = m.mode ? ' inputmode="' + m.mode + '"' : '';
        const vtype = f === 'time' ? 'text' : 'number';
        html += '<input class="' + m.cls + '" data-field="' + f + '" type="' + vtype + '"' + inputmode + ' placeholder="' + m.ph + '" value="' + val + '">';
    });
    html += '<button class="done-btn" data-done aria-label="Complete set">✓</button>';
    row.innerHTML = html;
    ensureDel(row);
    return row;
}

function buildSets(card) {
    const type = card.dataset.type || 'weight_and_reps';
    const sets = card.querySelector('.sets');
    if (!sets) return;
    sets.style.setProperty('--cols', colsFor(type));
    sets.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'sets-head';
    let hh = '<span>set</span><span>last</span>';
    fieldsFor(type).forEach(f => { hh += '<span>' + fieldHead(f, type) + '</span>'; });
    hh += '<span class="sh-done">✓</span>';
    head.innerHTML = hh;
    sets.appendChild(head);
    sets.appendChild(makeSetRow(card, null));
}

function ensureDel(row) {
    if (!row || row.querySelector('[data-delset]')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'del-set';
    b.setAttribute('data-delset', '');
    b.setAttribute('aria-label', 'Remove set');
    b.textContent = '✕';
    row.appendChild(b);
}

function addExerciseCard(name, type, color) {
    const tpl = $('#exTpl').content.cloneNode(true).querySelector('.ex-card');
    if (color) tpl.style.setProperty('--c', color);
    tpl.dataset.type = type;
    tpl.querySelector('[data-bind="name"]').textContent = name;
    tpl.querySelector('[data-bind="eq"]').textContent = type;
    tpl.querySelector('[data-bind="last"]').textContent = 'first time logging this one ✱';
    buildSets(tpl);
    if (exList) exList.appendChild(tpl);
    updateStats();
    tpl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const first = tpl.querySelector('.set-row input');
    if (first) first.focus();
}

/* ============================================================
   EXERCISE CARD INTERACTIONS (DONE, ADD SET, NOTES, DELETE)
============================================================ */
function setupExerciseCardInteractions() {
    if (exList) {
        new MutationObserver(muts => {
            muts.forEach(m => m.addedNodes.forEach(n => {
                if (n.nodeType !== 1) return;
                if (n.matches && n.matches('.set-row')) ensureDel(n);
                if (n.querySelectorAll) n.querySelectorAll('.set-row').forEach(ensureDel);
            }));
        }).observe(exList, { childList: true, subtree: true });
    }

    document.addEventListener('click', e => {
        /* 1. Toggle Complete Set */
        const done = e.target.closest('[data-done]');
        if (done) {
            const row = done.closest('.set-row');
            if (!row) return;
            const on = done.classList.toggle('on');
            row.classList.toggle('done', on);
            updateStats();

            const card = row.closest('.ex-card');
            const exName = card?.querySelector('.ex-name')?.textContent;
            const setNumber = row.querySelector('.s-no')?.textContent;
            if (!exName || !setNumber) return;

            const vals = {};
            row.querySelectorAll('input[data-field]').forEach(inp => {
                vals[inp.dataset.field] = inp.value;
            });

            if (!workout.exercises) workout.exercises = {};
            if (!workout.exercises[exName]) workout.exercises[exName] = {};
            if (!workout.exercises[exName].sets) workout.exercises[exName].sets = {};

            if (on) {
                const nextNo = card.querySelectorAll('.set-row.done').length + 1;
                if (!workout.exercises[exName].type) {
                    workout.exercises[exName].type = card.dataset.type || 'weight_and_reps';
                }
                openDock('next · ' + exName + ' · set ' + nextNo);
                workout.exercises[exName].sets[setNumber] = vals;
            } else {
                delete workout.exercises[exName].sets[setNumber];
            }
            saveSessionState();
            return;
        }

        /* 2. Add New Set Row */
        const addset = e.target.closest('[data-addset]');
        if (addset) {
            const card = addset.closest('.ex-card');
            const sets = card?.querySelector('.sets');
            if (card && sets) {
                const rows = sets.querySelectorAll('.set-row');
                const last = rows[rows.length - 1];
                sets.appendChild(makeSetRow(card, last));
            }
            return;
        }

        /* 3. Toggle Note Box */
        const note = e.target.closest('[data-note]');
        if (note) {
            const box = note.closest('.ex-card')?.querySelector('.note-box');
            if (box) {
                box.classList.toggle('open');
                if (box.classList.contains('open')) box.querySelector('textarea')?.focus();
            }
            return;
        }

        /* 4. Delete Entire Exercise Card */
        const del = e.target.closest('[data-del]');
        if (del) {
            const card = del.closest('.ex-card');
            if (!card) return;
            card.classList.add('out');
            const exName = card.querySelector('.ex-name')?.textContent;
            setTimeout(() => {
                card.remove();
                updateStats();
            }, 280);
            if (exName && workout.exercises) {
                delete workout.exercises[exName];
            }
            saveSessionState();
            return;
        }

        /* 5. Delete Individual Set Row */
        const delset = e.target.closest('[data-delset]');
        if (delset) {
            const row = delset.closest('.set-row');
            const card = row?.closest('.ex-card');
            if (!row || !card) return;

            const sNumber = row.querySelector('.s-no')?.textContent;
            const exName = card.querySelector('.ex-name')?.textContent;

            if (card.querySelectorAll('.set-row').length <= 1) {
                row.classList.remove('nope');
                void row.offsetWidth;
                row.classList.add('nope');
                return;
            }

            row.style.height = row.offsetHeight + 'px';
            row.style.overflow = 'hidden';
            requestAnimationFrame(() => {
                row.style.transition = 'height .3s var(--ease), opacity .25s ease, padding .3s var(--ease)';
                row.style.height = '0px';
                row.style.opacity = '0';
                row.style.paddingTop = '0';
                row.style.paddingBottom = '0';
            });

            setTimeout(() => {
                row.remove();
                card.querySelectorAll('.set-row').forEach((r, i) => {
                    const noEl = r.querySelector('.s-no');
                    if (noEl) noEl.textContent = i + 1;
                });
                updateStats();
            }, 320);

            if (exName && sNumber && workout.exercises?.[exName]?.sets) {
                delete workout.exercises[exName].sets[sNumber];
            }
            saveSessionState();
            return;
        }
    });

    document.addEventListener('input', e => {
        if (!e.target.matches('.note-box textarea')) return;
        const card = e.target.closest('.ex-card');
        const btn = card?.querySelector('[data-note]');
        if (btn) btn.classList.toggle('has', e.target.value.trim() !== '');

        const exName = card?.querySelector('.ex-name')?.textContent;
        if (!exName) return;

        if (!workout.exercises) workout.exercises = {};
        if (!workout.exercises[exName]) workout.exercises[exName] = {};
        workout.exercises[exName].notes = e.target.value;
        saveSessionState();
    });
}

/* ============================================================
   REST TIMER DOCK
============================================================ */
const restDock = $('#restDock'), rdPick = $('#rdPick'), rdLive = $('#rdLive'), rdDone = $('#rdDone');
let restSec = 90, restTotal = 90, restEnd = 0, restTick = null, hideTimer = null;
const fmtRest = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

function stopTick() {
    clearInterval(restTick);
    restTick = null;
}

function openDock(sub) {
    if (!restDock) return;
    clearTimeout(hideTimer);
    stopTick();
    if (rdPick) rdPick.hidden = false;
    if (rdLive) rdLive.hidden = true;
    if (rdDone) rdDone.hidden = true;
    if (sub && $('#rdSub')) $('#rdSub').textContent = sub;
    restDock.hidden = false;
    requestAnimationFrame(() => restDock.classList.add('open'));
}

function closeDock() {
    if (!restDock) return;
    stopTick();
    restDock.classList.remove('open');
    setTimeout(() => { restDock.hidden = true; }, 450);
}

function finishRest() {
    stopTick();
    if (rdLive) rdLive.hidden = true;
    if (rdDone) rdDone.hidden = false;
    if (navigator.vibrate) navigator.vibrate([160, 70, 160]);
    hideTimer = setTimeout(closeDock, 3200);
}

function tickRest() {
    const left = Math.max(0, restEnd - Date.now());
    const rdTime = $('#rdTime');
    if (rdTime) rdTime.textContent = fmtRest(Math.ceil(left / 1000));
    const rdBar = $('#rdBar');
    if (rdBar) rdBar.style.width = (left / (restTotal * 1000) * 100) + '%';
    if (left <= 0) finishRest();
}

function startRest(sec, sub) {
    restTotal = restSec = sec;
    restEnd = Date.now() + sec * 1000;
    if (sub && $('#rdSub')) $('#rdSub').textContent = sub;
    if (rdPick) rdPick.hidden = true;
    if (rdLive) rdLive.hidden = false;
    if (rdDone) rdDone.hidden = true;
    stopTick();
    restTick = setInterval(tickRest, 200);
    tickRest();
}

function setupRestDock() {
    $$('.rd-chip').forEach(c => c.addEventListener('click', () => {
        $$('.rd-chip').forEach(x => x.classList.remove('on'));
        c.classList.add('on');
        startRest(+c.dataset.rest);
    }));

    const rdStart = $('#rdStart');
    if (rdStart) rdStart.addEventListener('click', () => startRest(restSec));

    const rdAdd = $('#rdAdd');
    if (rdAdd) rdAdd.addEventListener('click', () => { restEnd += 15000; restTotal += 15; tickRest(); });

    const rdSkip = $('#rdSkip');
    if (rdSkip) rdSkip.addEventListener('click', finishRest);

    const rdClose = $('#rdClose');
    if (rdClose) rdClose.addEventListener('click', closeDock);

    const restBtn = $('#restBtn');
    if (restBtn) restBtn.addEventListener('click', () => openDock());
}

/* ============================================================
   EXERCISE SEARCH & SUGGESTION MODAL
============================================================ */
let SUGG = [];
let isFetchingExercises = false;

try {
    const cached = JSON.parse(sessionStorage.getItem('cached_exercises') || 'null');
    if (Array.isArray(cached) && cached.length > 0) {
        SUGG = cached;
    }
} catch (_) {}

async function fetchExercises() {
    if (isFetchingExercises) return;
    isFetchingExercises = true;
    try {
        const response = await fetch(`${API_BASE}/exercises`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const exercises = await response.json();
        SUGG = exercises.map(ex => [
            ex.name,
            ex.exercise_type,
            "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
            ex.exercise_type
        ]);
        try {
            sessionStorage.setItem('cached_exercises', JSON.stringify(SUGG));
        } catch (_) {}
    } catch (err) {
        console.error("fetchExercises failed:", err);
        if (SUGG.length === 0) {
            showToast("Could not load exercise list. Check backend connection.", "error");
        }
    } finally {
        isFetchingExercises = false;
        const addEx = $('#addEx');
        if (addEx && addEx.classList.contains('open')) {
            renderSugg($('#exSearch')?.value || '');
        }
    }
}

function renderSugg(q = '') {
    const suggList = $('#suggList');
    if (!suggList) return;

    if (isFetchingExercises && SUGG.length === 0) {
        suggList.innerHTML = '<div class="sugg-empty">Loading exercises ✱</div>';
        return;
    }

    const query = (q || '').trim().toLowerCase();
    const list = query
        ? SUGG.filter(x => x[0].toLowerCase().includes(query))
        : SUGG;

    suggList.innerHTML = list.length
        ? list.map(x => '<button class="sugg-item" style="--c:' + x[2] + '" data-name="' + x[0] + '" data-type="' + x[1] + '"><span class="sd"></span><span class="sn">' + x[0] + '</span><span class="st">' + x[1] + '</span></button>').join('')
        : '<div class="sugg-empty">Nothing found — build it as a custom exercise ✱</div>';
}

function openAddEx() {
    const addEx = $('#addEx'), exSearch = $('#exSearch');
    if (!addEx) return;
    addEx.classList.add('open');
    const box = $('#addExBox');
    if (box) box.hidden = false;
    renderSugg(exSearch?.value || '');
    if (SUGG.length === 0) {
        fetchExercises();
    }
    setTimeout(() => exSearch?.focus(), 50);
}

function closeAddEx() {
    const addEx = $('#addEx'), exSearch = $('#exSearch');
    if (!addEx) return;
    addEx.classList.remove('open');
    const box = $('#addExBox');
    if (box) box.hidden = true;
    if (exSearch) exSearch.value = '';
}

function setupExerciseSearchModal() {
    const addExBtn = $('#addExBtn');
    if (addExBtn) addExBtn.addEventListener('click', openAddEx);

    const addExClose = $('#addExClose');
    if (addExClose) addExClose.addEventListener('click', closeAddEx);

    document.addEventListener('keydown', e => {
        const addEx = $('#addEx');
        if (e.key === 'Escape' && addEx && addEx.classList.contains('open')) closeAddEx();
    });

    const exSearch = $('#exSearch');
    if (exSearch) {
        exSearch.addEventListener('input', () => renderSugg(exSearch.value));
    }

    const suggList = $('#suggList');
    if (suggList) {
        suggList.addEventListener('click', e => {
            const item = e.target.closest('.sugg-item');
            if (!item) return;
            const name = item.dataset.name;
            const type = item.dataset.type || 'weight_and_reps';
            const color = item.style.getPropertyValue('--c');
            addExerciseCard(name, type, color);
            closeAddEx();
        });
    }
}

/* ============================================================
   FINISH WORKOUT MODAL & SUBMISSION
============================================================ */
const finishModal = $('#finishModal');
let photoData = [];
const photoUrls = new Map();
let isSubmittingWorkout = false;

function fillFinishStats() {
    if (!exList) return;
    const doneRows = exList.querySelectorAll('.set-row.done');
    let vol = 0;
    doneRows.forEach(r => {
        vol += (parseFloat(r.querySelector('[data-field="kg"]')?.value) || 0) *
            (parseFloat(r.querySelector('[data-field="reps"]')?.value) || 0);
    });
    const fmStats = $('#fmStats');
    if (fmStats) {
        fmStats.innerHTML =
            '<span>time <b>' + fmtClock(Date.now() - startedAt) + '</b></span>' +
            '<span>sets <b>' + doneRows.length + '</b></span>' +
            '<span>volume <b>' + Math.round(vol).toLocaleString('en-US') + ' kg</b></span>';
    }
}

function closeFinish() {
    if (isSubmittingWorkout || !finishModal) return;
    finishModal.classList.remove('open');
    finishModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function renderShots() {
    const wrap = $('#fmShots');
    if (!wrap) return;
    wrap.querySelectorAll('.fm-shot').forEach(el => el.remove());
    const add = wrap.querySelector('.fm-add');
    photoData.forEach((file, i) => {
        if (!photoUrls.has(file)) {
            photoUrls.set(file, URL.createObjectURL(file));
        }
        const src = photoUrls.get(file);
        const fig = document.createElement('figure');
        fig.className = 'fm-shot';
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'workout photo';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.rm = i;
        btn.setAttribute('aria-label', 'Remove photo');
        btn.textContent = '✕';
        fig.append(img, btn);
        if (add) {
            wrap.insertBefore(fig, add);
        } else {
            wrap.appendChild(fig);
        }
    });
}

async function compressImage(file, maxWidth = 1200, quality = 0.75) {
    if (!file || !file.type || !file.type.startsWith('image/')) return file;
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob && blob.size < file.size) {
                        const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
                        resolve(new File([blob], newName, { type: 'image/jpeg' }));
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}

async function submitWorkout(withDetails, currentUser) {
    if (isSubmittingWorkout) return;
    const saveBtn = $('#fmSave');
    const skipBtn = $('#fmSkip');
    const originalSaveHtml = saveBtn ? saveBtn.innerHTML : 'Save workout <span class="arr">→</span>';
    const originalSkipHtml = skipBtn ? skipBtn.innerHTML : 'Skip — save as is';

    const token = sessionStorage.getItem('token');
    if (!token) {
        showToast("You are not logged in. Redirecting...", "error");
        setTimeout(() => {
            window.location.href = "index.html?message=not_logged_in&from=workout&status=error";
        }, 500);
        return;
    }

    isSubmittingWorkout = true;
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `Saving… <span class="live-dot"></span>`;
    }
    if (skipBtn) skipBtn.disabled = true;

    try {
        const formData = new FormData();
        const title = withDetails ? ($('#fmTitle')?.value.trim() || "Grinded") : "Grinded";
        const description = withDetails ? ($('#fmDesc')?.value.trim() || "") : "";
        const photosToSend = withDetails ? photoData : [];

        if (photosToSend.length > 0) {
            showToast("Compressing & uploading photos…");
        }

        const currentUserId = String(currentUser?.id || currentUser?._id || '');

        formData.append('title', title);
        formData.append('description', description);
        formData.append('date', localDateKey());
        formData.append('user_id', currentUserId);
        formData.append('start_time', startedAt);
        formData.append('total_time', fmtClock(Date.now() - startedAt));
        formData.append('total_volume', $('#ssVol')?.textContent || '0');
        formData.append('spots', JSON.stringify([]));
        formData.append('comments', JSON.stringify([]));
        formData.append('exercises', JSON.stringify(workout?.exercises || {}));

        for (const file of photosToSend) {
            if (file instanceof File || file instanceof Blob) {
                const compressed = await compressImage(file);
                formData.append('photos', compressed);
            }
        }

        const response = await fetch(`${API_BASE}/workouts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok || response.status === 201 || response.status === 200) {
            window.removeEventListener("pagehide", saveSessionState);
            window.removeEventListener("beforeunload", saveSessionState);
            localStorage.removeItem('current_user_workout');
            workout = null;
            if (saveBtn) saveBtn.innerHTML = `Saved! ✱`;
            try { closeFinish(); } catch (_) {}
            try { showToast("Workout Completed ✱ Redirecting..."); } catch (_) {}
            window.location.href = "home.html?message=workout_completed&from=workout";
            return;
        } else if (response.status === 413) {
            isSubmittingWorkout = false;
            if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalSaveHtml; }
            if (skipBtn) { skipBtn.disabled = false; skipBtn.innerHTML = originalSkipHtml; }
            showToast("Workout photos are too large (>10MB). Please remove some photos.", "error");
        } else {
            isSubmittingWorkout = false;
            if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalSaveHtml; }
            if (skipBtn) { skipBtn.disabled = false; skipBtn.innerHTML = originalSkipHtml; }
            let errorData;
            try { errorData = await response.json(); } catch (_) {}
            const msg = errorData?.message || errorData?.reason || "Could not save the workout. Try again.";
            showToast(msg, "error");
        }
    } catch (err) {
        console.error("submitWorkout failed:", err);
        isSubmittingWorkout = false;
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalSaveHtml; }
        if (skipBtn) { skipBtn.disabled = false; skipBtn.innerHTML = originalSkipHtml; }
        showToast("Network error: Could not reach backend server. Try again.", "error");
    }
}

function setupFinishModal(currentUser) {
    const finishBtn = $('#finishBtn');
    if (finishBtn) {
        finishBtn.addEventListener('click', () => {
            if (!workout?.exercises || !Object.keys(workout.exercises).length) {
                showToast("Workout Cannot be empty!", "error");
                return;
            }
            fillFinishStats();
            if (finishModal) {
                finishModal.classList.add('open');
                finishModal.setAttribute('aria-hidden', 'false');
                document.body.style.overflow = 'hidden';
                setTimeout(() => $('#fmTitle')?.focus({ preventScroll: true }), 350);
            }
        });
    }

    if (finishModal) {
        finishModal.addEventListener('click', e => {
            if (e.target.closest('[data-close]')) closeFinish();
        });
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && finishModal && finishModal.classList.contains('open')) closeFinish();
    });

    const fmPhotos = $('#fmPhotos');
    if (fmPhotos) {
        fmPhotos.addEventListener('change', () => {
            [...fmPhotos.files].forEach(file => {
                if (!file.type.startsWith('image/')) return;
                photoData.push(file);
                renderShots();
            });
            fmPhotos.value = '';
        });
    }

    const fmShots = $('#fmShots');
    if (fmShots) {
        fmShots.addEventListener('click', e => {
            const btn = e.target.closest('[data-rm]');
            if (!btn) return;
            const index = Number(btn.dataset.rm);
            const [removedFile] = photoData.splice(index, 1);
            if (removedFile && photoUrls.has(removedFile)) {
                URL.revokeObjectURL(photoUrls.get(removedFile));
                photoUrls.delete(removedFile);
            }
            renderShots();
        });
    }

    const fmSave = $('#fmSave');
    if (fmSave) {
        fmSave.addEventListener('click', e => {
            e.preventDefault();
            submitWorkout(true, currentUser);
        });
    }

    const fmSkip = $('#fmSkip');
    if (fmSkip) {
        fmSkip.addEventListener('click', e => {
            e.preventDefault();
            submitWorkout(false, currentUser);
        });
    }
}

/* ============================================================
   CREATE CUSTOM EXERCISE MODAL
============================================================ */
const createExModal = $('#createExModal');
const cxState = { equipment: 'None', muscle: null, type: 'weight_and_reps', other: [] };

function syncMeasure() {
    const cxMeasure = $('#cxMeasure');
    if (cxMeasure) {
        cxMeasure.innerHTML = fieldsFor(cxState.type).map(f => '<span>' + f + '</span>').join('');
    }
}

function renderCxTags() {
    const cxTags = $('#cxTags');
    if (cxTags) {
        cxTags.innerHTML = cxState.other.map((m, i) =>
            '<span class="cx-tag">' + m + '<button type="button" data-rm="' + i + '" aria-label="Remove">✕</button></span>').join('');
    }
}

function openCreateEx() {
    if (!createExModal) return;
    createExModal.classList.add('open');
    createExModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    syncMeasure();
    setTimeout(() => $('#cxName')?.focus({ preventScroll: true }), 350);
}

function closeCreateEx() {
    if (!createExModal) return;
    createExModal.classList.remove('open');
    createExModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function setupCreateExerciseModal() {
    if (createExModal) {
        createExModal.addEventListener('click', e => {
            if (e.target.closest('[data-close]')) closeCreateEx();
        });
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && createExModal && createExModal.classList.contains('open')) closeCreateEx();
    });

    const createExBtn = $('.create-ex');
    if (createExBtn) {
        createExBtn.addEventListener('click', e => {
            e.preventDefault();
            openCreateEx();
        });
    }

    $$('.cx-chips').forEach(group => {
        group.addEventListener('click', e => {
            const btn = e.target.closest('button');
            if (!btn) return;
            group.querySelectorAll('button').forEach(b => b.classList.remove('on'));
            btn.classList.add('on');
            const g = group.dataset.group;
            if (g === 'equipment') cxState.equipment = btn.dataset.val;
            if (g === 'muscle') cxState.muscle = btn.dataset.val;
            if (g === 'type') { cxState.type = btn.dataset.val; syncMeasure(); }
        });
    });

    const cxOther = $('#cxOther');
    if (cxOther) {
        cxOther.addEventListener('keydown', e => {
            if (e.key !== 'Enter' && e.key !== ',') return;
            e.preventDefault();
            const v = cxOther.value.trim().replace(/,+$/, '');
            if (v && !cxState.other.includes(v)) {
                cxState.other.push(v);
                renderCxTags();
            }
            cxOther.value = '';
        });
    }

    const cxTags = $('#cxTags');
    if (cxTags) {
        cxTags.addEventListener('click', e => {
            const btn = e.target.closest('[data-rm]');
            if (!btn) return;
            cxState.other.splice(+btn.dataset.rm, 1);
            renderCxTags();
        });
    }

    const cxSave = $('#cxSave');
    if (cxSave) {
        cxSave.addEventListener('click', async () => {
            const cxName = $('#cxName');
            const name = cxName?.value.trim();
            if (!name) {
                showToast('Give the exercise a name ✱', 'error');
                cxName?.focus();
                return;
            }
            if (!cxState.muscle) {
                showToast('Pick a primary muscle group ✱', 'error');
                return;
            }

            cxSave.disabled = true;
            try {
                const res = await fetch(`${API_BASE}/exercises`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        asset: 'None',
                        name,
                        equipment_type: cxState.equipment,
                        primary_muscle_group: cxState.muscle,
                        other_muscles: cxState.other,
                        exercise_type: cxState.type,
                        measurement: fieldsFor(cxState.type)
                    })
                });
                cxSave.disabled = false;

                if (res.status === 201) {
                    const created = await res.json();
                    const color = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
                    SUGG.push([created.name, created.exercise_type, color, created.exercise_type]);
                    try {
                        sessionStorage.setItem('cached_exercises', JSON.stringify(SUGG));
                    } catch (_) {}
                    closeCreateEx();
                    showToast('“' + created.name + '” added to your library ✱');

                    if (cxName) cxName.value = '';
                    cxState.other = [];
                    renderCxTags();
                    if (cxOther) cxOther.value = '';

                    addExerciseCard(created.name, created.exercise_type, color);
                } else {
                    let errorData;
                    try { errorData = await res.json(); } catch (_) {}
                    const msg = errorData?.message || 'Could not save the exercise. Try again.';
                    showToast(msg, 'error');
                }
            } catch (err) {
                console.error("Create custom exercise failed:", err);
                cxSave.disabled = false;
                showToast('Network error: Could not reach backend server.', 'error');
            }
        });
    }
}

/* ============================================================
   INITIALIZATION
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

    setupDateHeader();
    setupWorkoutSession();
    setupExerciseCardInteractions();
    setupRestDock();
    setupExerciseSearchModal();
    setupFinishModal(currentUser);
    setupCreateExerciseModal();

    fetchExercises();
}

init();
