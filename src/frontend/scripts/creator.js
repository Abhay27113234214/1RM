import { logout } from "../../backend/auth.js";
/* ============================================================
Creator profile / journey page — self-contained.
IDs match discover.js cards (c1–c10).
Sections: identity → journey → split → go-to exercises →
latest session → diet → comments.
============================================================ */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ---------- auth guard (same as home) ---------- */
const current_user = JSON.parse(localStorage.getItem('current_user'));
if (!current_user) {
  window.location.href = "http://127.0.0.1:5500/src/frontend/templates/index.html?message=not_logged_in&status=error";
}

/* ---------- dynamic user data (same as home) ---------- */
function dynamic_user_data_replacing() {
  let initials = "";
  current_user.name.trim().split(" ").forEach(spl => initials += spl[0].toUpperCase());
  $$('.current_user_initials').forEach(span => span.innerHTML = initials);
  $$('.current_user_name').forEach(ele =>
    ele.innerHTML = current_user.name.charAt(0).toUpperCase() + current_user.name.slice(1));
  $$('.current_user_username').forEach(ele =>
    ele.innerHTML = `@${current_user.username}`);
}
dynamic_user_data_replacing();

/* ---------- toasts ---------- */
function showToast(message, type = 'ok', duration = 3400) {
  let zone = $('#toastZone');
  if (!zone) {
    zone = document.createElement('div');
    zone.id = 'toastZone';
    zone.className = 'toast-zone';
    document.body.appendChild(zone);
  }
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
      t.classList.add('bye');
      t.style.height = '0px';
      t.style.paddingTop = '0';
      t.style.paddingBottom = '0';
      t.style.marginTop = '-10px';
    });
    setTimeout(() => t.remove(), 500);
  }
  const timer = setTimeout(dismiss, duration);
  t.querySelector('.t-x').addEventListener('click', dismiss);
}

/* ---------- nav / drawer / profile (same as home) ---------- */
const navBar = $('#navBar');
const onScroll = () => navBar.classList.toggle('scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

const io = new IntersectionObserver(es => es.forEach(x => {
  if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); }
}), { threshold: .1 });

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

$$('[data-profile]').forEach(el => el.addEventListener('click', e => {
  e.preventDefault(); closeDrawer();
  // TODO: location.href = 'profile.html';
}));
$$('[data-todo]').forEach(el => el.addEventListener('click', e => {
  e.preventDefault();
  const action = el.dataset.todo;
  if (action === "settings") {
    // TODO: open settings
  } else if (action === "signout") {
    logout();
    window.location.href = "http://127.0.0.1:5500/src/frontend/templates/index.html?message=logged_out&status=success";
  }
}));

/* ============================================================
DATA — journey, split, exercises, diet per creator.
TODO: replace with your API fetch by id.
============================================================ */
const IMG = {
  squat:   'https://image.qwenlm.ai/public_source/ee22d622-2276-4959-8a0e-f65a28451fea/1f41c75e0-9af2-44db-a45c-33950d808340.png',
  runner:  'https://image.qwenlm.ai/public_source/ee22d622-2276-4959-8a0e-f65a28451fea/1c1e9d2c0-5c2a-494d-8a3a-ad39e72ede97.png',
  strong:  'https://image.qwenlm.ai/public_source/ee22d622-2276-4959-8a0e-f65a28451fea/1cf2f6474-1f00-459e-98fc-d3a64e74e45d.png',
  barbell: 'https://image.qwenlm.ai/public_source/ee22d622-2276-4959-8a0e-f65a28451fea/1ca2da95c-b059-4cf3-99ed-e71f92315ded.png'
};
/* split-day colours */
const SC = {
  Push:'#FF4A11', Bench:'#FF4A11', Upper:'#FF4A11',
  Pull:'#3B6FE0', Skills:'#3B6FE0',
  Legs:'#1E9E6A', Glutes:'#1E9E6A', Full:'#1E9E6A', Lift:'#1E9E6A',
  Core:'#D89B0B', Acc:'#D89B0B',
  Cardio:'#D6486F', Run:'#D6486F', Walk:'#D6486F', Long:'#D6486F',
  Rest:null
};
const DAYS = ['M','T','W','T','F','S','S'];

const ALL_CREATORS = [
  {
    id: 'c1', when: '2h', name: 'Maya Chen', handle: '@mayalifts', initials: 'MC', verified: true,
    followers: '12.4k', streak: 18, collabs: 12, spots: 142,
    title: 'Push days, heavy triples, honest logs.', img: IMG.barbell, tag: 'Push',
    stats: { volume: '6,480 kg', time: '52 min', effort: 'RIR 2' },
    warmup: '5 min easy bike · 3 ramp-up sets to opener',
    journey: 'Started in a friend\u2019s garage with a <b>40 kg bench</b> and no plan. Two years of public logs later, the 100 kg bench is one block away — every pause rep recorded here.',
    milestones: [
      { when: '2024', title: 'First session', text: 'Empty bar in a garage. 3 × 8, shaky, hooked forever.' },
      { when: '2025', title: 'First meet', text: '287.5 kg total. Missed the bench PR, learned more than any PR.' },
      { when: '2026', title: 'Went fully public', text: 'Every session open. 12.4k lifters now train alongside.' }
    ],
    split: ['Push','Pull','Legs','Rest','Push','Upper','Rest'],
    splitNote: '<b>5 days</b> · push/pull/legs + upper bonus · rest = walks',
    goTo: [
      { nm: 'Paused Bench',  mt: '3 × 3 · 2s pause', c: '#FF4A11' },
      { nm: 'Overhead Press',mt: '4 × 6',            c: '#D89B0B' },
      { nm: 'Weighted Dips', mt: '3 × 8',            c: '#1E9E6A' },
      { nm: 'Lateral Raise', mt: '4 × 15',           c: '#D6486F' }
    ],
    diet: { kcal: '2,600', protein: '140 g', carbs: '300 g', fat: '80 g', meals: [
      { nm: 'Oats + whey + banana',        mt: '7:30 · 620 kcal',  c: '#D89B0B' },
      { nm: 'Chicken, rice, greens',       mt: '12:30 · 780 kcal', c: '#1E9E6A' },
      { nm: 'Toast + honey + yoghurt',     mt: '16:00 · pre · 420',c: '#FF4A11' },
      { nm: 'Salmon, potatoes, salad',     mt: '20:30 · 780 kcal', c: '#3B6FE0' }
    ]},
    rows: [
      { nm: 'Bench Press',    mt: '5 × 5 · 85 kg',  c: '#FF4A11', pr: true, rest: '2–3 min', rpe: '8', tip: '2s pause on the chest — explode up.' },
      { nm: 'Overhead Press', mt: '4 × 6 · 50 kg',  c: '#D89B0B', rest: '2 min', rpe: '7', tip: 'Squeeze glutes, no lean-back.' },
      { nm: 'Weighted Dips',  mt: '3 × 8 · +15 kg', c: '#1E9E6A', rest: '90 s', rpe: '8', tip: 'Full depth, shoulders packed.' }
    ],
    thread: [
      { who: 'Maya C.',  when: '2h ago',  text: 'Paused bench finally clicked — 2s down, explode up. Adding 2.5 kg Friday.' },
      { who: 'Jonas B.', when: '1h ago',  text: 'That bench grind on set 5 — earned every gram.' },
      { who: 'Priya R.', when: '40m ago', text: 'Stealing this pause protocol for squats.' }
    ]
  },
  {
    id: 'c2', when: '5h', name: 'Jonas Weber', handle: '@jonaspulls', initials: 'JW', verified: false,
    followers: '3.1k', streak: 7, collabs: 4, spots: 38,
    title: 'Deadlift day is the best day.', img: IMG.strong, tag: 'Pull',
    stats: { volume: '5,900 kg', time: '47 min', effort: 'RIR 3' },
    warmup: '3 × 5 light deadlift builds · band pull-aparts',
    journey: 'Office desk job, chronic back pain, <b>zero sport</b> until 2025. Deadlifts fixed the back and became the whole personality. Now pulls twice a week and logs every wedge.',
    milestones: [
      { when: '2025', title: 'First pull', text: '60 kg, rounded as a question mark. Filmed it. Kept it as motivation.' },
      { when: '2025', title: '200 kg club', text: 'Eight months later — triple bodyweight, form finally clean.' },
      { when: '2026', title: 'Pain-free year', text: '12 months, zero back episodes. The log did what the chair did.' }
    ],
    split: ['Pull','Legs','Push','Rest','Pull','Full','Rest'],
    splitNote: '<b>5 days</b> · two pull days (speed + heavy) · full-body Saturday',
    goTo: [
      { nm: 'Deadlift',          mt: '4 × 4',          c: '#FF4A11' },
      { nm: 'Weighted Pull-ups', mt: '4 × 6',          c: '#3B6FE0' },
      { nm: 'Barbell Row',       mt: '4 × 8',          c: '#1E9E6A' },
      { nm: 'Face Pulls',        mt: '3 × 20',         c: '#D6486F' }
    ],
    diet: { kcal: '3,200', protein: '180 g', carbs: '400 g', fat: '90 g', meals: [
      { nm: '4 eggs, sourdough, avocado', mt: '7:00 · 820 kcal',  c: '#D89B0B' },
      { nm: 'Beef, pasta, parmesan',      mt: '13:00 · 980 kcal', c: '#FF4A11' },
      { nm: 'Shake + rice cakes',         mt: '17:00 · pre · 450',c: '#3B6FE0' },
      { nm: 'Chicken, potatoes, broccoli',mt: '21:00 · 850 kcal', c: '#1E9E6A' }
    ]},
    rows: [
      { nm: 'Deadlift',          mt: '4 × 4 · 190 kg', c: '#FF4A11', rest: '3 min', rpe: '7', tip: 'Push the floor, wedge tight.' },
      { nm: 'Weighted Pull-ups', mt: '4 × 6 · +24 kg', c: '#3B6FE0', rest: '2 min', rpe: '8', tip: 'Dead hang every rep.' },
      { nm: 'Barbell Row',       mt: '4 × 8 · 85 kg',  c: '#1E9E6A', rest: '90 s', rpe: '8', tip: 'No torso heave.' }
    ],
    thread: [
      { who: 'Jonas W.', when: '5h ago', text: 'RPE 7 across. Top sets moved fast — going heavier next week.' },
      { who: 'Maya C.',  when: '3h ago', text: 'Pulls looking smooth from here.' }
    ]
  },
  {
    id: 'c3', when: '8h', name: 'Priya Raman', handle: '@priya.sq', initials: 'PR', verified: true,
    followers: '8.9k', streak: 31, collabs: 9, spots: 215,
    title: 'Squat nerd. 31-day streak and counting.', img: IMG.squat, tag: 'Legs',
    stats: { volume: '7,200 kg', time: '58 min', effort: 'RIR 1' },
    warmup: 'Empty-bar squats × 10 · 3 builds to opener',
    journey: 'Runner who avoided the rack for years. One beginner squat block changed the sport. Now squats <b>three times a week</b> and films every top set for the log.',
    milestones: [
      { when: '2024', title: 'Left the treadmill', text: 'First barbell squat: 40 kg, high as a hop.' },
      { when: '2025', title: '100 kg squat', text: 'The day the streak started. Hasn\u2019t broken since.' },
      { when: '2026', title: '112.5 kg PR', text: 'Depth checked by three coaches. Video in the feed.' }
    ],
    split: ['Legs','Push','Pull','Legs','Rest','Full','Rest'],
    splitNote: '<b>5 days</b> · two squat days (volume + heavy) · legs again Saturday',
    goTo: [
      { nm: 'Back Squat',            mt: '5 × 3',  c: '#FF4A11' },
      { nm: 'Romanian Deadlift',     mt: '3 × 8',  c: '#1E9E6A' },
      { nm: 'Bulgarian Split Squat', mt: '3 × 10', c: '#3B6FE0' },
      { nm: 'Calf Raise',            mt: '4 × 15', c: '#D89B0B' }
    ],
    diet: { kcal: '2,400', protein: '130 g', carbs: '280 g', fat: '70 g', meals: [
      { nm: 'Idli + sambar + eggs',      mt: '8:00 · 560 kcal',  c: '#D89B0B' },
      { nm: 'Dal, rice, ghee, salad',    mt: '13:00 · 720 kcal', c: '#1E9E6A' },
      { nm: 'Fruit + peanut butter',     mt: '17:00 · pre · 380',c: '#FF4A11' },
      { nm: 'Paneer tikka + roti',       mt: '20:30 · 680 kcal', c: '#3B6FE0' }
    ]},
    rows: [
      { nm: 'Back Squat',            mt: '5 × 3 · 112.5 kg', c: '#FF4A11', pr: true, rest: '3 min', rpe: '8', tip: 'Big breath, brace hard.' },
      { nm: 'Romanian Deadlift',     mt: '3 × 8 · 100 kg',   c: '#1E9E6A', rest: '2 min', rpe: '7', tip: 'Hips back, flat back.' },
      { nm: 'Bulgarian Split Squat', mt: '3 × 10 · 22 kg',   c: '#3B6FE0', rest: '75 s', rpe: '9', tip: 'Upright torso, slow down.' }
    ],
    thread: [
      { who: 'Priya R.', when: '8h ago', text: '112.5 moved like 95 — film every top set, future me says thanks.' },
      { who: 'Elena V.', when: '6h ago', text: 'Textbook bar path. Proud of this one.' },
      { who: 'Tomás S.', when: '2h ago', text: 'The streak stays alive ✱' }
    ]
  },
  {
    id: 'c4', when: 'Mon', name: 'Coach Elena Voss', handle: '@elenavoss', initials: 'EV', verified: true,
    followers: '124k', streak: 64, collabs: 31, spots: 412,
    title: 'Programming that actually works.', img: IMG.barbell, tag: 'Coach',
    stats: { volume: '6,100 kg', time: '55 min', effort: 'RIR 2' },
    warmup: 'Wrist + shoulder prep · 2 ramp-ups per lift',
    journey: '10 years coaching, <b>400+ lifters</b> from first squat to first meet. Publishes her own training exactly as she prescribes it — same RPE, same deloads, no secrets.',
    milestones: [
      { when: '2016', title: 'First gym job', text: 'Sweeping floors, watching coaches, stealing notes.' },
      { when: '2021', title: 'Head coach', text: 'Built the strength department, 60 athletes a season.' },
      { when: '2023', title: 'Went online', text: 'Started publishing every block. 124k lifters now follow along.' }
    ],
    split: ['Push','Pull','Legs','Push','Pull','Legs','Rest'],
    splitNote: '<b>6-day PPL</b> · the exact template she sells · deload every 4th week',
    goTo: [
      { nm: 'Bench Press',    mt: '4 × 6 · @80%', c: '#FF4A11' },
      { nm: 'Overhead Press', mt: '4 × 8 · @75%', c: '#D89B0B' },
      { nm: 'Weighted Dips',  mt: '3 × 8',        c: '#1E9E6A' },
      { nm: 'Lateral Raise',  mt: '4 × 15',       c: '#D6486F' }
    ],
    diet: { kcal: '2,800', protein: '150 g', carbs: '320 g', fat: '80 g', meals: [
      { nm: 'Greek yoghurt + granola',   mt: '7:00 · 540 kcal',  c: '#D89B0B' },
      { nm: 'Turkey bowl + rice',        mt: '12:30 · 760 kcal', c: '#1E9E6A' },
      { nm: 'Espresso + banana',         mt: '16:30 · pre · 220',c: '#FF4A11' },
      { nm: 'Steak, potatoes, greens',   mt: '20:00 · 820 kcal', c: '#3B6FE0' }
    ]},
    rows: [
      { nm: 'Bench Press',    mt: '4 × 6 · @80%',   c: '#FF4A11', rest: '2–3 min', rpe: '8', tip: 'Bar path over mid-foot.' },
      { nm: 'Overhead Press', mt: '4 × 8 · @75%',   c: '#D89B0B', rest: '2 min', rpe: '7', tip: 'Ribs down, glutes tight.' },
      { nm: 'Weighted Dips',  mt: '3 × 8 · +20 kg', c: '#1E9E6A', rest: '90 s', rpe: '8', tip: 'Elbows in, lean slightly.' }
    ],
    thread: [
      { who: 'Elena V.',  when: 'Mon', text: 'Week 3 of 8 — RPE 7–8, no grinders. Volume drops in the deload.' },
      { who: 'Marcus I.', when: 'Sun', text: 'Ran this with my group — it works.' }
    ]
  },
  {
    id: 'c5', when: 'Tue', name: 'Tomás Silva', handle: '@tomascore', initials: 'TS', verified: false,
    followers: '940', streak: 4, collabs: 2, spots: 12,
    title: 'Small account, big engines.', img: IMG.runner, tag: 'Core',
    stats: { volume: '1,150 kg', time: '40 min', effort: 'Zone 2' },
    warmup: '5 min brisk walk · wrist mobility',
    journey: 'Ex-smoker, winded by stairs in 2024. Built the engine with <b>zone-2 only</b> for six months before adding intensity. Now sub-25 5K on three hard sessions a week.',
    milestones: [
      { when: '2024', title: 'Quit smoking', text: 'First "run": 9 minutes, mostly walking. Logged anyway.' },
      { when: '2025', title: 'First 10K', text: '58:04. Cried at the finish, logged the splits at home.' },
      { when: '2026', title: 'Sub-25 5K', text: '24:30 tempo. The zone-2 base did the quiet work.' }
    ],
    split: ['Core','Run','Rest','Core','Run','Long','Rest'],
    splitNote: '<b>5 days</b> · core before runs · long run Saturdays, always zone 2',
    goTo: [
      { nm: 'Ab Wheel',          mt: '4 × 12', c: '#D89B0B' },
      { nm: 'Hanging Leg Raise', mt: '3 × 12', c: '#FF4A11' },
      { nm: '5K Run',            mt: 'tempo',  c: '#D6486F' },
      { nm: 'Rowing',            mt: '4 × 500',c: '#3B6FE0' }
    ],
    diet: { kcal: '2,500', protein: '120 g', carbs: '340 g', fat: '70 g', meals: [
      { nm: 'Porridge + berries',        mt: '7:00 · 480 kcal',  c: '#D89B0B' },
      { nm: 'Chicken wrap + fruit',      mt: '12:30 · 680 kcal', c: '#1E9E6A' },
      { nm: 'Coffee + toast + jam',      mt: '17:00 · pre · 300',c: '#FF4A11' },
      { nm: 'Fish, rice, roasted veg',   mt: '20:30 · 720 kcal', c: '#3B6FE0' }
    ]},
    rows: [
      { nm: 'Ab Wheel',          mt: '4 × 12',        c: '#D89B0B', rest: '60 s', rpe: '8', tip: 'No sagging hips.' },
      { nm: 'Hanging Leg Raise', mt: '3 × 12',        c: '#FF4A11', rest: '60 s', rpe: '8', tip: 'Curl the pelvis, not just the knees.' },
      { nm: '5K Run',            mt: '24:30 · tempo', c: '#D6486F', rest: '—', rpe: '6', tip: 'Nose-breathing pace, no heroics.' }
    ],
    thread: [
      { who: 'Tomás S.', when: 'Tue', text: 'Zone 2 the whole way. Nose-breathing pace, no heroics.' },
      { who: 'Nia O.',   when: 'Mon', text: 'Pace discipline — respect it.' }
    ]
  },
  {
    id: 'c6', when: 'Wed', name: 'Sana Fit', handle: '@sanafit', initials: 'SF', verified: true,
    followers: '210k', streak: 45, collabs: 21, spots: 864,
    title: 'No gym? No problem.', img: IMG.barbell, tag: 'Home',
    stats: { volume: '3,860 kg', time: '41 min', effort: 'RIR 2' },
    warmup: '2 min jump rope · hip openers',
    journey: 'Built a <b>210k community</b> from a 4 m² living room and one pair of dumbbells. Proves progressive overload needs a log, not a membership.',
    milestones: [
      { when: '2023', title: 'First video', text: 'Dumbbell squats between the sofa and the plant. 400 views.' },
      { when: '2024', title: '100k', text: 'The "no rack, no problem" series went wide.' },
      { when: '2026', title: 'Home-gym guide', text: 'Published the full minimal-equipment program, free.' }
    ],
    split: ['Full','Full','Rest','Full','Full','Rest','Walk'],
    splitNote: '<b>4 full-body days</b> · 40 min each · Sunday = long walk, no timer',
    goTo: [
      { nm: 'Goblet Squat',  mt: '4 × 12', c: '#1E9E6A' },
      { nm: 'DB RDL',        mt: '4 × 10', c: '#FF4A11' },
      { nm: 'DB Bench',      mt: '4 × 10', c: '#3B6FE0' },
      { nm: 'DB Row',        mt: '4 × 10', c: '#D89B0B' }
    ],
    diet: { kcal: '2,100', protein: '120 g', carbs: '240 g', fat: '65 g', meals: [
      { nm: 'Smoothie + eggs',           mt: '8:00 · 520 kcal',  c: '#D89B0B' },
      { nm: 'Lentil bowl + greens',      mt: '13:00 · 640 kcal', c: '#1E9E6A' },
      { nm: 'Apple + almonds',           mt: '16:30 · 260 kcal', c: '#FF4A11' },
      { nm: 'Tofu stir-fry + rice',      mt: '20:00 · 620 kcal', c: '#3B6FE0' }
    ]},
    rows: [
      { nm: 'Goblet Squat',  mt: '4 × 12 · 24 kg',     c: '#1E9E6A', rest: '75 s', rpe: '7', tip: 'Elbows inside knees.' },
      { nm: 'DB RDL',        mt: '4 × 10 · 2 × 16 kg', c: '#FF4A11', rest: '90 s', rpe: '8', tip: 'Brush the thighs.' },
      { nm: 'Walking Lunge', mt: '3 × 12 · 2 × 10 kg', c: '#3B6FE0', rest: '60 s', rpe: '8', tip: 'Long strides, tall chest.' }
    ],
    thread: [
      { who: 'Sana F.', when: 'Wed', text: 'No rack, no problem. 40 minutes, one pair of dumbbells.' },
      { who: 'Ava S.',  when: 'Tue', text: 'Doing this one Friday.' }
    ]
  },
  {
    id: 'c7', when: 'last week', name: 'Marcus Iron', handle: '@marcusiron', initials: 'MI', verified: true,
    followers: '86.5k', streak: 22, collabs: 15, spots: 320,
    title: 'Bench specialization is a lifestyle.', img: IMG.barbell, tag: 'Bench',
    stats: { volume: '5,400 kg', time: '49 min', effort: 'RIR 2' },
    warmup: '2 × 10 push-ups · 3 ramp-ups',
    journey: 'Benched <b>4 times a week</b> for 3 years. Frequency over fashion: volume first, intensity later, ego last. 60 kg → 140 kg bench, documented set by set.',
    milestones: [
      { when: '2023', title: 'The stuck point', text: '100 kg for 14 months. Rewrote everything around frequency.' },
      { when: '2024', title: '120 kg', text: 'Four bench days a week. The boring plan worked.' },
      { when: '2026', title: '140 kg', text: 'Three-year project closed. Next: 150.' }
    ],
    split: ['Bench','Acc','Bench','Rest','Bench','Push','Rest'],
    splitNote: '<b>4 bench days</b> · heavy / speed / volume / accessory rotation',
    goTo: [
      { nm: 'Close-grip Bench', mt: '5 × 5',  c: '#FF4A11' },
      { nm: 'JM Press',         mt: '3 × 10', c: '#D89B0B' },
      { nm: 'Weighted Dips',    mt: '4 × 8',  c: '#1E9E6A' },
      { nm: 'Chest Fly',        mt: '3 × 12', c: '#3B6FE0' }
    ],
    diet: { kcal: '3,400', protein: '190 g', carbs: '420 g', fat: '95 g', meals: [
      { nm: 'Protein oats + whole eggs',  mt: '7:00 · 850 kcal',  c: '#D89B0B' },
      { nm: 'Double chicken rice bowl',   mt: '13:00 · 1,050',    c: '#FF4A11' },
      { nm: 'Shake + bagel + honey',      mt: '17:00 · pre · 600',c: '#3B6FE0' },
      { nm: 'Beef, mash, buttered peas',  mt: '21:00 · 900 kcal', c: '#1E9E6A' }
    ]},
    rows: [
      { nm: 'Close-grip Bench', mt: '5 × 5 · 100 kg', c: '#FF4A11', pr: true, rest: '2–3 min', rpe: '8', tip: 'Elbows tucked, bar low on chest.' },
      { nm: 'Weighted Dips',    mt: '4 × 8 · +20 kg', c: '#1E9E6A', rest: '2 min', rpe: '8', tip: 'Upright torso for triceps.' },
      { nm: 'JM Press',         mt: '3 × 10 · 40 kg', c: '#D89B0B', rest: '90 s', rpe: '8', tip: 'Control the descent.' }
    ],
    thread: [
      { who: 'Marcus I.', when: 'last week', text: 'Benching often beats benching sometimes. Volume first, intensity later.' },
      { who: 'Leo P.',    when: 'last week', text: 'Those triples flew.' }
    ]
  },
  {
    id: 'c8', when: 'last week', name: 'Leo Park', handle: '@leopark', initials: 'LP', verified: false,
    followers: '12.4k', streak: 40, collabs: 6, spots: 95,
    title: 'Skills before sets.', img: IMG.strong, tag: 'Skills',
    stats: { volume: '2,300 kg', time: '44 min', effort: 'RIR 3' },
    warmup: '10 min wrist + shoulder prep · dead hangs',
    journey: 'Gymnast kid who lost the sport, found the bars again at 24. Trains <b>skills fresh, strength after</b> — nothing to failure, everything filmed in slow-mo.',
    milestones: [
      { when: '2024', title: 'First muscle-up', text: 'After 11 weeks of transitions. The video is pinned.' },
      { when: '2025', title: 'Front lever', text: 'Full lever, 3s hold, straddle rows after.' },
      { when: '2026', title: 'Planche year', text: 'Current block: advanced tuck, 15s cumulative.' }
    ],
    split: ['Skills','Pull','Push','Rest','Skills','Pull','Rest'],
    splitNote: '<b>5 days</b> · skill work first, 20 min max · strength after, RPE 7',
    goTo: [
      { nm: 'Muscle-ups',        mt: '5 × 3',  c: '#FF4A11' },
      { nm: 'Front Lever Rows',  mt: '4 × 6',  c: '#1E9E6A' },
      { nm: 'Weighted Pull-ups', mt: '4 × 5',  c: '#3B6FE0' },
      { nm: 'Ring Dips',         mt: '3 × 8',  c: '#D89B0B' }
    ],
    diet: { kcal: '2,700', protein: '150 g', carbs: '330 g', fat: '75 g', meals: [
      { nm: 'Congee + eggs',             mt: '7:30 · 560 kcal',  c: '#D89B0B' },
      { nm: 'Bibimbap bowl',             mt: '12:30 · 780 kcal', c: '#1E9E6A' },
      { nm: 'Banana + black coffee',     mt: '16:30 · pre · 200',c: '#FF4A11' },
      { nm: 'Grilled fish + noodles',    mt: '20:00 · 760 kcal', c: '#3B6FE0' }
    ]},
    rows: [
      { nm: 'Muscle-ups',        mt: '5 × 3',          c: '#FF4A11', rest: '2–3 min', rpe: '7', tip: 'Low hips, fast transition.' },
      { nm: 'Weighted Pull-ups', mt: '4 × 5 · +32 kg', c: '#3B6FE0', rest: '2 min', rpe: '8', tip: 'Full hang, no kipping.' },
      { nm: 'Front Lever Rows',  mt: '4 × 6 · tuck',   c: '#1E9E6A', rest: '90 s', rpe: '8', tip: 'Straight arms out of the bottom.' }
    ],
    thread: [
      { who: 'Leo P.', when: 'last week', text: 'Fresh nervous system, nothing to failure.' }
    ]
  },
  {
    id: 'c9', when: 'last week', name: 'Ava Strong', handle: '@avastrong', initials: 'AS', verified: false,
    followers: '18.9k', streak: 12, collabs: 8, spots: 184,
    title: 'Heavy days, honest logs.', img: IMG.squat, tag: 'Glutes',
    stats: { volume: '6,050 kg', time: '51 min', effort: 'RIR 1' },
    warmup: '5 min incline walk · 2 glute bridges × 15',
    journey: 'Post-injury rebuild after an ACL tear. Hip thrusts went from <b>rehab to 140 kg</b>. Logs every session with pain scores, not just kilos.',
    milestones: [
      { when: '2024', title: 'The injury', text: 'ACL, month 0. Could not do a bodyweight bridge.' },
      { when: '2025', title: 'Cleared to lift', text: 'First loaded hip thrust: 60 kg, shaking, smiling.' },
      { when: '2026', title: '140 kg thrust', text: 'Heavier than pre-injury. Pain score: 0.' }
    ],
    split: ['Glutes','Pull','Rest','Legs','Push','Glutes','Rest'],
    splitNote: '<b>5 days</b> · two glute-focused days · single-leg work every session',
    goTo: [
      { nm: 'Hip Thrust',     mt: '4 × 10', c: '#FF4A11' },
      { nm: 'B-stance RDL',   mt: '3 × 8',  c: '#1E9E6A' },
      { nm: 'Cable Kickback', mt: '3 × 15', c: '#D6486F' },
      { nm: 'Walking Lunge',  mt: '3 × 12', c: '#3B6FE0' }
    ],
    diet: { kcal: '2,300', protein: '140 g', carbs: '250 g', fat: '70 g', meals: [
      { nm: 'Protein pancakes',          mt: '8:00 · 540 kcal',  c: '#D89B0B' },
      { nm: 'Chicken caesar (no crout)', mt: '13:00 · 660 kcal', c: '#1E9E6A' },
      { nm: 'Rice cakes + cottage cheese',mt:'16:30 · pre · 320',c: '#FF4A11' },
      { nm: 'Steak + sweet potato',      mt: '20:00 · 720 kcal', c: '#3B6FE0' }
    ]},
    rows: [
      { nm: 'Hip Thrust',     mt: '4 × 10 · 140 kg', c: '#FF4A11', pr: true, rest: '2 min', rpe: '9', tip: 'Posterior tilt at the top.' },
      { nm: 'B-stance RDL',   mt: '3 × 8 · 40 kg',   c: '#1E9E6A', rest: '90 s', rpe: '8', tip: '80/20 weight distribution.' },
      { nm: 'Cable Kickback', mt: '3 × 15 · 25 kg',  c: '#D6486F', rest: '60 s', rpe: '9', tip: 'Slow out, slower back.' }
    ],
    thread: [
      { who: 'Ava S.',  when: 'last week', text: 'PR attempt Friday — who wants to collab and load plates?' },
      { who: 'Sana F.', when: 'last week', text: 'Say less. I\u2019m there.' }
    ]
  },
  {
    id: 'c10', when: 'last week', name: 'Nia Okafor', handle: '@niaokafor', initials: 'NO', verified: true,
    followers: '22k', streak: 29, collabs: 11, spots: 210,
    title: 'Lift heavy, run far, recover properly.', img: IMG.runner, tag: 'Cardio',
    stats: { volume: '6.4 km', time: '58 min', effort: 'Zone 2–4' },
    warmup: '8 min easy jog · 4 strides',
    journey: 'Hybrid athlete: <b>sub-23 5K and a 140 kg deadlift</b> in the same season. Preaches the boring middle — zone 2 miles, heavy singles, actual sleep.',
    milestones: [
      { when: '2024', title: 'Chose both', text: 'Told to pick lifting or running. Picked the log instead.' },
      { when: '2025', title: 'First hybrid meet', text: '5K in the morning, deadlift PR in the evening. 135 kg.' },
      { when: '2026', title: '140 / sub-23', text: 'The two-number resume, updated.' }
    ],
    split: ['Run','Lift','Run','Rest','Lift','Long','Rest'],
    splitNote: '<b>5 days</b> · runs easy, lifts heavy · long run never races the watch',
    goTo: [
      { nm: '5K Run',       mt: 'tempo',   c: '#D6486F' },
      { nm: 'Deadlift',     mt: '3 × 5',   c: '#FF4A11' },
      { nm: 'Rowing',       mt: '4 × 500', c: '#3B6FE0' },
      { nm: 'Incline Walk', mt: 'zone 2',  c: '#1E9E6A' }
    ],
    diet: { kcal: '2,900', protein: '160 g', carbs: '380 g', fat: '80 g', meals: [
      { nm: 'Jollof + grilled chicken',  mt: '12:00 · 820 kcal', c: '#FF4A11' },
      { nm: 'Yoghurt + honey + nuts',    mt: '8:00 · 520 kcal',  c: '#D89B0B' },
      { nm: 'Trail mix + electrolytes',  mt: '16:00 · run · 300',c: '#D6486F' },
      { nm: 'Fish + yam + greens',       mt: '20:30 · 780 kcal', c: '#1E9E6A' }
    ]},
    rows: [
      { nm: '5K Run',       mt: '22:48 · tempo PR', c: '#D6486F', pr: true, rest: '—', rpe: '8', tip: 'Negative split — hold back early.' },
      { nm: 'Rowing',       mt: '4 × 500 m',        c: '#3B6FE0', rest: '90 s', rpe: '7', tip: 'Legs, body, arms. Every stroke.' },
      { nm: 'Incline Walk', mt: '20 min · zone 2',  c: '#1E9E6A', rest: '—', rpe: '5', tip: 'Nose breathing only.' }
    ],
    thread: [
      { who: 'Nia O.', when: 'last week', text: 'The engine is built in zone 2, proven on race day.' }
    ]
  }
];

const findCreator = id => ALL_CREATORS.find(c => c.id === id);

/* ============================================================
READ ?id= AND RENDER THE FULL PROFILE / JOURNEY
============================================================ */
const id = new URLSearchParams(location.search).get('id');
const c  = findCreator(id);
const following = new Set();

if (!c) {
  $('#detailCol').innerHTML = `
    <div class="w-empty">
      <b>Profile <span>not found</span> ✱</b>
      This creator doesn't exist or isn't public anymore.
      <br><a class="back-btn" href="discover.html"><span class="arr">←</span> Back to Discover</a>
    </div>`;
} else {
  document.title = '1RM ✱ ' + c.name + ' — journey';
  $('#crumb').textContent = c.handle + ' · journey';

  /* ---------- 1 · identity header card ---------- */
  const header = `
    <div class="post-shell reveal">
      <article class="post detail">
        <div class="p-head">
          <span class="av lg">${c.initials}</span>
          <div class="p-who">
            <div class="p-name">${c.name}${c.verified ? '<i class="vbadge" title="Verified">✱</i>' : ''}</div>
            <div class="p-meta">${c.handle} · ${c.followers} followers · on 1RM since ${c.milestones[0].when}</div>
          </div>
          <span class="streak">✱ ${c.streak}-day streak</span>
        </div>
        <h3 class="p-title">${c.title}</h3>
        <div class="p-img">
          <img src="${c.img}" alt="${c.name} training" loading="lazy">
          <span class="img-tag">✱ <b>${c.tag}</b></span>
        </div>
        <div class="p-foot">
          <span><b>${c.followers}</b> followers</span>
          <span><b>${c.collabs}</b> collabs</span>
          <span><b>${c.spots}</b> spots</span>
        </div>
        <div class="p-acts">
          <button class="act" data-action="spot"><span class="st">✱</span>Spot · <span data-count>${c.spots}</span></button>
          <button class="act" data-action="follow" data-follow-id="${c.handle}">
            <span class="st">✱</span><span class="lb">Follow</span>
          </button>
          <button class="act" data-action="collab" data-name="${c.name}">
            <span class="st">✱</span><span class="lb">Collab</span> · <b data-count>${c.collabs}</b>
          </button>
          <button class="act share" data-action="share"><span class="lb">Share</span></button>
        </div>
      </article>
    </div>`;

  /* ---------- 2 · the journey ---------- */
  const journey = `
    <div class="day-sep">The journey</div>
    <div class="panel-flat reveal">
      <div class="r-h">How it started → how it's going</div>
      <p class="j-text">${c.journey}</p>
      <div class="tl">
        ${c.milestones.map(m => `
          <div class="tl-item">
            <div class="tl-when">${m.when}</div>
            <div class="tl-title">${m.title}</div>
            <div class="tl-text">${m.text}</div>
          </div>`).join('')}
      </div>
    </div>`;

  /* ---------- 3 · training split ---------- */
  const todayIdx = (new Date().getDay() + 6) % 7; // Mon = 0
  const split = `
    <div class="day-sep">Training split</div>
    <div class="panel-flat reveal">
      <div class="r-h">A typical week</div>
      <div class="split">
        ${c.split.map((s, i) => `
          <div class="sp-day${s === 'Rest' ? ' rest' : ''}${i === todayIdx ? ' today' : ''}" style="--sc:${SC[s] || 'var(--muted)'}">
            <span class="d">${DAYS[i]}</span>
            <span class="t">${s}</span>
          </div>`).join('')}
      </div>
      <p class="sp-note">${c.splitNote}</p>
    </div>`;

  /* ---------- 4 · go-to exercises ---------- */
  const goTo = `
    <div class="day-sep">Go-to exercises</div>
    <div class="panel-flat reveal">
      <div class="r-h">What ${c.name.split(' ')[0]} actually trains</div>
      <div class="p-rows" style="margin-top:0">
        ${c.goTo.map(r => `
          <div class="p-row" style="--c:${r.c}">
            <span class="nm">${r.nm}</span>
            <span class="mt">${r.mt}</span>
          </div>`).join('')}
      </div>
    </div>`;

  /* ---------- 5 · latest session (tap rows for details) ---------- */
  const session = `
    <div class="day-sep">Latest session</div>
    <div class="panel-flat reveal">
      <div class="r-h">${c.when} ago · tap a lift for the cues</div>
      <div class="p-rows" style="margin-top:0">
        ${c.rows.map((r, i) => `
          <div class="x-item">
            <button class="p-row${r.pr ? ' pr' : ''}" style="--c:${r.c}" data-action="expand" aria-expanded="false">
              <span class="nm">${r.nm}</span>
              <span class="mt">${r.pr ? '<b class="pr-tag">PR</b> ' : ''}${r.mt}
                <span class="x-chev">+</span>
              </span>
            </button>
            <div class="x-more" hidden>
              <div class="x-foot">
                <span>sets <b>${r.mt.split('·')[0].trim()}</b></span>
                <span>rest <b>${r.rest}</b></span>
                <span>effort <b>RPE ${r.rpe}</b></span>
              </div>
              <p class="x-tip"><b>Coach cue</b>"${r.tip}"</p>
            </div>
          </div>`).join('')}
      </div>
      <div class="p-comment" style="margin-top:14px"><b>Warm-up</b>"${c.warmup}"</div>
      <div class="p-foot">
        <span>volume <b>${c.stats.volume}</b></span>
        <span>time <b>${c.stats.time}</b></span>
        <span>effort <b>${c.stats.effort}</b></span>
      </div>
    </div>`;

  /* ---------- 6 · diet ---------- */
  const diet = `
    <div class="day-sep">Diet · a typical day</div>
    <div class="panel-flat reveal">
      <div class="r-h">Fuel</div>
      <div class="p-foot m-foot">
        <span><b>${c.diet.kcal}</b> kcal</span>
        <span><b>${c.diet.protein}</b> protein</span>
        <span><b>${c.diet.carbs}</b> carbs</span>
        <span><b>${c.diet.fat}</b> fat</span>
      </div>
      <div class="p-rows">
        ${c.diet.meals.map(m => `
          <div class="p-row" style="--c:${m.c}">
            <span class="nm">${m.nm}</span>
            <span class="mt">${m.mt}</span>
          </div>`).join('')}
      </div>
    </div>`;

  /* ---------- 7 · comments ---------- */
  const comments = `
    <div class="day-sep" id="cmtSep">Comments · ${c.thread.length}</div>
    <div class="c-list" id="commentList">
      ${c.thread.map(m => `<div class="p-comment reveal"><b>${m.who} · ${m.when}</b>"${m.text}"</div>`).join('')}
    </div>
    <div class="p-cbox">
      <input type="text" id="cmtInput" placeholder="Say something nice…">
      <button class="btn-primary" data-action="post">Post</button>
    </div>`;

  $('#detailCol').innerHTML = header + journey + split + goTo + session + diet + comments;

  /* ---------- rail ---------- */
  const others = ALL_CREATORS.filter(x => x.id !== c.id).slice(0, 4);
  $('#rail').innerHTML = `
    <div class="panel-flat reveal">
      <div class="r-h">More public lifters</div>
      ${others.map(o => `
        <div class="f-row">
          <span class="av sm">${o.initials}</span>
          <div class="f-id">
            <div class="f-nm">${o.name}</div>
            <div class="f-hd">${o.handle} · ${o.followers}</div>
          </div>
          <button class="f-btn" data-action="follow" data-follow-id="${o.handle}">Follow</button>
        </div>`).join('')}
    </div>
    <div class="panel-flat reveal">
      <div class="r-h">Journey pulse</div>
      <div class="hs-row">
        <div><div class="hv">${c.milestones.length}</div><div class="hl">milestones</div></div>
        <div><div class="hv">${c.split.filter(s => s !== 'Rest').length}</div><div class="hl">days / week</div></div>
      </div>
    </div>
    <div class="rail-foot">✱ <b>1RM</b> — only public profiles appear here.</div>`;

  $$('.reveal').forEach(el => io.observe(el));
}

/* ---------- follow sync ---------- */
function syncFollow(handle, on) {
  $$('[data-follow-id="' + handle + '"]').forEach(btn => {
    btn.classList.toggle('on', on);
    if (btn.classList.contains('f-btn')) {
      btn.textContent = on ? 'Following' : 'Follow';
    } else {
      const lb = btn.querySelector('.lb');
      if (lb) lb.textContent = on ? 'Following' : 'Follow';
    }
  });
}

/* ---------- actions ---------- */
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === 'expand') {
    const item = btn.closest('.x-item');
    const more = item.querySelector('.x-more');
    const open = item.classList.toggle('open');
    more.hidden = !open;
    btn.setAttribute('aria-expanded', open);
  }
  else if (action === 'spot') {
    const on = btn.classList.toggle('on');
    const n = btn.querySelector('[data-count]');
    if (n) n.textContent = (+n.textContent) + (on ? 1 : -1);
    if (on) showToast('Spotted ' + (c ? c.name : '') + ' ✱');
  }
  else if (action === 'follow') {
    const handle = btn.dataset.followId;
    const on = !following.has(handle);
    on ? following.add(handle) : following.delete(handle);
    syncFollow(handle, on);
    if (on) showToast('Following ' + handle + ' ✱');
    // TODO: follow endpoint
  }
  else if (action === 'collab') {
    const on = btn.classList.toggle('on');
    const n = btn.querySelector('[data-count]');
    if (n) n.textContent = (+n.textContent) + (on ? 1 : -1);
    if (on) showToast('Collab request sent to ' + btn.dataset.name + ' ✱');
    // TODO: collab endpoint
  }
  else if (action === 'post') {
    const input = $('#cmtInput');
    if (!input || !input.value.trim()) { showToast('Write something first ✱', 'error'); return; }
    const list = $('#commentList');
    const el = document.createElement('div');
    el.className = 'p-comment reveal in';
    el.innerHTML = '<b>' + current_user.name + ' · just now</b>"' + input.value.trim() + '"';
    list.prepend(el);
    $('#cmtSep').textContent = 'Comments · ' + list.children.length;
    input.value = '';
    showToast('Comment posted ✱');
    // TODO: comment endpoint
  }
  else if (action === 'share') {
    if (navigator.clipboard) navigator.clipboard.writeText(location.href).catch(() => {});
    showToast('Profile link copied ✱');
  }
});

/* ---------- rail → mobile carousel dots ---------- */
const railEl = document.querySelector('.home .rail');
if (railEl) {
  const slides = Array.from(railEl.children).filter(x => !x.classList.contains('rail-foot'));
  const railDots = document.querySelector('.rail-dots');
  if (railDots) {
    slides.forEach(() => railDots.appendChild(document.createElement('i')));
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
}