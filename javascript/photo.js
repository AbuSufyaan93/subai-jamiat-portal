const imgBtn = document.querySelectorAll('.gallery-images');
const galleryContainer = document.querySelector('.image-gallery');
const images = document.querySelectorAll('.gallery-img');
const image_btn_container = document.querySelector('.image-btn-container');
const back = document.querySelector('.back');

imgBtn.forEach((img , index)=>{

    img.onclick = ()=>{

        image_btn_container.style.display = 'none';
        galleryContainer.classList.add('active');
        deactivateImages()
        images[index].classList.add('active');

    }

})

function deactivateImages(){

    images.forEach(image =>{

        image.classList.remove('active');

    })

}

back.onclick = ()=>{

    deactivateImages()
    image_btn_container.style.display = "flex";
    galleryContainer.classList.remove('active');

}