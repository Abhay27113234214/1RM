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
            t.classList.add('bye');
            t.style.height = '0px';
            t.style.paddingTop = '0';
            t.style.paddingBottom = '0';
            t.style.marginTop = '-10px';
        });

        t.addEventListener('animationend', () => t.remove());
        setTimeout(() => t.remove(), 500);
    }

    const timer = setTimeout(dismiss, duration);
    t.querySelector('.t-x').addEventListener('click', dismiss);
}

const DEFAULT_FLASH_MESSAGES = {
    'not_logged_in':     { text: 'Please sign in to continue ✱', type: 'error' },
    'logged_out':        { text: 'Signed out ✱ see you at the rack.', type: 'ok' },
    'workout_completed': { text: 'Workout Completed ✱ logged to feed.', type: 'ok' },
    'resume_workout':    { text: 'Workout resumed ✱ Welcome back!', type: 'ok' },
    'session_not_found': { text: 'Session not found.', type: 'error' }
};

export function handleUrlFlashMessages(customActions = {}) {
    try {
        const url = new URL(window.location.href);
        const message = url.searchParams.get('message');
        if (!message) return;

        const status = url.searchParams.get('status') || 'ok';
        const from = url.searchParams.get('from');

        if (typeof customActions[message] === 'function') {
            customActions[message]({ message, status, from });
        }

        if (DEFAULT_FLASH_MESSAGES[message]) {
            const config = DEFAULT_FLASH_MESSAGES[message];
            showToast(config.text, status === 'error' ? 'error' : config.type);
        } else {
            const fallbackText = message.replace(/_/g, ' ');
            showToast(fallbackText.charAt(0).toUpperCase() + fallbackText.slice(1), status === 'error' ? 'error' : 'ok');
        }

        url.searchParams.delete('message');
        url.searchParams.delete('status');
        url.searchParams.delete('from');
        const cleanQuery = url.searchParams.toString();
        const cleanUrl = url.pathname + (cleanQuery ? '?' + cleanQuery : '') + url.hash;
        window.history.replaceState({}, '', cleanUrl);
    } catch (err) {
        console.error('handleUrlFlashMessages error:', err);
    }
}
