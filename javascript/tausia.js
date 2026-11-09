// const scriptURL = 'https://script.google.com/macros/s/AKfycbz6XzRtsJXRsUygK2icUJvZ0Cu5JQo7rUZ2fMD2PZ6K_gSb1FfjwmjN61JoCHc316-E/exec'
const scriptURL = 'https://script.google.com/macros/s/AKfycbzkz2g7_ugbowpL8CHInan9ZpQeHxYWj3b3HJQMbDLIAOI1y8b6OR5EJGFy9Kc36pwE0g/exec'
const form = document.querySelector( '.form-container form' )
const submitBtn = document.querySelector( '.form-container input[type=submit]' )
const message = document.querySelector( '.message' )
const loading_div = document.querySelector( '.data-loading' )
const error = document.querySelector( 'p.error' )
const image = form.querySelector( 'input[name=SafeerImage]' )
const tausiaDocument = form.querySelector( 'input[name=document]' )
const selects = form.querySelectorAll( 'select' )
const inputs = form.querySelectorAll( 'input:not(input[type=button],input[type=file],input[type=submit]' )
const textareas = form.querySelectorAll( 'textarea' )
const select = form.querySelectorAll( 'select' )
const qism = form.querySelector( 'select[name=Qism]' )
const totalStudents = form.querySelector( '#Tota_Number_Of_Students' )
const aqamtiStudents = form.querySelector( '#Aqamti_Talba_Talbat_Ki_Tadad' )
const safeerNumberWithoutCode = form.querySelector("#SafeerNoWithoutCode")
const countryCode = form.querySelector("#countryCode")
const safeerNumber = form.querySelector("#SafeerNumber")

qism.oninput = () => {
    if ( qism.value == 'مسجد' ) {
        totalStudents.value = 0
        aqamtiStudents.value = 0
    }
}

form.addEventListener( 'submit', async ( e ) => {

    e.preventDefault()

    //check the SafeerNumber is having valid country code & phone no
    if(safeerNumberWithoutCode.value.length != 10){
        error.innerHTML = 'Invalid Safeer Name';
        return false;
    }else{
        error.innerHTML = "";
    }

    if(countryCode.value != "+91" && countryCode.value != "+977"){
        error.innerHTML = "Invalid country code";
        return false;
    }else{
        error.innerHTML = "";
    }

    safeerNumber.value = countryCode.value + safeerNumberWithoutCode.value;

    if ( image.length == 0 ) {

        error.innerHTML = 'Please Upload Image'
        return false

    } else if ( image.files[ 0 ].type != 'image/jpeg' && image.files[ 0 ].type != 'image/jpg' && image.files[ 0 ].type != 'image/png' ) {

        error.innerHTML = 'Please upload png or jpeg or jpg image'
        return false

    } else if ( image.files[ 0 ].type == 'image/jpeg' || image.files[ 0 ].type == 'image/jpg' || image.files[ 0 ].type == 'image/png' ) {

        let imageSizeInByte = image.files[ 0 ].size
        let imageSizeInKb = Math.floor( imageSizeInByte / 1024 )
        if ( imageSizeInKb > 300 ) {
            error.innerHTML = 'Image size will be less than 300kb'
            return
        } else {
            error.innerHTML = ''
        }

    }

    if ( tausiaDocument.files[ 0 ].type != 'application/pdf' ) {
        error.innerHTML = 'Please uplod pdf document'
        return

    } else if ( tausiaDocument.files[ 0 ].type == 'application/pdf' ) {
        let imageSizeInByte = tausiaDocument.files[ 0 ].size
        let imageSizeInKb = Math.floor( imageSizeInByte / 1024 )
        if ( imageSizeInKb > 1024 ) {
            error.innerHTML = 'Pdf size should be less than 1MB'
            return
        } else {
            error.innerHTML = ''
        }
    }

    form.querySelector( '[type=submit]' ).style.display = 'none'
    // message.innerText = 'بھیجا جا رہا ہے۔۔۔'
    // message.innerText = 'form submitting...' it is like this in english
    loading_div.style.display = 'block'
    body.style.cursor = 'wait'

    // let imgData = new FormData()
    // imgData.append( 'image', image.files[ 0 ] )
    // // imgData.append( 'name', 'ammar' )

    // fetch( '/tausia-img', {
    //     method: 'post',
    //     body: imgData
    // } )
    //     .then( response => response.json() )
    //     .then( response => {
    //         let formData = new FormData()
    //         inputs.forEach( input => {
    //             formData.append( `${ input.name }`, input.value )
    //         } )
    //         select.forEach( sel => {
    //             formData.append( `${ sel.name }`, sel.value )
    //         } )
    //         formData.append( 'Safeer_Ki_Tasweer', response.imgUrl )

    //         textareas.forEach( textarea => {
    //             formData.append( `${ textarea.name }`, textarea.value )
    //         } )

    //         let curr_date = new Date()
    //         let year = curr_date.getFullYear()
    //         let month = curr_date.getMonth() + 1
    //         let day = curr_date.getDate()
    //         let hour = curr_date.getHours()
    //         let minute = curr_date.getMinutes()
    //         let second = curr_date.getSeconds()
    //         month = ( month < 10 ) ? '0' + month : month
    //         day = ( day < 10 ) ? '0' + day : day

    //         let today = month + '-' + day + '-' + year
    //         hour = ( hour < 10 ) ? '0' + hour : hour
    //         minute = ( minute < 10 ) ? '0' + minute : minute
    //         second = ( second < 10 ) ? '0' + minute : minute
    //         let time = hour + ":" + minute + ":" + second

    //         formData.append( 'Date', today )
    //         formData.append( 'Time', time )

    //         if ( response.status == 'success' ) {

    //             fetch( scriptURL,
    //                 {
    //                     method: 'POST',
    //                     body: formData

    //                 } ).then( response => {

    //                     return response.json();

    //                 } )
    //                 .then( response => {

    //                     // message.innerText = 'بھیجا جا چکا'
    //                     // message.innerText = 'form submitted'; it is like this in english
    //                     form.reset();
    //                     form.querySelector( '[type=submit]' ).style.display = 'inline-block'
    //                     loading_div.style.display = 'none'
    //                     body.style.cursor = 'auto'
    //                     loading.style.display = 'none'
    //                     error.innerHTML = ''
    //                     // message.innerText = '';

    //                 } )
    //                 .catch( error =>
    //                     location.href = '/error'
    //                 )


    //         } else if ( response.status == 'full' ) {
    //             loading_div.style.display = 'none'
    //             body.style.cursor = 'auto'
    //             error.innerHTML = 'اگلے مہینے کوشش کریں'
    //         } else {
    //             location.href = '/error'
    //         }
    //     } ).catch( err => {
    //         location.href = '/error'
    //     } )

    const formData = new FormData( form )

    try {
        const request = await fetch( '/tausia-registeration', {
            method: 'post',
            body: formData
        } )
        const response = await request.json()

        if ( response.status == 'success' ) {

            message.innerText = 'بھیجا جا چکا'
            // message.innerText = 'form submitted'; it is like this in english
            form.reset()
            form.querySelector( '[type=submit]' ).style.display = 'inline-block'
            loading_div.style.display = 'none'
            body.style.cursor = 'auto'
            loading.style.display = 'none'
            error.innerHTML = ''
            setTimeout( () => {
                message.innerText = ''
            }, 5000 )
            // message.innerText = '';

        } else if ( response.status == 'full' ) {

            loading_div.style.display = 'none'
            body.style.cursor = 'auto'
            error.innerHTML = 'اگلے مہینے کوشش کریں'

        } else {

            location.href = '/error'

        }
    } catch ( error ) {

        location.href = '/error'

    }

} )
