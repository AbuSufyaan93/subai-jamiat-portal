const GenerateBtn = document.querySelector( '.Generate-sheet' )
// const body = document.querySelector( 'body' )
const GenerateAllBtn = document.querySelector( '.Generate-All-Data-Sheet' )

GenerateBtn.onclick = async () => {

    document.body.style.cursor = 'wait'

    fetch( '/musabqa-RegisterationData' )
        .then( response => {
            if ( !response.ok ) {
                throw new Error( 'Network response was not ok.' );
            }
            return response.blob();
        } )
        .then( blob => {
            const url = window.URL.createObjectURL( blob );
            const a = document.createElement( 'a' );
            a.href = url;
            a.download = 'output.xlsx'; // Set the desired file name
            document.body.appendChild( a );
            a.click();
            a.remove();
            window.URL.revokeObjectURL( url );
        } )
        .catch( error => {
            console.error( 'There was a problem with the fetch operation:', error );
        } );
    document.body.style.cursor = 'auto'

}

GenerateAllBtn.onclick = async () => {

    document.body.style.cursor = 'wait'

    fetch( '/musabqa-RegisterationAllData' )
        .then( response => {
            if ( !response.ok ) {
                throw new Error( 'Network response was not ok.' );
            }
            return response.blob();
        } )
        .then( blob => {
            const url = window.URL.createObjectURL( blob );
            const a = document.createElement( 'a' );
            a.href = url;
            a.download = 'output.xlsx'; // Set the desired file name
            document.body.appendChild( a );
            a.click();
            a.remove();
            window.URL.revokeObjectURL( url );
        } )
        .catch( error => {
            console.error( 'There was a problem with the fetch operation:', error );
        } );
    document.body.style.cursor = 'auto'
}