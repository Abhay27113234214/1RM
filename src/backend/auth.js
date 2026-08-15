export { login, register };

let login = async (email, password) => {
    let user_response = await fetch(`http://localhost:3000/users?email:eq=${email}`)
    let users = await user_response.json()
    if (users.length < 1) {
        return {
            success: false,
            reason: "user_not_found"
        }
    }
    let user = users[0]
    if (user.password != password) {
        return {
            success: false,
            reason: "invalid_password"
        }
    }
    return {success: true}
}

let register = async (user) => {
    let user_response = await fetch(`http://localhost:3000/users?email:eq=${user.email}`)
    let user_in_db = await user_response.json()
    if (user_in_db >= 1) {
        return {
            success: false,
            reason: "user_already_exists"
        }
    }
    user['incomplete'] = true
    let create_user_response = await fetch(`http://localhost:3000/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(user)
    })
    if (create_user_response.status) {
        return {
            success: true
        }
    } else {
        return{
            success: false,
            reason: "some_error_occurred"
        }
    }
}
