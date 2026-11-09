// const scriptURL = 'https://script.google.com/macros/s/AKfycbz6XzRtsJXRsUygK2icUJvZ0Cu5JQo7rUZ2fMD2PZ6K_gSb1FfjwmjN61JoCHc316-E/exec'
const scriptURL = 'https://script.google.com/macros/s/AKfycbzKMpfA_ft_T3jHJxe7AXypd665k-5Py8z3iWIHbirIkWUNja2XgT6yWrxe3FRYmV00/exec'
const form = document.querySelector( '.form-container form' )
const submitBtn = document.querySelector( '.form-container input[type=submit]' )
const message = document.querySelector( '.message' )
const loading_div = document.querySelector( '.data-loading' )

form.addEventListener( 'submit', e => {

    e.preventDefault()

    form.querySelector( 'input[type=submit]' ).style.display = 'none'
    // message.innerText = 'بھیجا جا رہا ہے۔۔۔'
    // message.innerText = 'form submitting...' it is like this in english 
    loading_div.style.display = 'block'
    body.style.cursor = 'wait'

    fetch( scriptURL,
        {

            method: 'POST',
            body: new FormData( form )

        } ).then( response => {

            return response.json();

        } )
        .then( response => {

            // message.innerText = 'بھیجا جا چکا'
            // message.innerText = 'form submitted'; it is like this in english 
            form.reset();
            form.querySelector( 'input[type=submit]' ).style.display = 'inline-block'
            loading_div.style.display = 'none'
            setTimeout( () => {

                body.style.cursor = 'auto'
                // message.innerText = '';
                loading.style.display = 'none'

            }, 1000 )

        } )
        .catch( error =>

            console.error( 'Error!', error )

        )

} )
