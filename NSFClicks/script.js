/* ---------------- SMOOTH NAVIGATION SCROLL ---------------- */

document.querySelectorAll('nav a').forEach(anchor => {

anchor.addEventListener('click', function(e){

e.preventDefault();

const target = document.querySelector(this.getAttribute('href'));

target.scrollIntoView({
behavior:"smooth"
});

});

});



/* ---------------- LOAD GALLERY FROM JSON ---------------- */

fetch("gallery.json")

.then(response => response.json())

.then(data => {

const gallery = document.getElementById("gallery-grid");

data.forEach(photo => {

const item = document.createElement("div");

item.className = "gallery-item";


item.innerHTML = `

<img src="images/${photo.image}" alt="${photo.title}">

<div class="gallery-overlay">

<h3>${photo.title}</h3>

<p>${photo.location}</p>

</div>

<div class="photo-details" style="display:none;">

<p><strong>Camera:</strong> ${photo.camera}</p>

<p><strong>Lens:</strong> ${photo.lens}</p>

<p><strong>Aperture:</strong> ${photo.aperture}</p>

<p><strong>Shutter Speed:</strong> ${photo.shutter}</p>

<p><strong>ISO:</strong> ${photo.iso}</p>

<p class="story">${photo.story}</p>

</div>

`;

gallery.appendChild(item);

});


initializeLightbox();

animateGallery();

});



/* ---------------- LIGHTBOX SYSTEM ---------------- */

function initializeLightbox(){

const galleryItems = document.querySelectorAll(".gallery-item");

const lightbox = document.getElementById("lightbox");

const lightboxImg = document.querySelector(".lightbox-image");

const lightboxDetails = document.querySelector(".lightbox-details");

const closeLightbox = document.querySelector(".close-lightbox");


galleryItems.forEach(item => {

const img = item.querySelector("img");

const details = item.querySelector(".photo-details").innerHTML;


img.addEventListener("click", () => {

lightbox.style.display = "flex";

lightboxImg.src = img.src;

lightboxDetails.innerHTML = details;

document.body.style.overflow = "hidden";

});

});


closeLightbox.addEventListener("click", () => {

lightbox.style.display = "none";

document.body.style.overflow = "auto";

});


document.addEventListener("keydown",(e)=>{

if(e.key==="Escape"){

lightbox.style.display="none";

document.body.style.overflow="auto";

}

});

}



/* ---------------- SCROLL ANIMATION ---------------- */

function animateGallery(){

const gallerySections = document.querySelectorAll(".gallery-item");

const sectionObserver = new IntersectionObserver((entries)=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

entry.target.style.opacity=1;

entry.target.style.transform="translateY(0px)";

}

});

},{threshold:0.2});


gallerySections.forEach(section=>{

section.style.opacity=0;

section.style.transform="translateY(60px)";

section.style.transition="all 1s ease";

sectionObserver.observe(section);

});

}
