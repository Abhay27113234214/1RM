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
        localStorage.setItem("current_user", JSON.stringify(user))
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
        localStorage.setItem("current_user", JSON.stringify(response_for_login.user))
        return {success: true}
    } else {
        return response_for_login
    }
}

export let logout = () => {
    localStorage.removeItem('current_user')
    localStorage.removeItem('current_user_workout')
    localStorage.removeItem('current_user_workout_incomplete')
}