const approveBtns = document.querySelectorAll( '.approve-btn' )
const rejectBtns = document.querySelectorAll( '.reject-btn' )

approveBtns.forEach( btn => {
    btn.onclick = async () => {
        let id = btn.getAttribute( 'data-id' )
        let request = await fetch( '/generate-pdf', {
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
            window.open( `https://wa.me/${ response.to.phone }?text=${ response.to.url }%0A%0A%0A${ response.to.message }` )
        } else if ( response.status == 'error' ) {
            alert( 'error occured' )
        }
    }
} )

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
            window.open( `https://wa.me/${ response.phone }?text=${ response.message }` )
        } else {
            location = '/error'
        }

    }
} )

