/* SMOOTH NAVIGATION SCROLL */

document.querySelectorAll('nav a').forEach(anchor => {

anchor.addEventListener('click', function(e){

e.preventDefault();

const target = document.querySelector(this.getAttribute('href'));

target.scrollIntoView({
behavior: "smooth"
});

});

});



/* LIGHTBOX IMAGE VIEWER */

const images = document.querySelectorAll(".photo-section img");

const lightbox = document.createElement("div");
lightbox.id = "lightbox-viewer";

const lightboxImg = document.createElement("img");

lightbox.appendChild(lightboxImg);

document.body.appendChild(lightbox);



images.forEach(image => {

image.addEventListener("click", () => {

lightbox.style.display = "flex";
lightboxImg.src = image.src;

});

});



/* CLOSE LIGHTBOX */

lightbox.addEventListener("click", () => {

lightbox.style.display = "none";

});



/* ESC KEY CLOSE */

document.addEventListener("keydown", function(e){

if(e.key === "Escape"){

lightbox.style.display = "none";

}

});



/* LAZY LOAD IMAGES */

const lazyImages = document.querySelectorAll("img");

const observer = new IntersectionObserver((entries, observer)=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

const img = entry.target;

img.src = img.src;

observer.unobserve(img);

}

});

});

lazyImages.forEach(img=>{
observer.observe(img);
});



/* SCROLL ANIMATION FOR PHOTO SECTIONS */

const sections = document.querySelectorAll(".photo-section");

const sectionObserver = new IntersectionObserver((entries)=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

entry.target.style.opacity = 1;
entry.target.style.transform = "translateY(0px)";

}

});

},{threshold:0.2});

sections.forEach(section=>{

section.style.opacity = 0;
section.style.transform = "translateY(60px)";
section.style.transition = "all 1s ease";

sectionObserver.observe(section);

});
