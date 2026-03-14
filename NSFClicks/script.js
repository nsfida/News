/* SMOOTH SCROLL NAVIGATION */

document.querySelectorAll('.nav-links a').forEach(anchor => {
    anchor.addEventListener('click', function(e){

        const target = document.querySelector(this.getAttribute('href'));
        if(!target) return;

        e.preventDefault();

        const headerOffset = document.querySelector('.header').offsetHeight;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });

        navLinks.classList.remove('active');
    });
});


/* MOBILE MENU */

const menuToggle = document.getElementById('menuToggle');
const navLinks = document.querySelector('.nav-links');

if(menuToggle && navLinks){

menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    navLinks.classList.toggle('active');
});

/* CLOSE MENU IF CLICKING OUTSIDE */

document.addEventListener("click", (e) => {
    if(!menuToggle.contains(e.target) && !navLinks.contains(e.target)){
        navLinks.classList.remove("active");
    }
});

}


/* THEME SWITCH */

const body = document.body;
const lightIcon = document.getElementById('lightMode');
const darkIcon = document.getElementById('darkMode');
const logo = document.getElementById('logo');

function setTheme(theme){

    if(theme === 'light'){
        body.classList.add('light');
        body.classList.remove('dark');

        if(logo){
            logo.style.filter = 'invert(1)';
        }

    }else{
        body.classList.add('dark');
        body.classList.remove('light');

        if(logo){
            logo.style.filter = 'invert(0)';
        }
    }

    localStorage.setItem('nsf-theme', theme);
}

const savedTheme = localStorage.getItem('nsf-theme');

if(savedTheme){
    setTheme(savedTheme);
}else{
    setTheme('dark');
}

if(lightIcon){
lightIcon.addEventListener('click', () => setTheme('light'));
}

if(darkIcon){
darkIcon.addEventListener('click', () => setTheme('dark'));
}


/* LOAD GALLERY */

fetch("./gallery.json")
.then(res => res.json())
.then(photos => {

const galleryGrid = document.querySelector(".gallery-grid");

photos.forEach(photo => {

const item = document.createElement("div");
item.classList.add("gallery-item");

item.innerHTML = `
<img src="images/${photo.image}" alt="${photo.title}">
<div class="gallery-overlay">
<h3>${photo.title}</h3>
<p>${photo.location}</p>
</div>

<div class="photo-details" style="display:none;">
${photo.camera ? <p><strong>Camera:</strong> ${photo.camera}</p> : ""}
${photo.lens ? <p><strong>Lens:</strong> ${photo.lens}</p> : ""}
${photo.aperture ? <p><strong>Aperture:</strong> ${photo.aperture}</p> : ""}
${photo.shutter ? <p><strong>Shutter Speed:</strong> ${photo.shutter}</p> : ""}
${photo.iso ? <p><strong>ISO:</strong> ${photo.iso}</p> : ""}
${photo.story ? <p class="story">${photo.story}</p> : ""}
</div>
`;

galleryGrid.appendChild(item);

});

initGallery();

})
.catch(err => console.error("Failed to load gallery.json:", err));


/* GALLERY + LIGHTBOX */

function initGallery(){

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


/* LAZY IMAGE OBSERVER */

const lazyImages = document.querySelectorAll(".gallery-item img");

const observer = new IntersectionObserver((entries, obs) => {

entries.forEach(entry => {

if(entry.isIntersecting){

const img = entry.target;
img.src = img.src;

obs.unobserve(img);

}

});

});

lazyImages.forEach(img => observer.observe(img));


/* SCROLL ANIMATION */

const gallerySections = document.querySelectorAll(".gallery-item");

const sectionObserver = new IntersectionObserver((entries) => {

entries.forEach(entry => {

if(entry.isIntersecting){

entry.target.style.opacity = 1;
entry.target.style.transform = "translateY(0px)";

}

});

},{threshold:0.2});


gallerySections.forEach(section => {

section.style.opacity = 0;
section.style.transform = "translateY(60px)";
section.style.transition = "all 1s ease";

sectionObserver.observe(section);

});

}


/* CLOCK */

const time = document.getElementById("time");
const ampm = document.getElementById("ampm");
const date = document.getElementById("date");
const day = document.getElementById("day");

function pad(n){
return String(n).padStart(2,"0");
}

function clock(){

const now = new Date();

let h = now.getHours();
let m = now.getMinutes();
let s = now.getSeconds();

let AmPm = h >= 12 ? "PM" : "AM";

h = h % 12 || 12;

if(time){
time.textContent = ${pad(h)}:${pad(m)}:${pad(s)};
}

if(ampm){
ampm.textContent = AmPm;
}

if(date){
date.textContent = now.toLocaleDateString("en-US",{
day:"numeric",
month:"long",
year:"numeric"
});
}

if(day){
day.textContent = now.toLocaleDateString("en-US",{
weekday:"long"
});
}

}

clock();
setInterval(clock,1000);
