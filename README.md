# 1RM ✱ The Minimal Workout Log

**Track every set. Log every session. Never lose your numbers.**

1RM is a lightweight strength-training log built with plain HTML, CSS, and JavaScript on the frontend, and a [json-server](https://github.com/typicode/json-server) REST API on the backend. Sign up, pick exercises from a built-in catalogue of 200+ movements, log your sets and reps, and browse your training history — no frameworks, no build step, no bloat.

---

## Table of Contents

- [What this app does](#what-this-app-does)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [How the app is wired together](#how-the-app-is-wired-together)
- [Pages, one by one](#pages-one-by-one)
- [The data model](#the-data-model)
- [Roadmap: the progressive overload engine](#roadmap-the-progressive-overload-engine)
- [Contributing](#contributing)
- [License](#license)

---

## What this app does

1RM lets a lifter:

- **Create an account** and complete a short onboarding flow (goals, experience level, body measurements).
- **Log a workout session** — pick an exercise from a searchable catalogue, record sets of weight × reps (or bodyweight reps, duration, or distance, depending on the exercise type), add notes/photos, and save the session.
- **See a home feed** of recent sessions from the current day and browse past activity.
- **Discover exercises** by muscle group and equipment type.
- **View a profile** with stats, past sessions, and account settings.

It's currently a **Phase 1 build**: the logging, authentication, and browsing flows are functional. The **auto-progression engine** (the part that looks at your last session and decides your next target) is the next milestone — see the [Roadmap](#roadmap-the-progressive-overload-engine) section below.

---

## Tech stack

| Layer         | Technology                                                              |
|---------------|---------------------------------------------------------------------------|
| Frontend      | Vanilla JavaScript (ES Modules), HTML5, CSS3 — no framework, no bundler |
| Backend / API | [json-server](https://github.com/typicode/json-server) serving `db.json` as a REST API |
| Persistence   | `db.json` (server-side "database") + browser `localStorage` (session state, e.g. the workout currently being logged) |

There is intentionally no React/Vue/webpack in this project — every script is loaded directly in the browser via `<script type="module">`, which is why you need to serve the files over `http://` rather than opening them as local `file://` files (see [Getting started](#getting-started)).

---

## Project structure

```
1RM/
├── db.json                    # json-server database: users, workouts, exercises
├── README.md
└── src/
    ├── backend/
    │   ├── auth.js             # login / register / logout (talks to json-server)
    │   └── measures.js         # saves onboarding measurements to a user's profile
    └── frontend/
        ├── templates/          # one .html file per page
        │   ├── index.html      #  landing page + login/signup + onboarding
        │   ├── home.html       #  feed / dashboard after login
        │   ├── workout.html    #  the workout logging screen
        │   ├── discover.html   #  browse the exercise catalogue
        │   ├── creator.html    #  community / creator profiles
        │   └── profile.html    #  the logged-in user's profile
        ├── scripts/             # one .js file per page (ES module, matches template name)
        └── styles/               # one .css file per page (matches template name)
```

Each page follows the same **template / script / style** naming convention — for example, `workout.html` is powered by `workout.js` and styled by `workout.css`. If you want to change a page, all three files live under the same name.

---

## Prerequisites

You need two things installed before you start:

1. **[Node.js](https://nodejs.org/)** (v18 or later recommended) — this gives you `npm`/`npx`, which we use to run the API server.
2. **A way to serve static files locally.** Because the frontend uses ES modules (`<script type="module">`), the browser will block it if you just double-click `index.html`. Any of these work:
   - The **Live Server** extension in VS Code (easiest if you use VS Code), or
   - `npx serve` / `npx http-server`, or
   - Python's built-in server (`python3 -m http.server`).

No other accounts, API keys, or paid services are required — everything runs on your machine.

---

## Getting started

### 1. Clone the repository

```bash
git clone https://github.com/Abhay27113234214/1RM.git
cd 1RM
```

### 2. Start the API server (json-server)

The app expects an API at `http://localhost:3000`. `db.json` is the "database" json-server reads from and writes to. From the project root:

```bash
npx json-server --watch db.json --port 3000
```

> `db.json` is listed in `.gitignore`, so it won't be tracked by git — that's intentional, since it holds sample/test accounts and workout data that change as you use the app locally. If you don't have a `db.json` yet, create one with at least empty `users`, `workouts`, and `exercises` arrays:
> ```json
> { "users": [], "workouts": [], "exercises": [] }
> ```

Leave this terminal running — it's your backend. You should see json-server log that it's watching `db.json` and serving resources like `/users`, `/workouts`, and `/exercises`.

### 3. Serve the frontend

In a **second terminal**, from the project root:

```bash
npx serve src/frontend/templates
```

(or open the `src/frontend/templates` folder with VS Code's Live Server extension).

### 4. Open the app

Visit the URL your static server gives you (json-server already owns port `3000`, so your static server will typically pick something like `5000` or `3001` — check the terminal output) and open `index.html`. From there:

1. Click **Sign up**, create an account.
2. Complete the short onboarding (age, goal, experience, measurements).
3. You'll land on the **home** feed — tap the `+` button to log your first workout.

---

## How the app is wired together

- **No backend framework, no ORM.** `src/backend/auth.js` and `src/backend/measures.js` are just `fetch()` wrappers around the json-server REST endpoints (`GET/POST /users`, `PUT /users/:id`, etc.). "Backend" here means *the JavaScript that talks to the API*, not a server process you write yourself — json-server is that process.
- **Session state lives in `localStorage`.** After login, the current user is stored under the `current_user` key. While a workout is in progress, its in-progress state is stored under `current_user_workout` so a page refresh doesn't lose your sets.
- **Every page is its own HTML/CSS/JS trio.** There's no client-side router — navigating between `home.html`, `workout.html`, `discover.html`, `creator.html`, and `profile.html` is a normal full-page browser navigation (plain `<a href="...">` links).

---

## Pages, one by one

| Page               | File             | What happens here |
|--------------------|------------------|--------------------|
| **Landing / Auth**  | `index.html`    | Marketing landing page plus the login, signup, and onboarding (goals, experience, body measurements) flow. |
| **Home**            | `home.html`     | The dashboard you land on after logging in — a feed of the day's/recent sessions. |
| **Workout**         | `workout.html`  | Where you log a session: pick an exercise, add sets (weight/reps, or reps/duration/distance depending on the exercise type), attach notes or photos, then save. |
| **Discover**        | `discover.html`| Browse the exercise catalogue (200+ exercises seeded in `db.json`) filtered by muscle group and equipment. |
| **Creator**         | `creator.html` | Community/creator profiles and their training philosophy. |
| **Profile**         | `profile.html` | The logged-in user's own profile, stats, and past sessions. |

---

## The data model

`db.json` has three collections:

- **`users`** — account info (`name`, `username`, `email`, `password`, `id`) plus onboarding data once completed (`age`, `sex`, `main_goal`, `experience`, `training_days`, `measurements: { height, weight, body_fat }`). The `incomplete` flag tracks whether onboarding is finished.
- **`workouts`** — one entry per logged session: `user_id`, `date`, `title`, `description`, `total_time`, optional `photos`, and an `exercises` object keyed by exercise name, where each exercise has a `sets` object (set number → `{ kg, reps }` or similar) and a `type`.
- **`exercises`** — the static exercise catalogue: `name`, `equipment_type` (barbell, dumbbell, machine, resistance band, bodyweight...), `primary_muscle_group`, `other_muscles`, `exercise_type` (e.g. `weight_and_reps`, `bodyweight_reps`, `duration`, `distance_and_duration`), and `measurement` (which fields that exercise tracks).

Because sets are keyed by exercise **name** rather than exercise **id** in some historical entries, and the shape of a "set" has evolved over the project's history (older entries use a `["60", "12"]` array-style, newer ones use `{ "kg": "60", "reps": "12" }`), expect to see both formats in older seed data — new sessions are saved in the newer object format.

---

## Roadmap: the progressive overload engine

The long-term goal of 1RM is to auto-generate a multi-week strength plan that increments your weights and reps based on what you actually logged — not a static spreadsheet.

**Phase 1 (current)** — done:
- Workout log form (exercise, sets, reps, weight) with validation.
- Exercise catalogue, discovery, and profile/auth flows.

**Phase 2 (planned)** — the progression engine itself, a rule-based state machine:
- After each logged session, compare performance against the prescribed target.
- **Met the threshold?** Auto-increase next session's target weight/reps by a computed percentage.
- **Missed the threshold twice in a row?** Auto-deload (reduce the target) rather than keep pushing a failing lift.
- Compute the next targets from logged history in `localStorage`/`db.json` (rather than static, pre-written numbers) and render a progress chart on `<canvas>`.

This engine is intentionally *not* a lookup table — it's a small state machine per exercise (`on track` → `needs deload` → `on track`, etc.) driven by real logged data.

---

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feat/your-feature`.
2. Follow the existing commit style seen in `git log` (`feat:`, `Feat:`, `update:` prefixes).
3. Keep the "one template, one script, one stylesheet per page" pattern when adding new pages.
4. Open a pull request describing what changed and why.

---

## License

No license file is currently included in this repository. If you intend to open-source this project, add a `LICENSE` file (e.g. MIT) so others know how they're allowed to use the code.
