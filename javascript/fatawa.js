const form = document.querySelector( '.form-container form' )
const submitBtn = document.querySelector( '.form-container input[type=submit]' )
const message = document.querySelector( '.message' )
const error = document.querySelector( '.error' )
const loading_div = document.querySelector( '.data-loading' )

form.addEventListener( 'submit', e => {

    e.preventDefault()

    form.querySelector( 'input[type=submit]' ).style.display = 'none'
    error.innerText = ''
    message.innerText = 'بھیجا جا رہا ہے۔۔۔'
    // message.innerText = 'form submitting...' it is like this in english
    loading_div.style.display = 'block'
    body.style.cursor = 'wait'
    let data = new FormData( form )
    data.append( 'date', new Date().toLocaleDateString( "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    } ) )

    const formData = new URLSearchParams( data ).toString();

    fetch( '/fatawa-question',
        {
            method: 'POST',
            body: formData,
            headers: {
                'content-type': "application/x-www-form-urlencoded"
            }

        } ).then( response => response.json() )
        .then( response => {

            if ( response.status == 'success' ) {
                message.innerText = 'بھیجا جا چکا'
                // message.innerText = 'form submitted'; it is like this in english
                form.reset();
                form.querySelector( 'input[type=submit]' ).style.display = 'inline-block'
                loading_div.style.display = 'none'
                setTimeout( () => {

                    body.style.cursor = 'auto'
                    message.innerText = '';

                }, 1000 )
            } else {
                form.querySelector( 'input[type=submit]' ).style.display = 'inline-block'
                loading_div.style.display = 'none'
                message.innerText = ''
                error.innerText = 'you filled something wrong.'
                body.style.cursor = 'auto'
            }


        } )
        .catch( error => {
            message.innerText = ''
            error.innerText = 'Please fill all fields properly'
            loading_div.style.display = 'none'
            body.style.cursor = 'auto'
        }
        )

} )
