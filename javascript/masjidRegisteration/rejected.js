const rejectBtns = document.querySelectorAll( '.reject-btn' )
rejectBtns.forEach( btn => {
    btn.onclick = () => {

        let id = btn.getAttribute( 'data-id' )
        document.body.style.cursor = 'wait'

        fetch( '/reject-masjid-registeration', {

            method: 'post',
            body: JSON.stringify( { id: id } ),
            headers: {
                'Content-Type': 'application/json'
            }
        } )
            .then( response => response.json() )
            .then( response => {

                if ( response.status == 'success' ) {

                    document.body.style.cursor = 'auto'
                    open( `https://wa.me/+91${ response.number }?text=${ response.message }` )
                    location.reload()

                } else {

                    location.href = '/error'

                }

            } )

    }
} )