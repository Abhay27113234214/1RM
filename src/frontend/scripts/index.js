import { login, register } from '../../backend/auth.js'

const $ = s => document.querySelector(s);
// the above is an arrow function used to quickly select an element with a given class or id

const $$ = s => Array.from(document.querySelectorAll(s));
// this arrow function above is used to select all the elements of a given class 

const sleep = ms => new Promise(r => setTimeout(r, ms));
// this is just a simple utility function to stop something from happening for an arbitrary number of 
// milliseconds

// selecting everything using the above selecting arrow functions 
const modal = $('#authModal');
const authCard = $('#authCard'), onboardCard = $('#onboardCard');
const signinForm = $('#signinForm'), signupForm = $('#signupForm');
const obFields = $('#obFields');
const authTitle = $('#authTitle');
let lastFocus = null;

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

        /* 1. lock current height so we can collapse it smoothly */
        t.style.height = t.offsetHeight + 'px';

        requestAnimationFrame(() => {
            /* 2. slide + fade out */
            t.classList.add('bye');
            /* 3. shrink its space so the stack closes the gap */
            t.style.height = '0px';
            t.style.paddingTop = '0';
            t.style.paddingBottom = '0';
            t.style.marginTop = '-10px'; /* cancels the flex gap */
        });

        t.addEventListener('animationend', () => t.remove());
        setTimeout(() => t.remove(), 500); /* safety net */
    }

    const timer = setTimeout(dismiss, duration);
    t.querySelector('.t-x').addEventListener('click', dismiss);
}


function buildMeasureBox(host) {
    host.innerHTML = '';
    host.appendChild($('#measureTpl').content.cloneNode(true));
    // take the contents of the measureTpl template and the clone its contents and then push it in the host

    host.querySelectorAll('[data-mgroup]').forEach(group => {
        group.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                group.querySelectorAll('button').forEach(b => b.classList.remove('active', 'on'));
                btn.classList.add(group.classList.contains('seg') ? 'on' : 'active');
            });
        });
    });
    // select all the buttons in the data-mgroup and applies an event listener to each and everyone of them
    // it is basically code to add 'active' class to the button so the button is highlighted when clicked
}

function swapCard(which) {
    const showEl = which === 'onboard' ? onboardCard : authCard;
    const hideEl = which === 'onboard' ? authCard : onboardCard;
    // only replay the entrance animation when the visible card ACTUALLY changes.
    // replaying it on every signin/signup click was the flash.
    if (!hideEl.hidden || showEl.hidden) {
        hideEl.hidden = true;
        showEl.hidden = false;
        showEl.classList.remove('card-swap');
        void showEl.offsetWidth; // force the browser to re calculate the layout
        showEl.classList.add('card-swap');
    }
    showEl.scrollTop = 0;
}
// this function will just switch between the login card and the register card

let authSwapTimer = null;
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function showAuthView(view) {
    swapCard('auth');

    const next = view === 'signin' ? signinForm : signupForm;
    const prev = view === 'signin' ? signupForm : signinForm;

    // clean up any half-finished swap
    clearTimeout(authSwapTimer);
    signinForm.classList.remove('form-leave', 'form-enter');
    signupForm.classList.remove('form-leave', 'form-enter');

    $('#tabSignin').classList.toggle('on', view === 'signin');
    $('#tabSignup').classList.toggle('on', view === 'signup');
    $('#siErr').textContent = '';
    $('#suErr1').textContent = '';

    // title: swap the text behind a quick fade-up instead of a hard cut
    authTitle.classList.remove('title-swap');
    void authTitle.offsetWidth;
    authTitle.classList.add('title-swap');
    authTitle.textContent = view === 'signin' ? '1RM ✱ Welcome back' : '1RM ✱ Create your log';

    const focusField = () => {
        const target = view === 'signin' ? $('#siEmail') : $('#suName');
        if (target) target.focus({ preventScroll: true });
    };

    // already showing the right form (first open) — nothing to animate
    if (prev.hidden) {
        next.hidden = false;
        setTimeout(focusField, prefersReduced ? 0 : 340);
        return;
    }

    const startH = authCard.offsetHeight;

    // 1) fade + lift the old form out
    prev.classList.add('form-leave');

    authSwapTimer = setTimeout(() => {
        prev.hidden = true;
        prev.classList.remove('form-leave');

        // 2) fade + rise the new form in
        next.hidden = false;
        next.classList.add('form-enter');
        requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove('form-enter')));

        // 3) glide the card height so it doesn't jump
        if (!prefersReduced) {
            const endH = authCard.offsetHeight;
            if (Math.abs(endH - startH) > 2) {
                authCard.animate(
                    [{ height: startH + 'px' }, { height: endH + 'px' }],
                    { duration: 340, easing: 'cubic-bezier(.22, 1, .36, 1)' }
                );
            }
        }

        setTimeout(focusField, prefersReduced ? 0 : 220);
    }, prefersReduced ? 0 : 200);
}
// this is handling the visibility of the signin and create account forms

function showMeasurements() {
    buildMeasureBox(obFields);
    swapCard('onboard');
    $('#obErr').textContent = '';
    setTimeout(() => {
        const f = obFields.querySelector('.mHeight');
        if (f) f.focus({ preventScroll: true });
    }, 380);
}
// when the user clicks continue and then this function is exectuded, and the measurements section is 
// shown where the user can enter his measurements

function openDialog(view) {
    lastFocus = document.activeElement;
    if (view === 'measure') { showMeasurements(); }
    else { showAuthView(view || 'signin'); }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}
// the master function to handle the opening of all the views, the signin one or the login one or the measurements one 

function closeDialog() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}
// function to call after the user is done with filling the details and the form is to be closed 

modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeDialog(); });
// if any of the forms are open and the user clicks anywhere outside the forms then the form is to closed 

document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeDialog(); });
// if the user presses escape then the forms are to be closed 

// adding event listeners to the buttons 
$('#authBtn').addEventListener('click', () => openDialog('signin'));
$('#heroCta').addEventListener('click', () => openDialog('signup'));
$('#tabSignin').addEventListener('click', () => showAuthView('signin'));
$('#tabSignup').addEventListener('click', () => showAuthView('signup'));
$('#toSignup').addEventListener('click', () => showAuthView('signup'));


signinForm.addEventListener('submit', async e => {
    e.preventDefault();
    // TODO: your authentication logic here (email: #siEmail, password: #siPass).
    // Use $('#siErr') to show errors. Call closeDialog() when signed in.
    let email = document.getElementById('siEmail').value
    let password = document.getElementById('siPass').value
    if (!email || !password) {
        showToast('Please fill the required fields!')
        showAuthView('signin')
        return
    }
    let result = await login(email, password, showAuthView)
    if (result.success) {
        showToast('User Logged in successfully!!')
        closeDialog() // shyd yeh baad mein remove karna pade 
    } else {
        if (result.reason === 'user_not_found') {
            showToast("No account with that email — create one first.", 'error', 4600)
            showAuthView('signup')
            return
        } else if (result.reason === 'invalid_password') {
            showToast('Wrong password. Check it and try again.', 'error');
            return;
        }
    }
});

// create account → Continue → measurements dialog (no validation, per request) 
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // TODO: your account-creation logic here
    // (name: #suName, email: #suEmail, password: #suPass).
    // The transition to the measurements dialog below happens regardless.
    let name = document.getElementById("suName").value
    let username = document.getElementById("suUsername").value
    let email = document.getElementById("suEmail").value
    let password = document.getElementById("suPass").value

    if (!name || !username || !email || !password) {
        showToast("Please fill the required feilds!")
        showAuthView('signup')
        return
    }

    let user = {
        name: name,
        username: username,
        email: email,
        password: password
    }
    let result = await register(user)
    if (result.success) {
        showToast('Account created ✱ Your log is ready.');
        showMeasurements();
    } else {
        if (result.reason === 'user_already_exists') {
            showToast('That email already has a log — sign in instead.', 'error', 4600);
            showAuthView('signin');
            return;
        } else if (result.reason === 'some_error_occurred') {
            showToast('Something went wrong on our side. Try again.', 'error');
            return;
        }
    }
});

// measurements dialog buttons 
$('#obSave').addEventListener('click', () => {
    // TODO: read the values inside #obFields and save them your way.
    // Fields: .mHeight, .mWeight, .mBodyFat, .mAge + chip groups [data-mgroup].
    let height = document.getElementsByClassName("mHeight").value
    let weight = document.getElementsByClassName("mWeight").value
    let age = document.getElementsByClassName("mAge").value
    let body_fat = document.getElementsByClassName("mBodyFat").value

    closeDialog();
});

$('#obSkip').addEventListener('click', () => {
    // I don't think that there is any need of this function
    closeDialog();
});


/* ================= everything below = landing page ================= */

const navBar = $('#navBar');
const onScroll = () => navBar.classList.toggle('scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const io = new IntersectionObserver(es => es.forEach(x => {
    if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
}), { threshold: .12 });
$$('.reveal').forEach(el => io.observe(el));

(function () {
    const svg = $('#ecgSvg');
    if (!svg) return;
    const NS = 'http://www.w3.org/2000/svg';
    let d = 'M0 30 ';
    const beat = 'h36 l7 -9 l6 14 l9 -30 l9 40 l7 -24 l6 9 h36 ';
    for (let i = 0; i < 10; i++) { d += beat; }
    svg.setAttribute('viewBox', '0 0 1160 60');
    const base = document.createElementNS(NS, 'path');
    base.setAttribute('d', d);
    base.setAttribute('class', 'ecg-base');
    const pulse = document.createElementNS(NS, 'path');
    pulse.setAttribute('d', d);
    pulse.setAttribute('class', 'ecg-pulse');
    pulse.setAttribute('pathLength', '1');
    svg.appendChild(base);
    svg.appendChild(pulse);
})();

const fmtInt = n => Math.round(n).toLocaleString('en-US');
const cio = new IntersectionObserver(es => es.forEach(x => {
    if (!x.isIntersecting) return;
    cio.unobserve(x.target);
    const el = x.target;
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const t0 = performance.now(), dur = 1400;
    (function tick(t) {
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        const v = target * e;
        el.textContent = dec > 0 ? v.toFixed(dec) : fmtInt(v);
        if (p < 1) requestAnimationFrame(tick);
    })(t0);
}), { threshold: .5 });
$$('[data-count]').forEach(el => cio.observe(el));

$$('.faq-item').forEach(item => {
    item.querySelector('.faq-q').addEventListener('click', () => {
        const wasOpen = item.classList.contains('open');
        $$('.faq-item').forEach(i => i.classList.remove('open'));
        if (!wasOpen) item.classList.add('open');
    });
});

/* hero demo */
$('#demoDate').textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const DEMO = [
    { name: 'Bench Press', meta: '5 × 5 · 82.5 kg', c: '#FF4A11' },
    { name: 'Back Squat', meta: '4 × 6 · 120 kg', c: '#1E9E6A' },
    { name: 'Weighted Pull-ups', meta: '4 × 6 · +20 kg', c: '#3B6FE0' },
    { name: 'Plank', meta: '3 × 60s', c: '#D89B0B' },
    { name: '5K Run', meta: '26:12 · easy', c: '#D6486F' }
];
const demoWrap = $('#demoWrap');
const typeTarget = $('#typeTarget');
const demoList = $('#demoList');
const streakEl = $('#demoStreak');
let paused = false, demoIdx = 0, streakVal = 6;
demoWrap.addEventListener('mouseenter', () => { paused = true; });
demoWrap.addEventListener('mouseleave', () => { paused = false; });
const waitGo = async () => { while (paused) await sleep(150); };
const demoRows = [];

function addDemoRow(item) {
  const row = document.createElement('div');
  row.className = 'demo-row';
  row.style.setProperty('--c', item.c);
  row.innerHTML = '<span class="nm">' + item.name + '</span><span class="mt">' + item.meta + '</span>';
  demoList.appendChild(row);

  const step = row.offsetHeight + 8;   /* row height + gap = one slot */
  demoRows.unshift(row);

  /* park the new row just above the list, invisible */
  row.style.transform = 'translateY(' + (-step) + 'px)';
  row.style.opacity = '0';
  void row.offsetWidth;                /* force reflow so the entry animates */

  /* slide every row (including a temporary 4th) into its slot */
  demoRows.forEach((r, i) => {
    r.style.transform = 'translateY(' + (i * step) + 'px)';
  });

  /* fade the new one in, fade the 4th one out as it exits the clip */
  row.style.opacity = '';
  if (demoRows.length > 3) {
    const leaving = demoRows.pop();
    leaving.style.opacity = '0';
    setTimeout(() => leaving.remove(), 340);
  }

  /* size the list to exactly 3 slots — nothing below can ever shift */
  demoList.style.height = (3 * step) + 'px';

  streakVal++;
  streakEl.textContent = streakVal;
}
(async function demoLoop() {
    await sleep(900);
    while (true) {
        await waitGo();
        const item = DEMO[demoIdx % DEMO.length];
        demoIdx++;
        typeTarget.textContent = '';
        for (const ch of item.name) {
            await waitGo();
            typeTarget.textContent += ch;
            await sleep(36 + Math.random() * 44);
        }
        await sleep(420);
        addDemoRow(item);
        typeTarget.textContent = '';
        await sleep(1500);
    }
})();

/* coach widget */
const COACH = [
    { name: 'Bench Press', last: '5 × 5 @ 82.5 kg', w: 82.5, inc: 2.5, hist: [77.5, 80, 80, 82.5] },
    { name: 'Back Squat', last: '4 × 6 @ 120 kg', w: 120, inc: 5, hist: [110, 112.5, 115, 120] },
    { name: 'Deadlift', last: '3 × 5 @ 150 kg', w: 150, inc: 5, hist: [140, 142.5, 147.5, 150] },
    { name: 'Overhead Press', last: '4 × 8 @ 47.5 kg', w: 47.5, inc: 2.5, hist: [42.5, 45, 45, 47.5] },
    { name: 'Barbell Row', last: '4 × 8 @ 70 kg', w: 70, inc: 2.5, hist: [65, 67.5, 70, 70] }
];
let coachIdx = 0, rirVal = 2;
const coachChips = $('#coachChips');
const rirBtns = $('#rirBtns');
const coachOut = $('#coachOut');
const roundHalf = v => Math.round(v * 2) / 2;
const trim = v => String(+v.toFixed(1));

COACH.forEach((ex, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (i === 0 ? ' active' : '');
    b.textContent = ex.name;
    b.addEventListener('click', () => {
        coachIdx = i;
        coachChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        b.classList.add('active');
        computeCoach(true);
    });
    coachChips.appendChild(b);
});

['0', '1', '2', '3+'].forEach((lbl, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = lbl;
    if (i === 2) b.classList.add('on');
    b.addEventListener('click', () => {
        rirVal = i;
        rirBtns.querySelectorAll('button').forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        computeCoach(true);
    });
    rirBtns.appendChild(b);
});

function tweenCoachNum(to) {
    const el = $('#coachNum');
    const from = parseFloat(el.textContent.replace(/[^\d.-]/g, '')) || 0;
    if (Math.abs(to - from) < 0.01) { el.textContent = trim(to); return; }
    const t0 = performance.now(), dur = 550;
    (function tick(t) {
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = trim(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(tick);
    })(t0);
}

function renderTrend(hist, next) {
    const box = $('#coachTrend');
    box.innerHTML = '';
    const vals = hist.concat([next]);
    const max = Math.max.apply(null, vals);
    vals.forEach((v, i) => {
        const bar = document.createElement('div');
        bar.className = 'tbar';
        bar.style.height = Math.max(6, Math.round(v / max * 38)) + 'px';
        bar.style.animationDelay = (i * 60) + 'ms';
        box.appendChild(bar);
    });
}

function computeCoach(fresh) {
    const ex = COACH[coachIdx];
    $('#coachLast').textContent = ex.name + ' · ' + ex.last;
    let next, cls, badge, note;
    if (rirVal === 0) {
        next = roundHalf(ex.w * 0.9);
        cls = 'out-down';
        badge = '−10% · rebuild week';
        note = '<strong>Deload.</strong> You grinded to zero reserve. Drop the load, move clean, and come back stronger next block.';
    } else if (rirVal === 1) {
        next = ex.w;
        cls = 'out-hold';
        badge = 'same load · chase +1 rep';
        note = '<strong>Hold.</strong> One rep in reserve means the weight is exactly right. Keep it, and add a rep next time.';
    } else {
        next = ex.w + ex.inc;
        cls = 'out-up';
        badge = '+' + ex.inc + ' kg · next session';
        note = '<strong>Add load.</strong> You finished every rep with ' + rirVal + ' in reserve. Add ' + ex.inc + ' kg and keep the reps identical.';
    }
    coachOut.classList.remove('out-up', 'out-hold', 'out-down');
    coachOut.classList.add(cls);
    $('#coachBadge').textContent = badge;
    $('#coachNote').innerHTML = note;
    tweenCoachNum(next);
    renderTrend(ex.hist, next);
    if (fresh) {
        coachOut.classList.remove('swap');
        void coachOut.offsetWidth;
        coachOut.classList.add('swap');
    }
}
computeCoach(false);

/* heatmap */
const heat = $('#heat');
let hseed = 7;
const hrnd = () => { hseed = (hseed * 1103515245 + 12345) % 2147483648; return hseed / 2147483648; };
const HEAT_DAYS = 112, STREAK_TAIL = 6;
for (let n = 0; n < HEAT_DAYS; n++) {
    const ago = HEAT_DAYS - 1 - n;
    const d = new Date();
    d.setDate(d.getDate() - ago);
    let level;
    if (ago < STREAK_TAIL) {
        level = 2 + (n % 2);
    } else {
        const prog = n / HEAT_DAYS;
        level = hrnd() < (0.24 + prog * 0.5)
            ? Math.min(4, 1 + Math.floor(hrnd() * 3) + (hrnd() < 0.12 ? 1 : 0))
            : 0;
    }
    const cell = document.createElement('div');
    cell.className = 'heat-cell l' + level;
    const dstr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (level === 0) {
        cell.dataset.tip = dstr + ' · rest day';
    } else {
        const sessions = level > 2 ? 3 : level;
        const vol = sessions * (18 + Math.floor(hrnd() * 26)) * 100;
        cell.dataset.tip = dstr + ' · ' + sessions + (sessions > 1 ? ' sessions' : ' session') + ' · ' + vol.toLocaleString('en-US') + ' kg';
    }
    heat.appendChild(cell);
}

/* catalogue */
const CATALOG = [
    ['Bench Press', 'barbell', 'Push'], ['Overhead Press', 'barbell', 'Push'], ['Incline DB Press', 'dumbbell', 'Push'],
    ['Dips', 'bodyweight', 'Push'], ['Push-ups', 'bodyweight', 'Push'], ['Lateral Raise', 'dumbbell', 'Push'],
    ['Deadlift', 'barbell', 'Pull'], ['Pull-ups', 'bodyweight', 'Pull'], ['Barbell Row', 'barbell', 'Pull'],
    ['Face Pulls', 'cable', 'Pull'], ['Lat Pulldown', 'machine', 'Pull'], ['Bicep Curl', 'dumbbell', 'Pull'],
    ['Back Squat', 'barbell', 'Legs'], ['Front Squat', 'barbell', 'Legs'], ['Romanian Deadlift', 'barbell', 'Legs'],
    ['Walking Lunges', 'dumbbell', 'Legs'], ['Leg Press', 'machine', 'Legs'], ['Calf Raise', 'machine', 'Legs'],
    ['Plank', 'bodyweight', 'Core'], ['Hanging Leg Raise', 'bodyweight', 'Core'], ['Ab Wheel', 'wheel', 'Core'],
    ['Russian Twist', 'kettlebell', 'Core'], ['Cable Crunch', 'cable', 'Core'], ['Side Plank', 'bodyweight', 'Core'],
    ['5K Run', 'track', 'Cardio'], ['Rowing', 'erg', 'Cardio'], ['Cycling', 'bike', 'Cardio'],
    ['Jump Rope', 'rope', 'Cardio'], ['Incline Walk', 'treadmill', 'Cardio'], ['Swimming', 'pool', 'Cardio']
];
const CAT_DOT2 = { Push: '#FF4A11', Pull: '#3B6FE0', Legs: '#1E9E6A', Core: '#D89B0B', Cardio: '#D6486F' };
let catFilter = 'All';
const catChips = $('#catChips');
const exGrid = $('#exGrid');

['All', 'Push', 'Pull', 'Legs', 'Core', 'Cardio'].forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (i === 0 ? ' active' : '');
    b.textContent = c;
    b.addEventListener('click', () => {
        catFilter = c;
        catChips.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        renderCatalog();
    });
    catChips.appendChild(b);
});

function renderCatalog() {
    const list = CATALOG.filter(x => catFilter === 'All' || x[2] === catFilter);
    exGrid.innerHTML = '';
    list.forEach((x, i) => {
        const el = document.createElement('div');
        el.className = 'ex-item';
        el.style.setProperty('--c', CAT_DOT2[x[2]]);
        el.style.animationDelay = (i * 28) + 'ms';
        el.innerHTML = '<span class="ex-name">' + x[0] + '</span><span class="ex-tag">' + x[1] + '</span>';
        exGrid.appendChild(el);
    });
    $('#catCount').textContent = list.length + ' shown · 1,240 total';
}
renderCatalog();

/* custom exercise mock */
$$('[data-group]').forEach(group => {
    group.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            group.querySelectorAll('button').forEach(b => b.classList.remove('active', 'on'));
            btn.classList.add(group.classList.contains('seg') ? 'on' : 'active');
        });
    });
});
const saveBtn = $('#saveEx');
saveBtn.addEventListener('click', () => {
    if (saveBtn.classList.contains('saved')) return;
    saveBtn.classList.add('saved');
    saveBtn.textContent = 'Saved to catalogue ✓';
    setTimeout(() => {
        saveBtn.classList.remove('saved');
        saveBtn.textContent = 'Save to catalogue ✱';
    }, 2000);
});

