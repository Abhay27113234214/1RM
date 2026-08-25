import { logout } from "../../backend/auth.js";
/* ============================================================
   Visual-only glue. YOUR logic plugs into the TODOs:
     hasWorkoutToday       → hide #startWorkout when true
     .post click / Enter   → open workout detail page   (TODO)
     [data-profile]        → open profile page          (TODO)
     [data-todo]           → settings / sign out        (TODO)
     #feed, #feed2         → render with #postTpl
     #loadMore             → pagination
   ============================================================ */


const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
// similar arrow functions for quick dom element selection

function getMessageAndAct() {
    let params = new URLSearchParams(window.location.search)
    let message = params.get("message")
    let source = params.get("from")
    if (source == "workout") {
        if (message == "workout_completed") {
            showToast("Workout Completed")
            localStorage.removeItem('current_user_workout')
        }
    }
}
getMessageAndAct()

const current_user = JSON.parse(localStorage.getItem('current_user'))
if (!current_user) {
    window.location.href = "http://127.0.0.1:5500/src/frontend/templates/index.html?message=not_logged_in&from=home&status=error"
}

const localDateKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');


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


// this is the resume workout floater
function checkResumeFloat() {
    const float = $('#resumeFloat');
    if (!float) return;

    let active = null;
    try { active = JSON.parse(localStorage.getItem('current_user_workout')); } catch (e) { }

    // if there is no saved user workout in the local storage then stop 
    if (!active) {
        float.hidden = true;
        float.classList.remove('on');
        return;
    }

    // a workout is saved but nothing is logged then remove the saved workout
    if (!active.exercises || Object.keys(active.exercises).length === 0) {
        localStorage.removeItem('current_user_workout');
        float.hidden = true;
        float.classList.remove('on');
        return;
    }

    $('#rfEx').textContent = Object.keys(active.exercises).at(-1);
    if (!active.startedAt) $('#rfTimeWrap').style.display = 'none';

    float.hidden = false;
    setTimeout(() => float.classList.add('on'), 350);

    if (active.time) $('#rfTime').textContent = active.time;
}

// first load
checkResumeFloat();

// yeh part nahi chal raha, abhi bhi resume workout vaala button reload krne pe hi show ho raha hai
// re-run whenever this page becomes "current" again  ← the part you were missing
window.addEventListener('pageshow', checkResumeFloat);            // back/forward cache + reload
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkResumeFloat();
});


function dynamic_user_data_replacing() {
    // for the initials 
    let user_initial_spans = $$('.current_user_initials')
    let initials = ""
    current_user.name.trim().split(" ").forEach((spl) => initials += spl[0].toUpperCase())
    user_initial_spans.forEach((span) => {
        span.innerHTML = initials
    })

    // for name 
    let user_name_ele = $$('.current_user_name')
    user_name_ele.forEach((ele) => {
        ele.innerHTML = current_user.name.charAt(0).toUpperCase() + current_user.name.slice(1)
    })

    // for username 
    let user_username_ele = $$('.current_user_username')
    user_username_ele.forEach((ele) => {
        ele.innerHTML = `@${current_user.username}`
    })
}
dynamic_user_data_replacing()



const navBar = $('#navBar');
const onScroll = () => navBar.classList.toggle('scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

$('#todayLine').innerHTML = '<b>✱</b> ' + new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) + ' <span class="live-dot"></span>';

// start workout card, but only shown when the user who is logged in has had a workout today 
const date = localDateKey()
const url = `http://localhost:3000/workouts?user_id:eq=${current_user.id}&date:eq=${date}`;
let workout_response = await fetch(url)
let workouts = await workout_response.json()
const hasWorkoutToday = workouts.length >= 1;
if (hasWorkoutToday) {
    $('#startWorkout').hidden = true;
}

/* reveal on scroll */
const io = new IntersectionObserver(es => es.forEach(x => {
    if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
}), { threshold: .1 });
$$('.reveal').forEach(el => io.observe(el));

const drawer = $('#drawer'), drawerBack = $('#drawerBack'), burger = $('#burgerBtn');
function openDrawer() {
    drawer.classList.add('open'); drawerBack.classList.add('open'); burger.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
}
function closeDrawer() {
    drawer.classList.remove('open'); drawerBack.classList.remove('open'); burger.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
}
burger.addEventListener('click', () => drawer.classList.contains('open') ? closeDrawer() : openDrawer());
drawerBack.addEventListener('click', closeDrawer);
$('#drawerX').addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });

// profile, sign in, sign out
$$('[data-profile]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault(); closeDrawer();
    window.location.href = "profile.html"
}));
$$('[data-todo]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    let action = el.dataset.todo
    if (action === "settings") {
        // yrr yeh vaala page ni banaya TODO
    } else if (action === "signout") {
        logout()
        window.location.href = "http://127.0.0.1:5500/src/frontend/templates/index.html?message=logged_out&status=success"
    }
}));

document.addEventListener('click', async e => {

    // spot krna check krna, agr current user ne workout ko spot kiya hua hai to uski id spots vaali array mein honi chahiye
    const spot = e.target.closest('[data-action="spot"]');
    if (spot) {
        const shell = spot.closest('.post-shell');
        const w = await getWorkout(shell.dataset.id);
        let spots = w.spots || [];
        const has = spots.includes(current_user.id);
        spots = has ? spots.filter(uid => uid !== current_user.id) // agr current user ne pehle bhi like kiya hua hai to ab uss like ko remove krdo 
                    : [...spots, current_user.id]; // aur agr usne like nahi kiya hua to usse add krdo 
        const updated = await patchWorkout(w.id, { spots });
        spot.classList.toggle('on', !has);
        spot.querySelector('[data-count]').textContent = updated.spots.length;
        return;
    }

    const cmt = e.target.closest('[data-action="comment"]');
    if (cmt) {
        const box = cmt.closest('.post').querySelector('.p-cbox');
        if (box) { box.hidden = !box.hidden; if (!box.hidden) box.querySelector('input').focus(); }
        return;
    }

    const send = e.target.closest('[data-action="send"]');
    if (send) {
        const post = send.closest('.post');
        const shell = post.closest('.post-shell');
        const input = post.querySelector('.p-cbox input');
        const text = input.value.trim();
        if (!text) { input.focus(); return; }

        send.disabled = true;
        const w = await getWorkout(shell.dataset.id);
        const comments = w.comments || [];
        let initials = ""
        current_user.name.trim().split(" ").forEach((spl) => initials += spl[0].toUpperCase())
        comments.push({
            i: initials,
            n: current_user.name,
            h: current_user.username,
            x: text,
            t: Date.now()
        });
        const updated = await patchWorkout(w.id, { comments });
        send.disabled = false;

        // naya comment dikhao, count badhao, box band karo
        const lastC = updated.comments[updated.comments.length - 1];
        const html = `<b>${esc(lastC.n)} · ${get_proper_time_from_start(lastC.t)} ago</b>“${esc(lastC.x)}”`;
        let pComment = post.querySelector('.p-comment');
        if (pComment) pComment.innerHTML = html;
        else {
            pComment = document.createElement('div');
            pComment.className = 'p-comment';
            pComment.innerHTML = html;
            post.querySelector('.p-cbox').before(pComment);
        }
        post.querySelector('[data-ccount]').textContent = updated.comments.length;
        input.value = '';
        post.querySelector('.p-cbox').hidden = true;
        return;
    }

    // bhai follow vaali functionality ni hoti merese
    const follow = e.target.closest('[data-action="follow"]');
    if (follow) {
        const on = follow.classList.toggle('on');
        follow.textContent = on ? 'Following ✱' : 'Follow';
    }
});

const railEl = document.querySelector('.home .rail');
if (railEl) {
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

// this is function is for when the user has not completed his/her profile and we are to show him/her an option 
// to complete it on the home page
(function () {
    const banner = $('#profileBanner');
    if (!banner) return;

    let user = null;
    try { user = JSON.parse(localStorage.getItem('current_user')); } catch (e) { }
    if (!user) return;

    const userKey = user.email || user.username || user.id || 'me';

    if (user.incomplete === true) {
        banner.hidden = false;
    }

    $('#profileBannerX').addEventListener('click', () => {
        hideBanner();
    });

    $('#profileBannerLink').addEventListener('click', e => {
        e.preventDefault();
        // TODO: route to your measurements/goals setup, e.g.:
        // location.href = 'profile.html?setup=1';
    });

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
})();


// function to get the proper time 
let get_proper_time_from_start = (oldTIme) => {
    const elapsed = Date.now() - oldTIme;
    const days = Math.floor(elapsed / 86400000);
    const hours = Math.floor((elapsed % 86400000) / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    let result = "";
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m`;
    return result.trim()
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
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

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

let renderWorkoutInPostCard = (element) => {
    const exercises = element.exercises || {};
    return Object.entries(exercises).map(([name, ex]) => {
        const sets = Object.values(ex.sets || {});
        const count = sets.length;
        const last = sets[count - 1] || {};
        return `
            <div class="p-row" style="--c:${dotColorFor(name)}">
                <span class="nm">${name}</span>
                <span class="mt">${count} set${count !== 1 ? 's' : ''} · ${summarizeSet(last)}</span>
            </div>`;
    }).join('');
};

let format_total_time = (t) => {
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
};

async function getWorkout(id) {
    return (await fetch('http://localhost:3000/workouts/' + id)).json();
}
async function patchWorkout(id, changes) {
    return (await fetch('http://localhost:3000/workouts/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
    })).json();
}

let feed = $('#feed')
let myToday = $('#myToday')

let buildPostCard = async (element) => {
    let user_response = await fetch(`http://localhost:3000/users/${element.user_id}`)
    let user = await user_response.json()
    let user_initials = ''
    let photo = (element.photos && element.photos.length >= 1) ? element.photos[0] : "../assets/default_workout_image.png"
    user.name.trim().split(" ").forEach((spl) => user_initials += spl[0].toUpperCase())
    const spots = element.spots || [];
    const comments = element.comments || [];
    const spotted = spots.includes(current_user.id);
    const lastC = comments[comments.length - 1];
    return `
        <div class="post-shell" data-id="${element.id}">
            <article class="post" tabindex="0" role="button" aria-label="Open ${user.name}'s workout">
                <div class="p-head">
                    <span class="av" style="background:#FF4A11">${user_initials}</span>
                    <div class="p-who">
                        <div class="p-name">${user.name}</div>
                        <div class="p-meta"><span>@${user.username}</span><span>·</span><span>${get_proper_time_from_start(element.start_time)} ago</span></div>
                    </div>
                </div>
                <h3 class="p-title">${element.title}</h3>
                <div class="p-img">
                    <img src="${photo}" alt="workout photo" loading="lazy">
                    <span class="img-tag"><b>✱</b> strength</span>
                </div>
                <div class="p-rows">${renderWorkoutInPostCard(element)}</div>
                <div class="p-foot"><span>volume <b>${element.total_volume} kg</b></span><span>time <b>${format_total_time(element.total_time)}</b></span></div>
                <div class="p-acts">
                    <button class="act ${spotted ? 'on' : ''}" data-action="spot"><span class="st">✱</span>Spot · <span data-count>${spots.length}</span></button>
                    <button class="act" data-action="comment">Comment · <span data-ccount>${comments.length}</span></button>
                    <button class="act share" data-action="share">Share</button>
                </div>
                ${lastC ? `<div class="p-comment"><b>${esc(lastC.n)} · ${get_proper_time_from_start(lastC.t)} ago</b>“${esc(lastC.x)}”</div>` : ''}
                <div class="p-cbox" hidden>
                    <input type="text" placeholder="Say something nice…">
                    <button class="btn-primary" data-action="send">Post</button>
                </div>
            </article>
        </div>
    `
}
let renderPosts = async () => {
    let workouts_response = await fetch("http://localhost:3000/workouts?_sort=-date")
    let workouts = await workouts_response.json()
    const today = localDateKey()

    // meri aaj ki workouts -> date ke neeche vaala section
    const mineToday = workouts.filter(w => w.user_id == current_user.id && w.date === today)
    // feed > sirf baaki log (meri workouts upar already dikhi hain)
    const feedList = workouts.filter(w => w.user_id != current_user.id)

    if (mineToday.length && myToday) {
        myToday.innerHTML = '<div class="my-today-lbl">your sessions today</div>'
        for (const element of mineToday) {
            myToday.innerHTML += await buildPostCard(element)
        }
    }

    for (const element of feedList) {
        feed.innerHTML += await buildPostCard(element)
    }
}
renderPosts()


const OPEN_DELAY = 250;      // ms — jitna delay chahiye yahan badlo
let openingPost = false;     // double-click pe do baar navigate na ho

function openPost(post) {
    const id = post.closest('.post-shell')?.dataset.id;
    if (!id || openingPost) return;
    openingPost = true;
    post.closest('.post-shell').classList.add('opening');   // pressed look
    setTimeout(() => {
        window.location.href = 'post.html?id=' + id;
    }, OPEN_DELAY);
}

document.addEventListener('click', e => {
    const post = e.target.closest('.post');
    if (!post) return;
    if (e.target.closest('button, a, input')) return;  // spot/comment/share apna kaam karein
    // agr unko chodh k kahi aur click hua to post vaala page khul jaayega
    openPost(post);
});

document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return; // agr user ab space ya enter dabaye to post vaala page na khul jaaye kyunki vo shyd comment likh raha hai
    const post = e.target.closest('.post');
    if (!post) return;
    if (e.target.closest('input, textarea, button, a')) return;
    e.preventDefault();
    openPost(post);
});


function workoutVolume(w) {
    let v = 0;
    Object.values(w.exercises || {}).forEach(ex => {
        Object.values(ex.sets || {}).forEach(s => {
            const kg = Array.isArray(s) ? parseFloat(s[0]) || 0 : parseFloat(s.kg) || 0;
            const reps = Array.isArray(s) ? parseFloat(s[1]) || 0 : parseFloat(s.reps) || 0;
            v += kg * reps;
        });
    });
    return v;
}

(async function renderWeek() {
    const wkEl = document.querySelector('.home .rail .wk');
    if (!wkEl) return;
    const cells = Array.from(wkEl.children);           // the 7 <i> cells (M..S)
    if (cells.length !== 7) return;

    // meri saari workouts lao
    const res = await fetch(`http://localhost:3000/workouts?user_id:eq=${current_user.id}`);
    const mine = await res.json();

    // current week: Monday-start (labels M T W T F S S k mutabiq)
    const now = new Date();
    const todayIdx = (now.getDay() + 6) % 7;           // 0 = Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - todayIdx);

    const perDay = Array(7).fill(0);
    let weekSessions = 0, weekVol = 0;

    mine.forEach(w => {
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            d.setHours(12, 0, 0, 0);                  // noon → timezone safe
            if (w.date === d.toISOString().split('T')[0]) {
                perDay[i]++;
                weekSessions++;
                weekVol += workoutVolume(w);
            }
        }
    });

    // cells paint karo: 0 = rest, 1 = l2, 2+ = l4, aaj = outline
    cells.forEach((c, i) => {
        c.className = '';
        if (perDay[i] === 1) c.classList.add('l2');
        if (perDay[i] >= 2) c.classList.add('l4');
        if (i === todayIdx) c.classList.add('today');
    });

    // neeche vaale numbers
    const panel = wkEl.closest('.panel-flat');
    const hvs = panel.querySelectorAll('.hv');
    const hls = panel.querySelectorAll('.hl');
    const goal = parseInt((current_user.trainingDays || '').split('-')[1]) || 5; // onboarding se ("4-5" → 5)
    if (hvs[0]) hvs[0].textContent = weekSessions;
    if (hls[0]) hls[0].textContent = '/ ' + goal + ' sessions';
    if (hvs[1]) hvs[1].textContent = Math.round(weekVol).toLocaleString('en-US');
    if (hls[1]) hls[1].textContent = 'kg volume';
})();