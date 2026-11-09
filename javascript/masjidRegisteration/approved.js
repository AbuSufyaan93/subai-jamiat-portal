const approveBtns = document.querySelectorAll( '.approve-btn' )

approveBtns.forEach( btn => {
    btn.onclick = async () => {
        document.body.style.cursor = 'wait'

        let id = btn.getAttribute( 'data-id' )
        let request = await fetch( '/approve-masjid-registeration', {
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

            window.open( `https://wa.me/+91${ response.number }?text=${ response.message }` )
            location.reload()

        } else if ( response.status == 'error' ) {
            location.href = '/error'
        }
    }
} )