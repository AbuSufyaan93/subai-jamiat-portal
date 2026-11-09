const form = document.querySelector( 'form' )
const message = document.querySelector( '.message' )

function setMsg ( msg, status ) {
    message.innerText = msg;
    if ( status == 'success' ) {
        message.classList.add( 'success' )
        message.classList.remove( 'failure' )
    } else {
        message.classList.add( 'failure' )
        message.classList.remove( 'success' )
    }
}

function convertToObj ( formData ) {
    let convertedData = {};

    for ( const [ key, value ] of formData.entries() ) {
        convertedData[ key ] = value
    }

    return convertedData
}

form.onsubmit = async ( e ) => {
    e.preventDefault()

    let data = new FormData( form );
    let obj = convertToObj( data )


    const request = await fetch( '/quiz-registeration', {
        method: 'post',
        body: JSON.stringify( obj ),
        headers: {
            'Content-Type': 'application/json'
        }
    } )
    const response = await request.json()

    if ( response.status == 'success' ) {
        setMsg( "You are registered for quiz", "success" )
        setTimeout( () => {
            location.reload()
        }, 3000 )
    } else if ( response.status == 'failure' ) {
        setMsg( 'Something went wrong please try again', "failure" )
    } else if ( response.status == 'exist' ) {
        setMsg( "Number already exist", "failure" )
    }

}