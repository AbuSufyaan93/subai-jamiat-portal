const body = document.querySelector('body');
const links = document.querySelectorAll('.nav a');
const menu = document.querySelector('.header .menu');
const language = document.querySelector('.header .language');
const menubar = document.querySelector('.navbar .menubar .bar-icon');
const nav = document.querySelector('.navbar .nav');
const socialIcon = document.querySelector('.social-icon');
const arrow = document.querySelector('.social-icon-arrow .arrow');
const arrowClose = socialIcon ? socialIcon.querySelector('.arrow-close') : null;
const search = document.querySelector('.navbar .search');
const searchIcon = document.querySelector('.navbar .menubar .search-icon');
const calenderIcon = document.querySelector('.header .calender i');
const date = document.querySelector('.header .date');
const dropdown = document.querySelectorAll('.navbar .nav .dropdown');

function activePage() {
    if (!body) return;
    const activePageAttr = body.getAttribute('data-active');
    links.forEach(link => {
        if (link.getAttribute('data-active') == activePageAttr) {
            link.classList.add('active');
        }
    });
}

activePage();

function today() {
    const englishDate = document.querySelector('.calender .date span.english-date');
    if (!englishDate) return;

    let todayDate = new Date();
    let d = todayDate.getDate();
    let month = todayDate.getMonth() + 1;
    let year = todayDate.getFullYear();
    let day = todayDate.getDay();
    let dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    if (month < 10) month = '0' + month;
    if (d < 10) d = '0' + d;

    englishDate.innerHTML = `${dayName[day]}  &nbsp;&nbsp;${d}/${month}/${year}`;
}

today();

dropdown.forEach(drop => {
    let link = drop.querySelector('a:first-child');
    if (link) {
        link.onclick = () => {
            drop.classList.toggle('active');
        };
    }
});

if (menu) {
    menu.onclick = () => {
        if (date) date.classList.remove('active');
        if (language) language.classList.toggle('active');
    };
}

if (menubar && nav) {
    menubar.onclick = () => {
        nav.classList.toggle('active');
    };
}

if (arrow && socialIcon) {
    arrow.onclick = () => {
        socialIcon.classList.add('active');
        arrow.classList.remove('active');
        socialIcon.style.transitionDelay = '0.3s';
        arrow.style.transitionDelay = '0';
    };
}

if (arrowClose && socialIcon && arrow) {
    arrowClose.onclick = () => {
        socialIcon.classList.remove('active');
        arrow.classList.add('active');
        socialIcon.style.transitionDelay = '0';
        arrow.style.transitionDelay = '0.3s';
    };
}

if (searchIcon && search) {
    searchIcon.onclick = () => {
        search.classList.toggle('active');
    };
}

if (calenderIcon) {
    calenderIcon.onclick = () => {
        if (date) date.classList.toggle('active');
        if (language) language.classList.remove('active');
    };
}

window.addEventListener('load', () => {
    if (socialIcon && arrow) {
        socialIcon.classList.add('active');
        arrow.classList.remove('active');
        setTimeout(() => {
            arrow.classList.add('active');
            socialIcon.classList.remove('active');
        }, 3000);
    }
});

// Viewers counter
function viewers() {
    const view = document.querySelector('.column .card .view');
    if (view == null) return;

    const personType = sessionStorage.getItem('viewer') != 'true' ? 'new' : 'old';
    fetch('/viewers', {
        method: 'post',
        body: JSON.stringify({ person: personType }),
        headers: { 'Content-Type': 'application/json' }
    })
        .then(res => res.json())
        .then(res => {
            if (res && res.view !== undefined) {
                view.innerText = res.view;
            }
            if (personType === 'new') {
                sessionStorage.setItem('viewer', 'true');
            }
        })
        .catch(() => {});
}

viewers();

// Footer scroll-to-top
let up = document.querySelector('footer .up');
if (up) {
    up.onclick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}

// Navbar search handler
const navbarSearchInput = document.querySelector('.navbar .search input');
if (navbarSearchInput) {
    navbarSearchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = (navbarSearchInput.value || '').trim();
            if (query.length > 0) {
                location.href = `/search?q=${encodeURIComponent(query)}`;
            }
        }
    });
}

// Moon curve design
const root = document.querySelector(':root');

function UrduToEnglishNumber(NumberInUrdu) {
    let urduNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    let EnglishUrduPair = {};
    for (let i = 0; i < urduNumbers.length; i++) {
        EnglishUrduPair[urduNumbers[i]] = i;
    }
    return String(NumberInUrdu || '').replace(/[۰-۹]/g, matchedValue => EnglishUrduPair[matchedValue]);
}

function generateMoonAccordingDate() {
    const moonEl = document.querySelector('.MoonAccordingDate');
    if (!moonEl || !root) return;
    const DateForMoon = moonEl.getAttribute('data-DateForMoon') || '1';
    const d = parseInt(UrduToEnglishNumber(DateForMoon.toString()), 10);

    if (d <= 15 && d > 0) {
        let MoonCurve = d * 1.66;
        MoonCurve = MoonCurve > 25 ? 25 : MoonCurve;
        root.style.setProperty('--curve', MoonCurve + 'px');
    } else if (d > 15 && d <= 30) {
        let MoonCurve = (30 - d) * 1.66;
        MoonCurve = MoonCurve < 1.66 ? 1.66 : MoonCurve;
        root.style.setProperty('--curve', '-' + MoonCurve + 'px');
    } else {
        root.style.setProperty('--curve', '1.66px');
    }
}

generateMoonAccordingDate();
