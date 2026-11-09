const deleteBtns = document.querySelectorAll( '.delete-btn' )

deleteBtns.forEach( btn => {
    btn.onclick = deleteVideo
} )

async function deleteVideo () {

    let video = this.dataset.video
    let isSure = confirm( "Are you sure you want to delete?" );
    if ( !isSure ) return

    try {
        const request = await fetch( `/delete-video/${ video }`, { method: "delete" } )
        const response = await request.json();
        if ( response.status == 'success' ) {
            alert( "The video has been deleted successfully." );
            location.reload();
        } else {
            alert( "Oops! Something unexpected happened. Please try again later." );
        }
    } catch ( err ) {
        alert( "Oops! Something unexpected happened. Please try again later." );
    }
}