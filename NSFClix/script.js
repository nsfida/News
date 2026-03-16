/* MOBILE MENU */

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.querySelector(".nav-links");

if(menuToggle){
menuToggle.addEventListener("click", () => {
navLinks.classList.toggle("active");
});
}

/* SMOOTH SCROLL FOR SAME PAGE LINKS */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {

anchor.addEventListener("click", function(e){

const target = document.querySelector(this.getAttribute("href"));

if(target){

e.preventDefault();

const headerOffset = document.querySelector(".header").offsetHeight;

const elementPosition = target.getBoundingClientRect().top;

const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

window.scrollTo({
top: offsetPosition,
behavior: "smooth"
});

navLinks.classList.remove("active");

}

});

});

/* THEME SWITCH */

const body = document.body;
const lightIcon = document.getElementById("lightMode");
const darkIcon = document.getElementById("darkMode");
const logo = document.getElementById("logo");

function setTheme(theme){

if(theme === "light"){

body.classList.add("light");
body.classList.remove("dark");

if(logo){
logo.style.filter = "invert(1)";
}

}
else{

body.classList.add("dark");
body.classList.remove("light");

if(logo){
logo.style.filter = "invert(0)";
}

}

localStorage.setItem("nsf-theme", theme);

}

const savedTheme = localStorage.getItem("nsf-theme");

if(savedTheme){
setTheme(savedTheme);
}else{
setTheme("dark");
}

if(lightIcon){
lightIcon.addEventListener("click", () => setTheme("light"));
}

if(darkIcon){
darkIcon.addEventListener("click", () => setTheme("dark"));
}

/* LIGHTBOX SYSTEM */

function initGallery(){

const galleryItems = document.querySelectorAll(".gallery-item");

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.querySelector(".lightbox-image");
const lightboxDetails = document.querySelector(".lightbox-details");
const closeLightbox = document.querySelector(".close-lightbox");

if(!galleryItems.length) return;

galleryItems.forEach(item => {

const img = item.querySelector("img");

const details = item.querySelector(".photo-details")
? item.querySelector(".photo-details").innerHTML
: "";

img.addEventListener("click", () => {

lightbox.style.display = "flex";
lightboxImg.src = img.src;
lightboxDetails.innerHTML = details;

document.body.style.overflow = "hidden";

});

});

if(closeLightbox){

closeLightbox.addEventListener("click", () => {

lightbox.style.display = "none";
document.body.style.overflow = "auto";

});

}

document.addEventListener("keydown", (e) => {

if(e.key === "Escape"){

lightbox.style.display = "none";
document.body.style.overflow = "auto";

}

});

}

/* SCROLL REVEAL ANIMATION */

const revealItems = document.querySelectorAll(".gallery-item, .album");

if(revealItems.length){

const observer = new IntersectionObserver((entries)=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

entry.target.style.opacity = 1;
entry.target.style.transform = "translateY(0)";

}

});

},{threshold:0.2});

revealItems.forEach(item=>{

item.style.opacity = 0;
item.style.transform = "translateY(60px)";
item.style.transition = "all 1s ease";

observer.observe(item);

});

}

/* INITIALIZE GALLERY IF PRESENT */

initGallery();