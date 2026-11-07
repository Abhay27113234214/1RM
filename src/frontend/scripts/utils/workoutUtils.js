const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const exList = $('#exList');

const API = "http://localhost:5000/api"

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
    })
    const response_for_workout = await workout_response.json()
    if (response_for_workout.success) {
        return response_for_workout.workouts
    } else {
        return response_for_workout
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