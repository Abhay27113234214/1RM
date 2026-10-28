const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const exList = $('#exList');



export async function getWorkouts(filter = {}, sort = {}) {
    const workout_response = await fetch("http://localhost:5000/api/workouts/get", {
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