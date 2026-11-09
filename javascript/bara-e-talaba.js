const form = document.querySelector( '.form-container form' )
const submitBtn = form.querySelector( '.submit-container button[type=submit]' )
// const message = document.querySelector( '.message' )
const loading_div = document.querySelector( '.data-loading' )
const image = form.querySelector( 'form input[name=image]' )
const file = document.querySelector( 'form input[name=document]' )
const error = form.querySelector( '.error' )
// let allInputs = form.querySelectorAll( 'input' )
// let allTextareas = form.querySelectorAll( 'textarea' )
// let scriptUrl = 'https://script.google.com/macros/s/AKfycbyXPscsBt1D-WTBFNAMPXpAflc-rlS6-Vzjm_1RgVNwN1wCfZwRtq4sJqTwi8PhkivGpg/exec'
const message = document.querySelector( 'form .message' )

form.onsubmit = async ( e ) => {

    e.preventDefault()


    if ( image.fileslength == 0 ) {
        error.innerHTML = 'please upload image'
        return
    } else if ( image.files[ 0 ].type != 'image/jpeg' && image.files[ 0 ].type != 'image/jpg' && image.files[ 0 ].type != 'image/png' ) {
        error.innerHTML = 'image should be png or jpeg or jpg'
        return
    } else if ( image.files[ 0 ].type == 'image/jpeg' || image.files[ 0 ].type == 'image/jpg' || image.files[ 0 ].type == 'image/png' ) {

        let ImageSizeInMB = image.files[ 0 ].size / 1024
        if ( ImageSizeInMB > 300 ) {
            error.innerHTML = 'Image size should be less than 300kb'
            return
        } else {
            error.innerHTML = ''
        }
    }

    if ( file.files.length == 0 ) {
        error.innerHTML = 'Please Upload File.'
        return
    } else if ( file.files[ 0 ].type != 'application/pdf' ) {
        error.innerHTML = 'Please Upload Pdf File'
        return
    } else {

        let fileSizeInKb = file.files[ 0 ].size
        let fileSizeInMb = Math.floor( fileSizeInKb / 1024 )

        if ( fileSizeInMb > 1024 ) {
            error.innerHTML = 'Pdf size will be less than 1MB'
            return
        } else {
            error.innerHTML = ''
        }
    }

    submitBtn.style.display = 'none'
    loading_div.style.display = 'block'
    body.style.cursor = 'wait'

    const formData = new FormData( form )

    const request = await fetch( '/tausia-talaba-registeration', {
        method: 'post',
        body: formData
    } )

    const response = await request.json()
    if ( response.status == 'full' ) {
        message.innerText = ''
        body.style.cursor = 'auto'
        loading_div.style.display = 'none'
        error.innerText = 'اگلے مہینے کوشش کریں'
        submitBtn.style.display = 'none'
    }
    else if ( response.status == 'success' ) {

        body.style.cursor = 'auto'
        loading_div.style.display = 'none'
        message.innerText = 'مبارک ہو آپکا فارم سمبٹ ہو چکا ہے۔'

        setTimeout( () => {
            message.innerText = ''
            form.reset()
            submitBtn.style.display = 'block'
        }, 5000 )

    } else {

        location.href = '/error'

    }


    //pehle image bhi tha live krne se pehle hi change kiya 9/21/2023 ko
    // if ( image.files[ 0 ].length == 0 || image.files[ 0 ].length < 1 ) {
    //     error.innerHTML = 'please upload image'
    //     return
    // } else if ( !( image.files[ 0 ].type == 'image/jpeg' || image.files[ 0 ].type == 'image/jpg' || image.files[ 0 ].type == 'image/png' ) ) {
    //     error.innerHTML = 'image should be png or jpeg or jpg'
    //     return
    // } else if ( image.files[ 0 ].type == 'image/jpeg' || image.files[ 0 ].type == 'image/jpg' || image.files[ 0 ].type == 'image/png' ) {

    //     let ImageSizeInByte = Math.floor( image.files[ 0 ].size / 1024 )
    //     if ( ImageSizeInByte > 100 ) {
    //         error.innerHTML = 'Image size should be less than 100kb'
    //         return
    //     } else {
    //         error.innerHTML = ''
    //     }
    // }

    // let data = new FormData()
    // data.append( 'image', image.files[ 0 ] )
    // let request = await fetch( '/bara-e-talaba', {
    //     method: 'post',
    //     body: data
    // } )

    // let response = await request.json()
    // if ( response.status == 'error' ) {
    //     location = '/error'
    //     return
    // }

    // let imageLocation = `https://www.ahlehadeesmumbai.com/TausiaTalabaImages/${ response.filename }`

    // let act_formData = new FormData()

    // allInputs.forEach( input => {
    //     act_formData.append( input.name, input.value )
    // } )
    // allTextareas.forEach( textarea => {
    //     act_formData.append( textarea.name, textarea.value )
    // } )
    // // act_formData.append( 'image', imageLocation )

    // fetch( scriptUrl, {
    //     method: 'post',
    //     body: act_formData
    // } )
    //     .then( response => response.json() )
    //     .then( response => {
    //         form.reset();
    //         submitBtn.style.display = 'inline-block'
    //         loading_div.style.display = 'none'
    //         body.style.cursor = 'auto'
    //     } )

}