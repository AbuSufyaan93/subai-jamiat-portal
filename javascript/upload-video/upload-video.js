const form = document.querySelector( 'form' )
const error = document.querySelector( '.error' )
const fileInput = document.querySelector( "input[name=video]" )
const message = document.querySelector( '.success' )
const progressContainer = document.querySelector( '.progress-container' )
const progressBar = document.querySelector( '.progress-container .progress-bar' )
const percentSpan = document.querySelector( '.progress-container .percentage' )
const cancel = document.querySelector( '.progress-container .cancel' )
const fileNameContainer = document.querySelector( '.progress-container .file-name' )
const submitBtn = document.querySelector( 'form button[type=submit]' )

form.onsubmit = async ( e ) => {
    e.preventDefault()

    const formData = new FormData( form )

    const xhr = new XMLHttpRequest()

    xhr.open( 'post', '/upload-video', true )

    xhr.responseType = 'json'

    fileNameContainer.innerText = fileInput.files[ 0 ].name

    submitBtn.style.pointerEvents = 'none'
    cancel.style.pointerEvents = 'auto'

    xhr.upload.addEventListener( "progress", ( e ) => {



        if ( e.lengthComputable ) {


            // progressContainer.classList.remove( 'active' )
            const percentage = ( e.loaded / e.total ) * 100

            progressContainer.classList.add( 'active' )
            progressBar.style.width = percentage + '%'
            percentSpan.innerText = percentage.toFixed( 2 ) + '%'

        }

    } )

    xhr.onreadystatechange = () => {
        if ( xhr.readyState == 4 && xhr.status == 200 ) {

            let response = xhr.response
            if ( response.status == 'success' ) {

                error.innerHTML = ''
                message.classList.add( 'active' )
                message.innerHTML = 'Link : ' + response.link
                form.reset()
                submitBtn.style.pointerEvents = 'auto'
                cancel.style.pointerEvents = 'none'

            }

        }
    }

    xhr.onerror = () => {

        alert( "Error occured! Please Try again" )
        form.reset()
        submitBtn.style.pointerEvents = 'auto'
        cancel.style.pointerEvents = 'none'
        progressContainer.classList.remove( 'active' )
        message.classList.remove( 'active' )

    }

    xhr.onabort = () => {

        alert( "upload has been cancelled" )
        form.reset()
        submitBtn.style.pointerEvents = 'auto'
        cancel.style.pointerEvents = 'none'
        progressContainer.classList.remove( 'active' )
        message.classList.remove( 'active' )

    }

    xhr.send( formData )



    cancel.onclick = () => {

        xhr.abort()

    }


    // let request = await fetch( '/upload-video', {
    //     method: 'post',
    //     body: formData

    // } )

    // let response = await request.json()

    // if ( response.status == 'success' ) {

    //     document.body.style.cursor = 'auto'
    //     error.innerHTML = ''
    //     message.classList.add( 'active' )
    //     message.innerHTML = 'Link : ' + response.link

    // } else {

    //     document.body.style.cursor = 'auto'
    //     message.innerHTML = ''
    //     message.classList.remove( 'active' )
    //     error.innerHTML = 'video not found or something went wrong'

    // }

}

message.onclick = () => {

    navigator.clipboard.writeText( message.innerText.slice( '7' ) )
    message.classList.add( 'clicked' )
    setTimeout( () => {
        message.classList.remove( 'clicked' )
    }, 490 )

}