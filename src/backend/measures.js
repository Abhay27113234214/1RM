export { addMeasurements };

let addMeasurements = async (measurements) => {
    const current_user = JSON.parse(localStorage.getItem('current_user'))
    let curr_user_db_response = await fetch(`http://localhost:3000/users?email:eq=${current_user.email}`)
    let curr_user_db = await curr_user_db_response.json()
    let modified_user = curr_user_db[0]
    modified_user['incomplete'] = false
    modified_user['age'] = measurements.age 
    modified_user['sex'] = measurements.sex 
    modified_user['main_goal'] = measurements.goal 
    modified_user['experience'] = measurements.experience 
    modified_user['training_days'] = measurements.trainingDays 
    modified_user['measurements'] = {
        height: measurements.height,
        weight: measurements.weight,
        body_fat: measurements.bodyFat
    }
    let response = await fetch(`http://localhost:3000/users/${modified_user.id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(modified_user)
    })
    if (response.status != 200 && response.status != 204 ) {
        return {
            success: false
        }
    }
    return { success: true }
}