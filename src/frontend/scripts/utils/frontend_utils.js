export const $ = s => document.querySelector(s);

export const $$ = s => Array.from(document.querySelectorAll(s));

export function showToast(message, type = 'ok', duration = 3800) {
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