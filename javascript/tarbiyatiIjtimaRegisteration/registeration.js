const form = document.forms[ 0 ]
const image = document.querySelector( 'input[name=image]' )
const file = document.querySelector( 'input[name=file]' )
const number = document.querySelector( 'input[name=number]' )
const popupContainer = document.querySelector( '.popup-container' )
const submit = document.querySelector( 'form .submit-container .submit' )
const loading = document.querySelector( 'form .data-loading' )
const error = document.querySelector( '.error' )
const success = document.querySelector( '.success' )
const adharNo = document.querySelector("input[name=adharNo")


form.onsubmit = async ( event ) => {
    event.preventDefault()

    const adharRegex = /^[2-9]{1}[0-9]{11}$/;

    if(!adharRegex.test(adharNo.value)){
        error.innerHTML = "Please enter a valid 12-digit Aadhaar number"
        return
    }else{
        error.innerHTML = "";
    }

    if ( number.value.length < 10 || number.value.length > 10 ) {
        error.innerHTML = 'Please Enter valid phone number'
        return
    }else if(img_base64 == undefined){
        error.innerHTML = "Please capture image"
        return
    }

    if ( file.files.length == 0 || file.files.length < 1 ) {
        error.innerHTML = 'Please Upload Your  Document'
        return
    } else if ( file.files[ 0 ].type != 'application/pdf' ) {
        error.innerHTML = 'Please upload pdf document'
        return
    } else if ( file.files[ 0 ].type == 'application/pdf' ) {
        let fileSizeInKb = Math.floor( file.files[ 0 ].size / 1024 )
        if ( fileSizeInKb > 1024 ) {
            error.innerHTML = 'Pdf size will be less than 1MB'
            return
        } else {
            error.innerHTML = ''
            submit.style.display = 'none'
            loading.style.display = 'block'
        }
    }

    let formData = new FormData( form )
    //img_base64, dataURLtoBlob is defined in the webcam.js
    let blob = dataURLtoBlob(img_base64);
    formData.append("image", blob, "photo.png")

    let response = await fetch( '/tarbiyati-ijtima-registeration', {
        method: 'post',
        body: formData
    } )

    let result = await response.json()

    if ( result.status == 'error' ) {
        error.innerHTML = result.message
        submit.style.display = 'block'
    } else if ( result.status == 'success' ) {
        error.innerHTML = ''
        loading.style.display = 'none'
        form.classList.add( 'hidden' )
        popupContainer.classList.add( 'active' )
    }

}