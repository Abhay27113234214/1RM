import { showToast } from "./frontend_utils.js";

const API = "http://localhost:5000/api";

export async function getWorkouts(filter = {}, sort = {}) {
    const workout_response = await fetch(`${API}/workouts/get`, {
        method: 'POST', 
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify({
            filter: filter, 
            sort: sort
        })
    });
    const response_for_workout = await workout_response.json();
    if (response_for_workout.success) {
        return response_for_workout.workouts;
    } else {
        return response_for_workout;
    }
}

export async function getWorkout(id) {
    const cleanId = String(id).startsWith(':') ? String(id).slice(1) : String(id);
    try {
        const res = await fetch(`${API}/workouts/${cleanId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            }
        });
        return await res.json();
    } catch (_) {
        return {};
    }
}

export async function patchWorkout(id, changes) {
    const cleanId = String(id).startsWith(':') ? String(id).slice(1) : String(id);
    try {
        const res = await fetch(`${API}/workouts/${cleanId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            },
            body: JSON.stringify(changes)
        });
        return await res.json();
    } catch (_) {
        return {};
    }
}

export async function loadWorkout(id = new URLSearchParams(window.location.search).get('id')) {
    if (!id) {
        showToast('No session specified.', 'error');
        window.location.href = "home.html";
        return null;
    }
    try {
        const cleanId = String(id).startsWith(':') ? String(id).slice(1) : String(id);
        const data = await getWorkout(cleanId);
        const workout = data.workout || (data._id || data.id ? data : null);
        if (workout) return workout;

        showToast('Session not found.', 'error');
        window.location.href = "home.html?message=session_not_found&status=error";
        return null;
    } catch (e) {
        console.error('loadWorkout failed:', e);
        showToast('Could not load session. Check backend connection.', 'error');
        setTimeout(() => {
            window.location.href = "home.html";
        }, 1500);
        return null;
    }
}
