const approveBtns = document.querySelectorAll( '.approve-btn' )
// const body = document.querySelector( 'body' )

approveBtns.forEach( btn => {
    btn.onclick = async () => {
        body.style.cursor = 'wait'

        let id = btn.getAttribute( 'data-id' )
        let request = await fetch( '/tarbiyati-ijtima-generate-pdf', {
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
            //tadribiya with quiz
            //     window.open( `https://wa.me/+91${ response.to.phone }?text=${ response.to.message }%0A${ response.to.url } %0A ${ response.to.IdAndPassword }
            // ` )
            //tadribiya without quiz
            window.open(`https://wa.me/+91${ response.to.phone }?text=${ response.to.message }%0A${response.to.QrURL}`)
            location.reload()
        } else if ( response.status == 'error' ) {
            location.href = '/error'
        }
    }
} )