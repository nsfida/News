// SELECT ELEMENTS

const galleryImages = document.querySelectorAll(".gallery-grid img");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const closeBtn = document.getElementById("close");


// OPEN LIGHTBOX

galleryImages.forEach(image => {

image.addEventListener("click", () => {

lightbox.style.display = "flex";

lightboxImg.src = image.src;

});

});


// CLOSE BUTTON

closeBtn.addEventListener("click", () => {

lightbox.style.display = "none";

});


// CLOSE WHEN CLICKING OUTSIDE IMAGE

lightbox.addEventListener("click", (e) => {

if(e.target !== lightboxImg){

lightbox.style.display = "none";

}

});


// ESC KEY CLOSE

document.addEventListener("keydown", (e) => {

if(e.key === "Escape"){

lightbox.style.display = "none";

}

});