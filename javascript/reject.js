const rejectBtns = document.querySelectorAll( '.reject-btn' )

rejectBtns.forEach( btn => {
    btn.onclick = async () => {
        let id = btn.getAttribute( 'data-id' )
        let request = await fetch( '/reject', {
            method: 'post',
            body: JSON.stringify( {
                id: id
            } ),
            headers: {
                'content-type': 'application/json'
            }
        } )

        let response = await request.json()

        if ( response.status == 'success' ) {
            window.open( `https://wa.me/+91${ response.phone }?text=${ response.message }` )
            location.reload()
        } else {
            location = '/error'
        }

    }
} )

