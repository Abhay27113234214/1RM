/* ============================================================
   Visual glue + UI state. YOUR logic plugs into the TODOs:
     load/save session    → #exList (template #exTpl)
     finish workout       → #finishBtn
     exercise search      → #exSearch / #suggList (stub list below)
     create exercise      → #createExBtn (links to create-exercise.html)
     notes                → textarea per exercise
   ============================================================ */
// Backend API base URL (MVC API integration)
// Local development toggle:
const API_BASE = "http://localhost:5000/api";
// const API_BASE = "https://onerm-workout-api.onrender.com/api";
import { logout, getCurrentUser } from "./utils/userUtils.js"
import { authenticate } from "./utils/authUtils.js";
import { showToast } from "./utils/frontend_utils.js";
const formData = new FormData() // this is for sending all the files and the other workout related fields to the backend in a single request

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const exList = $('#exList');


if (!(await authenticate())) { // pehle authenticate krna hai fir jaake page load ho nahi to redirect to index 
    sessionStorage.removeItem('token')
    window.location.href = "index.html?message=not_logged_in&from=home&status=error"
}
const current_user = await getCurrentUser()

/* ---------- exercise types ---------- */
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
const FIELD_COLS = { kg: 'var(--w-kg)', reps: 'var(--w-reps)', time: 'var(--w-time)', distance: 'var(--w-dist)' };

const fieldsFor = type => TYPE_FIELDS[type] || TYPE_FIELDS['weight_and_reps'];
const colsFor = type => '28px minmax(0, 1fr) ' + fieldsFor(type).map(f => FIELD_COLS[f]).join(' ') + ' 38px 28px';

function fieldHead(f, type) {
    if (f === 'kg' && type === 'weighted_bodyweight') return '+kg';
    if (f === 'kg' && type === 'assisted_bodyweight') return 'assist';
    return FIELD_META[f].head;
}

/* builds one set row for a card, matching its type.
   copyFrom = existing row to copy values from (for "+ add set") */
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
    return row;
}

/* fills a card's .sets with the right header + first row for its type */
function buildSets(card) {
    const type = card.dataset.type || 'weight_and_reps';
    const sets = card.querySelector('.sets');
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

/* tag the pre-rendered cards' inputs so the generic reading logic works on them */
$$('.set-row').forEach(row => {
    const kg = row.querySelector('.s-kg'); if (kg && !kg.dataset.field) kg.dataset.field = 'kg';
    const reps = row.querySelector('.s-reps'); if (reps && !reps.dataset.field) reps.dataset.field = 'reps';
});


// jo clock vaali functionality hai vo saari
$('#barDate').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
// TODO: restore startedAt if the session was saved mid-workout // yeh pata ni kya likha hua hai
// const startedAt = Date.now(); // Date.now() returns the number of miliseconds jo ho gaye hai jan 1, 1970, 00:00:00 se le k ab tk // yeh maine remove kr diya 


const fmtClock = ms => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0');
};
// yeh vaala function na vo jo Date.now() vaale format se time ko human readable format mein daal raha hai

const localDateKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

let workout = null;
try {
    workout = JSON.parse(localStorage.getItem("current_user_workout"));
} catch (e) {
    workout = null;
}

let startedAt = Date.now();

// Persist active workout state to localStorage
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

// Restore session: restores start_time/timer AND exercises/sets
function restore_session() {
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

    $('#ssTime').textContent = fmtClock(bankedTime);

    // 3. Restore exercises and completed sets
    if (workout.exercises && Object.keys(workout.exercises).length > 0) {
        exList.innerHTML = '';
        Object.entries(workout.exercises).forEach(([ex_name, ex_data]) => {
            const type = ex_data.type || 'weight_and_reps';
            const tpl = $('#exTpl').content.cloneNode(true).querySelector('.ex-card');
            tpl.dataset.type = type;
            tpl.querySelector('[data-bind="name"]').textContent = ex_name;
            tpl.querySelector('[data-bind="eq"]').textContent = type;
            tpl.querySelector('[data-bind="last"]').textContent = 'resuming your session ✱';

            // buildSets creates the header + one empty row
            buildSets(tpl);

            // Remove the empty row created by buildSets
            const sets = tpl.querySelector('.sets');
            const emptyRow = sets.querySelector('.set-row');
            if (emptyRow) emptyRow.remove();

            // Now add the saved sets
            if (ex_data.sets) {
                Object.entries(ex_data.sets).forEach(([set_num, set_vals]) => {
                    const row = makeSetRow(tpl, null);
                    Object.entries(set_vals).forEach(([field, value]) => {
                        const input = row.querySelector(`[data-field="${field}"]`);
                        if (input) input.value = value;
                    });
                    row.classList.add('done');
                    row.querySelector('[data-done]').classList.add('on');
                    sets.appendChild(row);
                });
            }

            // Restore notes if they exist
            if (ex_data.notes) {
                const noteBox = tpl.querySelector('.note-box');
                const textarea = noteBox.querySelector('textarea');
                textarea.value = ex_data.notes;
                noteBox.classList.add('open');
                tpl.querySelector('[data-note]').classList.add('has');
            }

            exList.appendChild(tpl);
        });

        updateStats();
    }

    // 4. Notification toast if returning from home
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") === 'home' && params.get("message") === "resume_workout") {
        showToast("Workout resumed ✱ Welcome back!");
    }
}

// Initialize session
if (workout && (workout.start_time || workout.startedAt || (workout.exercises && Object.keys(workout.exercises).length > 0))) {
    restore_session();
} else {
    workout = {
        start_time: Date.now(),
        startedAt: Date.now(),
        exercises: {}
    };
    startedAt = workout.start_time;
    $('#ssTime').textContent = '0:00';
    localStorage.setItem("current_user_workout", JSON.stringify(workout));
}

setInterval(() => {
    $('#ssTime').textContent = fmtClock(Date.now() - startedAt);
}, 1000);

window.addEventListener("pagehide", saveSessionState);
window.addEventListener("beforeunload", saveSessionState);


// total stats calculate karne vaali saari functionality
// TODO: different tarah ki exercises, alag tareeke se measure hoti hai to uska bhi dekhna padega
function updateStats() {
    $('#ssCount').textContent = exList.querySelectorAll('.ex-card').length;
    let vol = 0;
    exList.querySelectorAll('.set-row.done').forEach(r => {
        const kg = parseFloat(r.querySelector('[data-field="kg"]')?.value) || 0;
        const reps = parseFloat(r.querySelector('[data-field="reps"]')?.value) || 0;
        vol += kg * reps;   // only weight×reps types add to volume; timed/dist add 0
    });
    $('#ssVol').textContent = Math.round(vol).toLocaleString('en-US');
}
// document.addEventListener('input', e => { if (e.target.matches('.s-kg, .s-reps')) updateStats(); });
// to maine uper kya kiya, maine na document pe ek event listener laga diya 'input' type ka, aur fir maine kaha k agr mera jo 
// event ka target hai vo .s-kg ya .s-reps class ko belong krta hai to iska mtlb weights ya reps ka input mila hai to mujhe 
// total stats update karne ki zaroorat hai 
// maine isse remove hi krdiya kyunki iske bina bhi kam chl hi jaayega, agar mai done vaale button pe click kru to bhi stats 
// update ho hi jaayenge

updateStats();

// actions: done / add set / notes / delete exercise 
document.addEventListener('click', e => { // listen for every click on the document 
    const done = e.target.closest('[data-done]'); // if that click event occured inside a tag containing the data-done attribute 
    // then that means that the done button of a set was clicked so we need to update the stats and open the rest timer dock 
    if (done) {
        const row = done.closest('.set-row'); // find the closest tag with the .set-row class 
        const on = done.classList.toggle('on'); // agr data-done vaale button pe on class nahi hai to laga do aur agr hai to utar do
        // aur yeh ek boolean return krta hai, agr class lagayi hai to true aur agar class utari hai to false

        row.classList.toggle('done', on); // if on is true then add done to the set row 
        updateStats();
        // TODO: persist the set (exercise, set no, kg, reps, done)
        // yahan pe sets ko exercises ko kahi store karna hai 

        let ex_name = done.parentElement.parentElement.parentElement.querySelector('.ex-head').querySelector('.ex-name').textContent
        let set_number = done.parentElement.querySelector('.s-no').textContent

        const vals = {};
        row.querySelectorAll('input[data-field]').forEach(inp => {
            vals[inp.dataset.field] = inp.value;
        });

        if (!workout['exercises']) workout['exercises'] = {}
        if (!workout['exercises'][ex_name]) workout['exercises'][ex_name] = {}
        if (!workout['exercises'][ex_name]['sets']) workout['exercises'][ex_name]['sets'] = {}

        if (on) {
            const card = row.closest('.ex-card');
            const name = card.querySelector('.ex-name').textContent;
            const nextNo = card.querySelectorAll('.set-row.done').length + 1;
            if (!workout['exercises'][ex_name]['type']) workout['exercises'][ex_name]['type'] = card.dataset.type || 'weight_and_reps'
            openDock('next · ' + name + ' · set ' + nextNo);
            workout['exercises'][ex_name]['sets'][set_number] = vals
        } else {
            delete workout['exercises'][ex_name]['sets'][set_number]
        }
        saveSessionState();
    }

    // set add krna, uper vaali row k sets aur reps ko hi copy kr leta hai yeh
    // TODO: yahan pe recommendations vagera kaam krni chahiye vaise to
    const addset = e.target.closest('[data-addset]');
    // if the click happened inside the element with the data-addset attribute then that means that the addset logic has to be run
    if (addset) {
        const card = addset.closest('.ex-card');
        const sets = card.querySelector('.sets');
        const rows = sets.querySelectorAll('.set-row');
        const last = rows[rows.length - 1];
        sets.appendChild(makeSetRow(card, last));  // builds the right fields for this card's type
        // TODO: persist the new empty set
        // I don't think that I need to handle this right now, because my workout object will only be updated when the user clicks the done button 
    }


    // notes ko kholne ya bnd krne k liye 
    const note = e.target.closest('[data-note]');
    if (note) {
        const box = note.closest('.ex-card').querySelector('.note-box');
        box.classList.toggle('open');
        if (box.classList.contains('open')) box.querySelector('textarea').focus();
    }

    // exercises ko remove krne k liye 
    const del = e.target.closest('[data-del]');
    if (del) {
        const card = del.closest('.ex-card');
        card.classList.add('out');
        setTimeout(() => { card.remove(); updateStats(); }, 280);
        let exercise_name = card.querySelector('.ex-name').textContent
        delete workout['exercises'][exercise_name]
        saveSessionState();
    }
});
// what is this above function actually doing??
// First of all it is listening for clicks on the entire page, so if a click happens anywhere on the page, this function runs
// e is an event object that contains the information about the click event that happened
// e.target means in which element did the click actually happened
// e.target.closest looks at the target and then up the parent hierarchy until it finds an element with the sepecified attribute, so
//  so basically it is a way of finding out whether the element that was clicked was an element inside this or that. 



/* mark the note button once a note exists */
document.addEventListener('input', e => {
    if (!e.target.matches('.note-box textarea')) return;
    const btn = e.target.closest('.ex-card').querySelector('[data-note]');
    btn.classList.toggle('has', e.target.value.trim() !== '');
    // TODO: autosave the note (per exercise)
    let exercise_name = e.target.closest('.ex-card').querySelector('.ex-name').textContent
    if (!workout['exercises'][exercise_name]) workout['exercises'][exercise_name] = {};
    workout['exercises'][exercise_name]['notes'] = e.target.value
    saveSessionState();
});

// adding, removing exercises
let SUGG = [
    // ['Overhead Press', 'barbell', '#FF4A11'], ['Incline DB Press', 'dumbbell', '#FF4A11'], ['Dips', 'bodyweight', '#FF4A11'],
    // ['Deadlift', 'barbell', '#3B6FE0'], ['Pull-ups', 'bodyweight', '#3B6FE0'], ['Face Pulls', 'cable', '#3B6FE0'],
    // ['Romanian Deadlift', 'barbell', '#1E9E6A'], ['Walking Lunges', 'dumbbell', '#1E9E6A'], ['Leg Press', 'machine', '#1E9E6A'],
    // ['Plank', 'bodyweight', '#D89B0B'], ['Hanging Leg Raise', 'bodyweight', '#D89B0B'],
    // ['5K Run', 'track', '#D6486F'], ['Rowing', 'erg', '#D6486F']
];

async function fetch_exercises() {
    try {
        let response = await fetch(`${API_BASE}/exercises`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        let exercises = await response.json();
        for (let i = 0; i < exercises.length; i++) {
            SUGG.push([exercises[i].name, exercises[i].exercise_type, "#" + Math.floor(Math.random() * 16777215)
                .toString(16)
                .padStart(6, "0"), exercises[i].exercise_type]);
        }
    } catch (err) {
        console.error("fetch_exercises failed:", err);
        showToast("Could not load exercise list. Check backend connection.", "error");
    }
}

fetch_exercises()

const addEx = $('#addEx'), exSearch = $('#exSearch'), suggList = $('#suggList');

function openAddEx() {
    addEx.classList.add('open');
    $('#addExBox').hidden = false;
    renderSugg(exSearch.value);
    exSearch.focus();
}
function closeAddEx() {
    addEx.classList.remove('open');
    $('#addExBox').hidden = true;
    exSearch.value = '';
}
$('#addExBtn').addEventListener('click', openAddEx);
$('#addExClose').addEventListener('click', closeAddEx);
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && addEx.classList.contains('open')) closeAddEx();
});

function renderSugg(q) {
    const list = SUGG.filter(x => x[0].toLowerCase().includes(q.toLowerCase()));
    suggList.innerHTML = list.length
        ? list.map(x => '<button class="sugg-item" style="--c:' + x[2] + '" data-name="' + x[0] + '" data-type="' + x[1] + '"><span class="sd"></span><span class="sn">' + x[0] + '</span><span class="st">' + x[1] + '</span></button>').join('')
        : '<div class="sugg-empty">Nothing found — build it as a custom exercise ✱</div>';
}
exSearch.addEventListener('input', () => renderSugg(exSearch.value));

suggList.addEventListener('click', e => {
    const item = e.target.closest('.sugg-item');
    if (!item) return;
    const type = item.dataset.type || 'weight_and_reps';
    const tpl = $('#exTpl').content.cloneNode(true).querySelector('.ex-card');
    tpl.style.setProperty('--c', item.style.getPropertyValue('--c'));
    tpl.dataset.type = type;                                   // remember the type on the card
    tpl.querySelector('[data-bind="name"]').textContent = item.dataset.name;
    tpl.querySelector('[data-bind="eq"]').textContent = type;  // little tag shows the type
    tpl.querySelector('[data-bind="last"]').textContent = 'first time logging this one ✱';
    buildSets(tpl);                                            // build the right columns
    exList.appendChild(tpl);
    closeAddEx();
    updateStats();
    tpl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const first = tpl.querySelector('.set-row input');
    if (first) first.focus();
});


const restDock = $('#restDock'), rdPick = $('#rdPick'), rdLive = $('#rdLive'), rdDone = $('#rdDone');
let restSec = 90, restTotal = 90, restEnd = 0, restTick = null, hideTimer = null;
const fmtRest = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

function openDock(sub) {
    clearTimeout(hideTimer);
    stopTick();
    rdPick.hidden = false; rdLive.hidden = true; rdDone.hidden = true;
    if (sub) $('#rdSub').textContent = sub;
    restDock.hidden = false;
    requestAnimationFrame(() => restDock.classList.add('open'));
}
function closeDock() {
    stopTick();
    restDock.classList.remove('open');
    setTimeout(() => { restDock.hidden = true; }, 450);
}
function stopTick() { clearInterval(restTick); restTick = null; }

function startRest(sec, sub) {
    restTotal = restSec = sec;
    restEnd = Date.now() + sec * 1000;
    if (sub) $('#rdSub').textContent = sub;
    rdPick.hidden = true; rdLive.hidden = false; rdDone.hidden = true;
    stopTick();
    restTick = setInterval(tickRest, 200);
    tickRest();
}
function tickRest() {
    const left = Math.max(0, restEnd - Date.now());
    $('#rdTime').textContent = fmtRest(Math.ceil(left / 1000));
    $('#rdBar').style.width = (left / (restTotal * 1000) * 100) + '%';
    if (left <= 0) finishRest();
}
function finishRest() {
    stopTick();
    rdLive.hidden = true; rdDone.hidden = false;
    if (navigator.vibrate) navigator.vibrate([160, 70, 160]);
    // TODO: optional — toast, highlight the next set, etc.
    hideTimer = setTimeout(closeDock, 3200);
}

$$('.rd-chip').forEach(c => c.addEventListener('click', () => {
    $$('.rd-chip').forEach(x => x.classList.remove('on'));
    c.classList.add('on');
    startRest(+c.dataset.rest);
}));
$('#rdStart').addEventListener('click', () => startRest(restSec));
$('#rdAdd').addEventListener('click', () => { restEnd += 15000; restTotal += 15; tickRest(); });
$('#rdSkip').addEventListener('click', finishRest);
$('#rdClose').addEventListener('click', closeDock);
$('#restBtn').addEventListener('click', () => openDock());


function ensureDel(row) {
    if (row.querySelector('[data-delset]')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'del-set';
    b.setAttribute('data-delset', '');
    b.setAttribute('aria-label', 'Remove set');
    b.textContent = '✕';
    row.appendChild(b);
}
$$('.set-row').forEach(ensureDel); // this function added the remove set button to every set row in an exercise card

/* auto-wire rows created later (+ add set, new exercises) */
new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
        if (n.nodeType !== 1) return;
        if (n.matches && n.matches('.set-row')) ensureDel(n);
        if (n.querySelectorAll) n.querySelectorAll('.set-row').forEach(ensureDel);
    }));
}).observe(exList, { childList: true, subtree: true });

document.addEventListener('click', e => {
    const del = e.target.closest('[data-delset]');
    if (!del) return;

    let row = del.closest('.set-row'); // selected the row to be deleted 
    let card = row.closest('.ex-card'); // selecting the exercise card
    let s_number = row.querySelector('.s-no').textContent // getting the set number to be deleted 
    let ex_name = card.querySelector('.ex-name').textContent // getting the name of the exercise to be deleted

    /* keep at least one set per exercise — shake instead */
    if (card.querySelectorAll('.set-row').length <= 1) {
        row.classList.remove('nope');
        void row.offsetWidth;
        row.classList.add('nope');
        return;
    }

    /* smooth height collapse, then clean up */
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
            r.querySelector('.s-no').textContent = i + 1;
        });
        updateStats();
    }, 320);

    // TODO: also remove this set from your session data
    delete workout['exercises'][ex_name]['sets'][s_number]
    // this code above is removing the set from my session data
});


// the finish workout functionality
const finishModal = $('#finishModal');
let photoData = []; // data-URL previews; becomes workout.photos on save

// is function se vo dialogue open ho jaata hai 
$('#finishBtn').addEventListener('click', () => {
    if (!workout.exercises || !Object.keys(workout.exercises).length) {
        showToast("Workout Cannot be empty!", "error") // agr koi workout log nahi kiya to 
        return
    }
    fillFinishStats();
    finishModal.classList.add('open');
    finishModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#fmTitle').focus({ preventScroll: true }), 350);
});

// dialogue close karne k liye 
function closeFinish() {
    finishModal.classList.remove('open');
    finishModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}
finishModal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeFinish(); }); // agr banda cross vaala button dabaye 
document.addEventListener('keydown', e => { if (e.key === 'Escape' && finishModal.classList.contains('open')) closeFinish(); }); // agr banda escape key dabaye

// thodi si summary jo finish workout vaale dialogue mein show hoti hai 
function fillFinishStats() {
    const doneRows = exList.querySelectorAll('.set-row.done'); // vo saari rows ko select karo jo done hai
    let vol = 0;
    doneRows.forEach(r => {
        vol += (parseFloat(r.querySelector('[data-field="kg"]')?.value) || 0) *
            (parseFloat(r.querySelector('[data-field="reps"]')?.value) || 0);
    }); // volume calculate ho rhi hai
    $('#fmStats').innerHTML =
        '<span>time <b>' + fmtClock(Date.now() - startedAt) + '</b></span>' +
        '<span>sets <b>' + doneRows.length + '</b></span>' +
        '<span>volume <b>' + Math.round(vol).toLocaleString('en-US') + ' kg</b></span>';
}

// saari photos k preview dikhane vaale function 
const fmPhotos = $('#fmPhotos');
fmPhotos.addEventListener('change', () => { // change is an event when the value of an input field changed and the user leaves/commits the field
    [...fmPhotos.files].forEach(file => {
        if (!file.type.startsWith('image/')) return;
        photoData.push(file)
        renderShots()
    });
    fmPhotos.value = ''; // allow re-adding the same file later
});


const photoUrls = new Map();
function renderShots() {
    const wrap = $('#fmShots');
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
        wrap.insertBefore(fig, add);
    });
}

$('#fmShots').addEventListener('click', e => {
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


// actual workout save krne vaala function
async function submitWorkout(withDetails) {
    const saveBtn = $('#fmSave');
    saveBtn.disabled = true;

    if (withDetails) {
        workout['title'] = $('#fmTitle').value.trim() || "Grinded";
        workout['description'] = $('#fmDesc').value.trim();
        workout['photos'] = photoData
    } else {
        workout['title'] = "Grinded"
        workout['photos'] = ["../assets/default_workout_image.png"]
    }
    workout['date'] = localDateKey()
    workout['user_id'] = current_user.id
    workout['start_time'] = startedAt
    workout['total_time'] = fmtClock(Date.now() - startedAt)
    workout['total_volume'] = $('#ssVol').textContent
    workout['spots'] = []
    workout['comments'] = []
    delete workout.pause_time
    delete workout.elapsed_time
    delete workout.startedAt
    delete workout.time

    try {
        workout['photos'].forEach(file => {
            formData.append('photos', file)
        })
        delete workout.photos 

        formData.append('exercises', JSON.stringify(workout.exercises))

        delete workout.exercises

        Object.entries(workout).forEach(([key, value]) => {
            formData.append(key, value)
        })

        let response = await fetch('http://localhost:5000/api/workouts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            },
            body: formData
        });
        if (response.status === 201) {
            localStorage.removeItem('current_user_workout');
            workout = {};
            window.location.href = "home.html?message=workout_completed&from=workout";
        } else if (response.status === 413) {
            saveBtn.disabled = false;
            showToast("Workout photos are too large (>10MB). Please remove some photos.", "error");
        } else {
            saveBtn.disabled = false;
            let errorData;
            try { errorData = await response.json(); } catch (_) {}
            const msg = errorData?.message || "Could not save the workout. Try again.";
            showToast(msg, "error");
        }
    } catch (err) {
        console.error("submitWorkout failed:", err);
        saveBtn.disabled = false;
        showToast("Network error: Could not reach backend server. Try again.", "error");
    }
}
$('#fmSave').addEventListener('click', () => submitWorkout(true));
$('#fmSkip').addEventListener('click', () => submitWorkout(false));


const createExModal = $('#createExModal');
const cxState = { equipment: 'None', muscle: null, type: 'weight_and_reps', other: [] };

function openCreateEx() {
    createExModal.classList.add('open');
    createExModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    syncMeasure();
    setTimeout(() => $('#cxName').focus({ preventScroll: true }), 350);
}
function closeCreateEx() {
    createExModal.classList.remove('open');
    createExModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}
createExModal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeCreateEx(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && createExModal.classList.contains('open')) closeCreateEx(); });

// "create your own" link ab page change nahi karta, dialog kholta hai
$('.create-ex').addEventListener('click', e => {
    e.preventDefault();
    openCreateEx();
});

// single-select chip groups (equipment / muscle / type)
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

// "measured in" chips = TYPE_FIELDS mapping, type badlo to live update
function syncMeasure() {
    $('#cxMeasure').innerHTML = fieldsFor(cxState.type).map(f => '<span>' + f + '</span>').join('');
}

// other-muscles tag input (Enter ya comma se add)
const cxOther = $('#cxOther');
function renderCxTags() {
    $('#cxTags').innerHTML = cxState.other.map((m, i) =>
        '<span class="cx-tag">' + m + '<button type="button" data-rm="' + i + '" aria-label="Remove">✕</button></span>').join('');
}
cxOther.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    const v = cxOther.value.trim().replace(/,+$/, '');
    if (v && !cxState.other.includes(v)) { cxState.other.push(v); renderCxTags(); }
    cxOther.value = '';
});
$('#cxTags').addEventListener('click', e => {
    const btn = e.target.closest('[data-rm]');
    if (!btn) return;
    cxState.other.splice(+btn.dataset.rm, 1);
    renderCxTags();
});

// naya exercise session mein add karne ka wahi logic jo sugg click use karta hai
function addExerciseCard(name, type, color) {
    const tpl = $('#exTpl').content.cloneNode(true).querySelector('.ex-card');
    tpl.style.setProperty('--c', color);
    tpl.dataset.type = type;
    tpl.querySelector('[data-bind="name"]').textContent = name;
    tpl.querySelector('[data-bind="eq"]').textContent = type;
    tpl.querySelector('[data-bind="last"]').textContent = 'first time logging this one ✱';
    buildSets(tpl);
    exList.appendChild(tpl);
    updateStats();
    tpl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// save → POST /exercises → library + search + session, teeno mein
$('#cxSave').addEventListener('click', async () => {
    const name = $('#cxName').value.trim();
    if (!name) { showToast('Give the exercise a name ✱', 'error'); $('#cxName').focus(); return; }
    if (!cxState.muscle) { showToast('Pick a primary muscle group ✱', 'error'); return; }

    const saveBtn = $('#cxSave');
    saveBtn.disabled = true;
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
                measurement: fieldsFor(cxState.type)   // ['kg','reps'] wagaira — db shape se match
            })
        });
        saveBtn.disabled = false;

        if (res.status === 201) {
            const created = await res.json();
            const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
            SUGG.push([created.name, created.exercise_type, color, created.exercise_type]); // search mein turant
            closeCreateEx();
            showToast('“' + created.name + '” added to your library ✱');
            // reset for next time
            $('#cxName').value = '';
            cxState.other = []; renderCxTags(); cxOther.value = '';
            // aur seedha session mein bhi add
            addExerciseCard(created.name, created.exercise_type, color);
        } else {
            let errorData;
            try { errorData = await res.json(); } catch (_) {}
            const msg = errorData?.message || 'Could not save the exercise. Try again.';
            showToast(msg, 'error');
        }
    } catch (err) {
        console.error("Create custom exercise failed:", err);
        saveBtn.disabled = false;
        showToast('Network error: Could not reach backend server.', 'error');
    }
});