export let authenticate = async () => {
    const token = sessionStorage.getItem('token')
    if (token) {
        const authenticate_response = await fetch("http://localhost:5000/api/auth", {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        const response_for_authentication = await authenticate_response.json()
        if (response_for_authentication.success) {
            return true;
        } 
        return false;
    } else {
        return false;
    }
}