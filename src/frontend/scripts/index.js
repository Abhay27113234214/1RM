import { register, login, logout, addMeasurements } from "./utils/userUtils.js";
import { showToast, handleUrlFlashMessages } from "./utils/frontend_utils.js";

/* ============================================================
   1. DOM HELPERS & UTILITIES
============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmtInt = n => Math.round(n).toLocaleString('en-US');

/* ============================================================
   2. AUTH & ONBOARDING MODAL CONTROLS
============================================================ */
const modal = $('#authModal');
const authCard = $('#authCard'), onboardCard = $('#onboardCard');
const signinForm = $('#signinForm'), signupForm = $('#signupForm');
const obFields = $('#obFields');
const authTitle = $('#authTitle');
let lastFocus = null;
let authSwapTimer = null;
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function buildMeasureBox(host) {
    if (!host) return;
    host.innerHTML = '';
    const tpl = $('#measureTpl');
    if (!tpl) return;
    host.appendChild(tpl.content.cloneNode(true));

    host.querySelectorAll('[data-mgroup]').forEach(group => {
        group.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                group.querySelectorAll('button').forEach(b => b.classList.remove('active', 'on'));
                btn.classList.add(group.classList.contains('seg') ? 'on' : 'active');
            });
        });
    });
}

function swapCard(which) {
    const showEl = which === 'onboard' ? onboardCard : authCard;
    const hideEl = which === 'onboard' ? authCard : onboardCard;
    if (!showEl || !hideEl) return;

    if (!hideEl.hidden || showEl.hidden) {
        hideEl.hidden = true;
        showEl.hidden = false;
        showEl.classList.remove('card-swap');
        void showEl.offsetWidth;
        showEl.classList.add('card-swap');
    }
    showEl.scrollTop = 0;
}

function showAuthView(view) {
    swapCard('auth');

    const next = view === 'signin' ? signinForm : signupForm;
    const prev = view === 'signin' ? signupForm : signinForm;
    if (!next || !prev) return;

    clearTimeout(authSwapTimer);
    if (signinForm) signinForm.classList.remove('form-leave', 'form-enter');
    if (signupForm) signupForm.classList.remove('form-leave', 'form-enter');

    const tabSignin = $('#tabSignin');
    const tabSignup = $('#tabSignup');
    if (tabSignin) tabSignin.classList.toggle('on', view === 'signin');
    if (tabSignup) tabSignup.classList.toggle('on', view === 'signup');

    const siErr = $('#siErr');
    const suErr1 = $('#suErr1');
    if (siErr) siErr.textContent = '';
    if (suErr1) suErr1.textContent = '';

    if (authTitle) {
        authTitle.classList.remove('title-swap');
        void authTitle.offsetWidth;
        authTitle.classList.add('title-swap');
        authTitle.textContent = view === 'signin' ? '1RM ✱ Welcome back' : '1RM ✱ Create your log';
    }

    const focusField = () => {
        const target = view === 'signin' ? $('#siEmail') : $('#suName');
        if (target) target.focus({ preventScroll: true });
    };

    if (prev.hidden) {
        next.hidden = false;
        setTimeout(focusField, prefersReduced ? 0 : 340);
        return;
    }

    const startH = authCard ? authCard.offsetHeight : 0;
    prev.classList.add('form-leave');

    authSwapTimer = setTimeout(() => {
        prev.hidden = true;
        prev.classList.remove('form-leave');

        next.hidden = false;
        next.classList.add('form-enter');
        requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove('form-enter')));

        if (!prefersReduced && authCard) {
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

function showMeasurements() {
    buildMeasureBox(obFields);
    swapCard('onboard');
    const obErr = $('#obErr');
    if (obErr) obErr.textContent = '';
    setTimeout(() => {
        const f = obFields ? obFields.querySelector('.mHeight') : null;
        if (f) f.focus({ preventScroll: true });
    }, 380);
}

function openDialog(view) {
    if (!modal) return;
    lastFocus = document.activeElement;
    if (view === 'measure') {
        showMeasurements();
    } else {
        showAuthView(view || 'signin');
    }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeDialog() {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}

/* ============================================================
   3. AUTH & ONBOARDING SUBMISSION / HANDLERS
============================================================ */
function setupAuthModal() {
    if (modal) {
        modal.addEventListener('click', e => {
            if (e.target.closest('[data-close]')) closeDialog();
        });
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal && modal.classList.contains('open')) closeDialog();
    });

    const authBtn = $('#authBtn');
    if (authBtn) authBtn.addEventListener('click', () => openDialog('signin'));

    const heroCta = $('#heroCta');
    if (heroCta) heroCta.addEventListener('click', () => openDialog('signup'));

    const tabSignin = $('#tabSignin');
    if (tabSignin) tabSignin.addEventListener('click', () => showAuthView('signin'));

    const tabSignup = $('#tabSignup');
    if (tabSignup) tabSignup.addEventListener('click', () => showAuthView('signup'));

    const toSignup = $('#toSignup');
    if (toSignup) toSignup.addEventListener('click', () => showAuthView('signup'));

    if (signinForm) {
        signinForm.addEventListener('submit', async e => {
            e.preventDefault();
            const email = $('#siEmail')?.value?.trim();
            const password = $('#siPass')?.value;
            if (!email || !password) {
                showToast('Please fill the required fields!');
                showAuthView('signin');
                return;
            }
            const result = await login(email, password, showAuthView);
            if (result.success) {
                showToast('User Logged in successfully!!');
                await sleep(1500);
                window.location.href = "home.html";
            } else {
                if (result.reason === 'user_not_found') {
                    showToast("No account with that email — create one first.", 'error', 4600);
                    showAuthView('signup');
                } else if (result.reason === 'invalid_password') {
                    showToast('Wrong password. Check it and try again.', 'error');
                }
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async e => {
            e.preventDefault();
            const name = $('#suName')?.value?.trim();
            const username = $('#suUsername')?.value?.trim();
            const email = $('#suEmail')?.value?.trim();
            const password = $('#suPass')?.value;

            if (!name || !username || !email || !password) {
                showToast("Please fill the required feilds!");
                showAuthView('signup');
                return;
            }

            const user = { name, username, email, password };
            const result = await register(user);
            if (result.success) {
                showToast('Account created ✱ Your log is ready.');
                showMeasurements();
            } else {
                if (result.reason === 'user_already_exists') {
                    showToast('That email already has a log — sign in instead.', 'error', 4600);
                    showAuthView('signin');
                } else if (result.reason === 'some_error_occurred') {
                    showToast('Something went wrong on our side. Try again.', 'error');
                }
            }
        });
    }

    const obSave = $('#obSave');
    if (obSave) {
        obSave.addEventListener('click', async () => {
            const measurements = {
                height: document.querySelector(".mHeight")?.value || "NA",
                weight: document.querySelector(".mWeight")?.value || "NA",
                bodyFat: document.querySelector(".mBodyFat")?.value || "NA",
                age: document.querySelector(".mAge")?.value || "NA",
                sex: document.querySelector('[data-mgroup="sex"] .active')?.textContent || "NA",
                goal: document.querySelector('[data-mgroup="goal"] .active')?.textContent || "NA",
                experience: document.querySelector('[data-mgroup="exp"] .on')?.textContent || "NA",
                trainingDays: document.querySelector('[data-mgroup="days"] .on')?.textContent || "NA"
            };
            const result = await addMeasurements(measurements);
            if (result.success) {
                showToast('Measurements and goals aligned!');
                await sleep(2000);
                window.location.href = "home.html";
            } else {
                showToast('There was an error. Try again later', 'error');
            }
            closeDialog();
        });
    }

    const obSkip = $('#obSkip');
    if (obSkip) {
        obSkip.addEventListener('click', async () => {
            showToast('No worries, You can fill them later on!');
            await sleep(2000);
            window.location.href = "home.html";
            closeDialog();
        });
    }
}

/* ============================================================
   4. LANDING PAGE: NAVBAR & SCROLL REVEALS
============================================================ */
function setupNavbarAndReveals() {
    const navBar = $('#navBar');
    const onScroll = () => navBar && navBar.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const io = new IntersectionObserver(entries => entries.forEach(x => {
        if (x.isIntersecting) {
            x.target.classList.add('in');
            io.unobserve(x.target);
        }
    }), { threshold: .12 });
    $$('.reveal').forEach(el => io.observe(el));

    const cio = new IntersectionObserver(entries => entries.forEach(x => {
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
}

/* ============================================================
   5. LANDING PAGE: ECG PULSE GRAPH & FAQ ACCORDION
============================================================ */
function setupEcgPulse() {
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
}

function setupFaqAccordion() {
    $$('.faq-item').forEach(item => {
        const q = item.querySelector('.faq-q');
        if (q) {
            q.addEventListener('click', () => {
                const wasOpen = item.classList.contains('open');
                $$('.faq-item').forEach(i => i.classList.remove('open'));
                if (!wasOpen) item.classList.add('open');
            });
        }
    });
}

/* ============================================================
   6. LANDING PAGE: INTERACTIVE HERO DEMO (TYPING & STREAK)
============================================================ */
function setupHeroDemo() {
    const demoDate = $('#demoDate');
    if (demoDate) {
        demoDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

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
    if (!demoWrap || !typeTarget || !demoList || !streakEl) return;

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

        const step = row.offsetHeight + 8;
        demoRows.unshift(row);

        row.style.transform = 'translateY(' + (-step) + 'px)';
        row.style.opacity = '0';
        void row.offsetWidth;

        demoRows.forEach((r, i) => {
            r.style.transform = 'translateY(' + (i * step) + 'px)';
        });

        row.style.opacity = '';
        if (demoRows.length > 3) {
            const leaving = demoRows.pop();
            leaving.style.opacity = '0';
            setTimeout(() => leaving.remove(), 340);
        }

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
}

/* ============================================================
   7. LANDING PAGE: COACH WIDGET SIMULATOR
============================================================ */
function setupCoachWidget() {
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
    if (!coachChips || !rirBtns || !coachOut) return;

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
        if (!el) return;
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
        if (!box) return;
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
        const lastEl = $('#coachLast');
        if (lastEl) lastEl.textContent = ex.name + ' · ' + ex.last;

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
        const badgeEl = $('#coachBadge');
        if (badgeEl) badgeEl.textContent = badge;
        const noteEl = $('#coachNote');
        if (noteEl) noteEl.innerHTML = note;

        tweenCoachNum(next);
        renderTrend(ex.hist, next);
        if (fresh) {
            coachOut.classList.remove('swap');
            void coachOut.offsetWidth;
            coachOut.classList.add('swap');
        }
    }

    computeCoach(false);
}

/* ============================================================
   8. LANDING PAGE: CONSISTENCY HEATMAP & CATALOGUE
============================================================ */
function setupConsistencyHeatmap() {
    const heat = $('#heat');
    if (!heat) return;
    heat.innerHTML = '';

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
}

function setupCatalogueFilter() {
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
    if (!catChips || !exGrid) return;
    catChips.innerHTML = '';

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
        const catCount = $('#catCount');
        if (catCount) catCount.textContent = list.length + ' shown · 1,240 total';
    }

    renderCatalog();
}

function setupCustomExerciseMock() {
    $$('[data-group]').forEach(group => {
        group.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                group.querySelectorAll('button').forEach(b => b.classList.remove('active', 'on'));
                btn.classList.add(group.classList.contains('seg') ? 'on' : 'active');
            });
        });
    });

    const saveBtn = $('#saveEx');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (saveBtn.classList.contains('saved')) return;
            saveBtn.classList.add('saved');
            saveBtn.textContent = 'Saved to catalogue ✓';
            setTimeout(() => {
                saveBtn.classList.remove('saved');
                saveBtn.textContent = 'Save to catalogue ✱';
            }, 2000);
        });
    }
}

/* ============================================================
   9. INITIALIZATION (ORCHESTRATOR)
============================================================ */
async function init() {
    handleUrlFlashMessages();
    setupAuthModal();
    setupNavbarAndReveals();
    setupEcgPulse();
    setupFaqAccordion();
    setupHeroDemo();
    setupCoachWidget();
    setupConsistencyHeatmap();
    setupCatalogueFilter();
    setupCustomExerciseMock();
}

init();
