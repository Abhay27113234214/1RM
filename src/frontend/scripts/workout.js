/* ============================================================
   Visual glue + UI state. YOUR logic plugs into the TODOs:
     load/save session    → #exList (template #exTpl)
     finish workout       → #finishBtn
     exercise search      → #exSearch / #suggList (stub list below)
     create exercise      → #createExBtn (links to create-exercise.html)
     notes                → textarea per exercise
   ============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const exList = $('#exList');




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


const current_user = JSON.parse(localStorage.getItem('current_user'))
if (!current_user) {
    window.location.href = "http://127.0.0.1:5500/src/frontend/templates/index.html?message=not_logged_in&from=workout&status=error"
}


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
            // slide aur fade out vali annimation
            t.classList.add('bye');
            t.style.height = '0px';
            t.style.paddingTop = '0';
            t.style.paddingBottom = '0';
            t.style.marginTop = '-10px';
        });

        t.addEventListener('animationend', () => t.remove());
        setTimeout(() => t.remove(), 500); // safety k liye 
    }

    const timer = setTimeout(dismiss, duration);
    t.querySelector('.t-x').addEventListener('click', dismiss);
}


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

let workout = JSON.parse(localStorage.getItem("current_user_workout")) // this is the object which will be edited when the user is doing his workout 
if (workout) {
    restore_session()
} else {
    workout = {}
    workout['start_time'] = Date.now()
}

// resume aware time functionality 
// ms already trained before this page load (0 for a fresh workout)
const bankedTime = (workout.pause_time && workout.start_time)
    ? Math.max(0, workout.pause_time - workout.start_time)
    : 0;
// virtual start: makes (Date.now() - startedAt) continue from the paused time
const startedAt = Date.now() - bankedTime;
// show the banked time immediately, before the first interval tick
$('#ssTime').textContent = fmtClock(bankedTime);


setInterval(() => { $('#ssTime').textContent = fmtClock(Date.now() - startedAt); }, 1000); 
// this fmtClock function is calculating the total time for which the workout has been going on
// yahan per setInterval isi liye use kiya hai kyunki har second baad time ko update bhi to krna padega na 


window.addEventListener("pagehide", function () { // this function will be triggered when the user leaves the tab or closes the browser tab
    workout['pause_time'] = Date.now() // I am storing the date in seconds from epoch so that later on
    // when the user resumes an unfinished session I can call the fmtclock functionality on this only
    localStorage.setItem("current_user_workout", JSON.stringify(workout))
})


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
            delete workout['exercises'][ex_name]['sets'][set_number]   // isko maine bilkul change nahi kiya 
        }
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
    workout['exercises'][exercise_name]['notes'] = e.target.value
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
    let response = await fetch("http://localhost:3000/exercises")
    let exercises = await response.json()
    for (let i = 0; i < exercises.length; i++) {
        SUGG.push([exercises[i].name, exercises[i].exercise_type, "#" + Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0"),  exercises[i].exercise_type])
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

/* "create your own" is a plain link → create-exercise.html (see TODO in the HTML) */

/* ---------- rest timer dock ---------- */
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

/* ---------- remove sets (auto-wired ✕ on every row) ---------- */
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

// finish button 
$('#finishBtn').addEventListener('click', async () => {
    // TODO: collect sets + notes, POST the session, set hasWorkoutToday = true, then:
    if (!workout.exercises) {
        showToast("Workout Cannot be empty!", "error")
        return
    }
    workout['date'] = new Date().toISOString().split("T")[0]
    workout['user_id'] = current_user.id
    workout['total_time'] = fmtClock(Date.now() - startedAt)
    delete workout.pause_time
    delete workout.start_time 
    let response = await fetch("http://localhost:3000/workouts", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(workout)
    })
    if (response.status === 201) {
        localStorage.removeItem('current_user_workout')
        workout = {} // emptying the workout object so that when the user exits, the workout that is finished is not stored in the local storage 
        window.location.href = "http://127.0.0.1:5500/src/frontend/templates/home.html?message=workout_completed&from=workout"
    } else {
        console.log("Some error occured")
    }
});


function restore_session() {
    let params = new URLSearchParams(window.location.search)
    let message = params.get("message")
    let from = params.get("from")
    
    if (from == 'home' && message == "resume_workout") {
        let workout = JSON.parse(localStorage.getItem("current_user_workout"))
        if (!workout || !workout.exercises) return

        Object.entries(workout.exercises).forEach(([ex_name, ex_data]) => {
            const type = ex_data.type || 'weight and reps'
            const tpl = $('#exTpl').content.cloneNode(true).querySelector('.ex-card')
            tpl.dataset.type = type
            tpl.querySelector('[data-bind="name"]').textContent = ex_name
            tpl.querySelector('[data-bind="eq"]').textContent = type
            tpl.querySelector('[data-bind="last"]').textContent = 'resuming your session ✱'
            
            // buildSets creates the header + one empty row
            buildSets(tpl)
            
            // Remove the empty row created by buildSets
            const sets = tpl.querySelector('.sets')
            const emptyRow = sets.querySelector('.set-row')
            if (emptyRow) emptyRow.remove()
            
            // Now add the saved sets
            if (ex_data.sets) {
                Object.entries(ex_data.sets).forEach(([set_num, set_vals]) => {
                    // Create a new empty row for this exercise type
                    const row = makeSetRow(tpl, null)
                    
                    // Fill in the saved values
                    Object.entries(set_vals).forEach(([field, value]) => {
                        const input = row.querySelector(`[data-field="${field}"]`)
                        if (input) input.value = value
                    })
                    
                    // Mark as completed (since it was saved, it was done)
                    row.classList.add('done')
                    row.querySelector('[data-done]').classList.add('on')
                    
                    sets.appendChild(row)
                })
            }
            
            // Restore notes if they exist
            if (ex_data.notes) {
                const noteBox = tpl.querySelector('.note-box')
                const textarea = noteBox.querySelector('textarea')
                textarea.value = ex_data.notes
                noteBox.classList.add('open')
                tpl.querySelector('[data-note]').classList.add('has')
            }
            
            exList.appendChild(tpl)
        })
        
        updateStats()
    }
}
