// Instant page readiness — never lock body scroll
const loading = document.querySelector('.loading');
if (typeof body !== 'undefined' && body) body.style.overflowY = 'auto';
if (loading) loading.style.display = 'none';

$('document').ready(function () {
    $('.column-left').waypoint(() => {
        $('.column-left').addClass('animate__animated animate__fadeInLeft');
    }, {
        offset: '30%'
    });

    $('.column-right').waypoint(() => {
        $('.column-right').addClass('animate__animated animate__fadeInRight');
    }, {
        offset: '30%'
    });

    $('footer').waypoint(() => {
        $('footer').addClass('animate__animated animate__fadeInUp');
    }, {
        offset: '50%'
    });

    $('.copyright').waypoint(() => {
        $('.copyright').addClass('animate__animated animate__fadeIn');
    }, {
        offset: ''
    });
});
