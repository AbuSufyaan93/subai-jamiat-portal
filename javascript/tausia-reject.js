const rejectBtns = document.querySelectorAll( '.reject' )
rejectBtns.forEach( btn => {
    btn.onclick = () => {

        let id = btn.getAttribute( 'data-id' )
        document.body.style.cursor = 'wait'
        fetch( '/tausia-reject', {
            method: 'post',
            body: JSON.stringify( { id: id } ),
            headers: {
                'Content-Type': 'application/json'
            }
        } ).then( response => response.json() )
            .then( response => {
                if ( response.status == 'success' ) {
                    document.body.style.cursor = 'auto'
                    open( `https://wa.me/${ response.number }?text=${response.message}` )
                    location.reload()
                } else {
                    location.href = '/error'
                }
            } )

    }
} )