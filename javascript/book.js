const tabContainer = document.querySelectorAll( '.tab-container' )
const bookTitles = document.querySelectorAll( '.book-dropdown .book-dropdown-title' )

tabContainer.forEach( tab => {

    tab.onclick = ( e ) => {

        if ( e.target.classList.contains( 'read-online-tab' ) ) {

            let bookDetailsTab = tab.querySelector( '.book-details-tab' )
            let parent = tab.parentElement
            let bookDetails = parent.querySelector( '.book-details' )
            bookDetailsTab.classList.remove( 'active' )
            bookDetails.style.display = 'none'
            e.target.classList.add( 'active' )
            parent.querySelector( '.read-online' ).style.display = 'flex'

        } else if ( e.target.classList.contains( 'book-details-tab' ) ) {

            let readOnlineTab = tab.querySelector( '.read-online-tab' )
            let parent = tab.parentElement
            let readOnline = parent.querySelector( '.read-online' )
            readOnlineTab.classList.remove( 'active' )
            readOnline.style.display = 'none'
            e.target.classList.add( 'active' )
            parent.querySelector( '.book-details' ).style.display = 'flex'
        }

    }

} )


const moreBtn = document.querySelectorAll( '.book .more-btn' )
moreBtn.forEach( btn => {
    let bookText = btn.previousElementSibling
    btn.onclick = () => {
        bookText.classList.add( 'active' )
        btn.querySelector( 'span' ).style.display = 'none'
    }
} )

// const bookText = document.querySelectorAll('.book .book-text')

bookTitles.forEach( title => {
    title.onclick = () => {
        let dropdown = title.parentElement
        dropdown.classList.toggle( 'active' )
        let icon = title.querySelector( 'i' )
        if ( dropdown.classList.contains( 'active' ) ) {
            icon.classList.replace( 'fa-plus', 'fa-minus' )
        } else {
            icon.classList.replace( 'fa-minus', 'fa-plus' )
        }
    }
} )
