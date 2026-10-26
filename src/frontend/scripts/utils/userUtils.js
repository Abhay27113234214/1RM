export let register = async (user) => {
    const register_user_response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST", 
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(user)
    })
    const response_for_register = await register_user_response.json()
    if (response_for_register.success) {
        sessionStorage.setItem("token", response_for_register.token)
        return {success: true}
    } else {
        return response_for_register
    }
}

export let login = async (email, password) => {
    const login_user_response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        }, 
        body: JSON.stringify({
            email: email,
            password: password
        })
    })
    const response_for_login = await login_user_response.json()
    if (response_for_login.success) {
        sessionStorage.setItem("token", response_for_login.token)
        return {success: true}
    } else {
        return response_for_login
    }
}

export let logout = () => {
    sessionStorage.removeItem('token')
    localStorage.removeItem('current_user')
    localStorage.removeItem('current_user_workout')
    localStorage.removeItem('current_user_workout_incomplete')
}

export let addMeasurements = async (measurements) => {
    let update = {}
    update['incomplete'] = false
    update['age'] = measurements.age 
    update['sex'] = measurements.sex 
    update['main_goal'] = measurements.goal 
    update['experience'] = measurements.experience 
    update['training_days'] = measurements.trainingDays 
    update['measurements'] = {
        height: measurements.height,
        weight: measurements.weight,
        body_fat: measurements.bodyFat
    }
    const update_user_response = await fetch("http://localhost:5000/api/auth/update", {
        method: "PATCH",
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        },
        body: JSON.stringify(update)
    })
    let response_for_updating_user = await update_user_response.json()
    return response_for_updating_user
}

export let getCurrentUser = async () => {
    const get_user_response = await fetch("http://localhost:5000/api/auth/get", {
        method: 'GET', 
        headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('token')}`
        }
    })
    const response_for_user_get = await get_user_response.json()
    if (response_for_user_get.success) {
        const current_user = {
            "email": response_for_user_get.email,
            "username": response_for_user_get.username,
            "name": response_for_user_get.name
        }
        return current_user
    } else {
        return response_for_user_get
    }
}