var swiper = new Swiper( ".mySwiper", {

    mousewheel: true,

    freeMode: true,

    spaceBetween: 10,

    slidesPerView: 4,

    watchSlidesProgress: true,

    grabCursor: true,



    breakpoints: {

        991: {

            direction: "vertical",

        },

        0: {

            direction: 'horizontal',

        },



    }

} );

var swiper2 = new Swiper( ".mySwiper2", {

    spaceBetween: 10,

    grabCursor: true,

    loop: true,

    navigation: {

        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",

    },

    thumbs: {

        swiper: swiper,

    },

    pagination: {

        el: ".swiper-pagination",
        clickable: true,

    },
    autoplay: {

        delay: 4000,
        disableOnInteraction: false

    },

} );

var swiper = new Swiper( ".mySwiper3", {

    grabCursor: true,

    mousewheel: true,

    keyboard: {

        enabled: true,

    },
    autoplay: {
        delay: 3000,
        disableOnInteraction: false,
    },

    navigation: {

        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",

    },

} );