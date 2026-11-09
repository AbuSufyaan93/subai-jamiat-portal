const btns = document.querySelectorAll( '.content .head-container .head-wrapper .head-btn' )

btns.forEach( btn => {
    btn.onclick = () => {
        let plusMinus = btn.querySelector( '.circle' )
        let wrapper = btn.parentElement;
        wrapper.classList.toggle( 'active' )
        if ( wrapper.classList.contains( 'active' ) ) {
            plusMinus.classList.replace( 'fa-plus', 'fa-minus' )
        } else {
            plusMinus.classList.replace( 'fa-minus', 'fa-plus' )
        }
    }
} )