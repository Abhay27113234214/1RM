
/* ====== heatmap generator ====== */
(function () {
    const grid = document.getElementById('heatGrid');
    const weeks = 16;
    const days = 7;
    const total = weeks * days;
    // deterministic pseudo-random so it looks consistent
    let seed = 42;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - (weeks * 7 - 1));

    // session descriptors for tooltips
    const sessions = [
        'Leg day · 8,420 kg',
        'Push · 5,120 kg',
        'Pull · 9,240 kg',
        'Zone 2 run · 6.4 km',
        'Upper accessory · 3,810 kg',
        'Squat technique · 4,180 kg',
        '10K long run · 10.0 km',
        'Deadlift heavy · 7,800 kg',
        'OHP focus · 2,940 kg'
    ];

    for (let i = 0; i < total; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const cell = document.createElement('div');
        // weekends less likely to train
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const r = rand();
        let level, tip;
        if (r < (isWeekend ? 0.55 : 0.18)) {
            level = 0;
            tip = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · rest';
        } else {
            const intensity = rand();
            if (intensity < 0.4) level = 1;
            else if (intensity < 0.7) level = 2;
            else if (intensity < 0.9) level = 3;
            else level = 4;
            const s = sessions[Math.floor(rand() * sessions.length)];
            tip = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + s;
        }
        cell.className = 'heat-cell l' + level;
        cell.dataset.tip = tip;
        grid.appendChild(cell);
    }
})();

/* ====== nav scroll ====== */
const navBar = document.getElementById('navBar');
window.addEventListener('scroll', () => {
    navBar.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });
