const approveBtns = document.querySelectorAll( '.approve' )

approveBtns.forEach( btn => {
    btn.onclick = () => {

        let id = btn.getAttribute( 'data-id' )

        document.body.style.cursor = 'wait'
        fetch( '/tausia-approve', {
            method: 'Post',
            body: JSON.stringify( { id: id } ),
            headers: {
                'Content-Type': 'application/json'
            }
        } ).then( response => response.json() )
            .then( response => {
                if ( response.status == 'success' ) {
                    open( `https://wa.me/${ response.number }?text=${ response.message }` )
                    document.body.style.cursor = 'auto'
                    location.reload()
                } else[
                    location.href = '/error'
                ]
            } )

    }
} )

