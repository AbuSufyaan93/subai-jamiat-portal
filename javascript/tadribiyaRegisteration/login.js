const form = document.forms[ 0 ]
const idField = document.getElementById( 'id' )
const passwordField = document.getElementById( 'password' )
const submit = document.querySelector( 'form .submit-container .submit' )
const loading = document.querySelector( 'form .data-loading' )
const error = document.querySelector( '.error' )
const success = document.querySelector( '.success' )

form.onsubmit = async ( event ) => {
    event.preventDefault()

    if ( idField.value.trim().length == 0 ) {
        error.innerText = "Enter your id properly"
        return
    }

    if ( passwordField.value.trim().length == 0 ) {
        error.innerText = "Enter your password properly"
        return
    }

    error.innerText = ''
    submit.style.display = 'none'
    loading.style.display = 'block'

    // let formData = new FormData( form )

    let response = await fetch( '/tadribiya-login', {
        method: 'post',
        body: JSON.stringify( { userId: idField.value, password: passwordField.value } ),
        headers: {
            'content-type': "application/json"
        }
    } )

    let result = await response.json()

    loading.style.display = 'none'
    submit.style.display = 'block'

    if ( result.status == 'error' ) {

        error.innerText = result.message

    } else if ( result.status == 'success' ) {

        error.innerHTML = ''
        loading.style.display = 'none'
        location.href = '/tadribiya-quiz'

    }
}