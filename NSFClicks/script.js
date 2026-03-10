/* ================= GLOBAL RESET ================= */

document.addEventListener("DOMContentLoaded", () => {

/* ================= SMOOTH NAVIGATION ================= */

document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e){
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        target.scrollIntoView({behavior:"smooth"});
    });
});


/* ================= MOBILE MENU ================= */

const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    menuToggle.classList.toggle('open');
});


/* ================= THEME SWITCH ================= */

const lightBtn = document.getElementById('lightMode');
const darkBtn = document.getElementById('darkMode');
const greyBtn = document.getElementById('greyMode');

lightBtn.addEventListener('click', () => {
    document.body.classList.remove('dark','grey');
    document.body.classList.add('light');
});

darkBtn.addEventListener('click', () => {
    document.body.classList.remove('light','grey');
    document.body.classList.add('dark');
});

greyBtn.addEventListener('click', () => {
    document.body.classList.remove('light','dark');
    document.body.classList.add('grey');
});


/* ================= STAR FIELD BACKGROUND ================= */

const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

window.addEventListener('resize', ()=>{
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initStars();
});

let stars = [];
const numStars = 200;

function Star(){
    this.x = Math.random()*width;
    this.y = Math.random()*height;
    this.radius = Math.random()*1.2;
    this.speed = Math.random()*0.5 + 0.1;
    this.alpha = Math.random();
}

function initStars(){
    stars = [];
    for(let i=0;i<numStars;i++){
        stars.push(new Star());
    }
}
initStars();

function animateStars(){
    ctx.clearRect(0,0,width,height);
    for(let star of stars){
        ctx.beginPath();
        ctx.arc(star.x,star.y,star.radius,0,Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${star.alpha})`;
        ctx.fill();
        star.y -= star.speed;
        if(star.y<0){
            star.y = height;
            star.x = Math.random()*width;
            star.alpha = Math.random();
            star.radius = Math.random()*1.2;
        }
    }
    requestAnimationFrame(animateStars);
}
animateStars();


/* ================= DYNAMIC GALLERY LOADING ================= */

fetch("./gallery.json")
.then(res => res.json())
.then(photos => {
    const galleryGrid = document.getElementById("gallery-grid");

    photos.forEach(photo => {
        const item = document.createElement("div");
        item.classList.add("gallery-item");

        item.innerHTML = `
            <img data-src="images/${photo.image}" alt="${photo.title}" class="lazy">
            <div class="gallery-overlay">
                <h3>${photo.title}</h3>
                <p>${photo.location}</p>
            </div>
            <div class="photo-details" style="display:none;">
                ${photo.camera ? `<p><strong>Camera:</strong> ${photo.camera}</p>` : ""}
                ${photo.lens ? `<p><strong>Lens:</strong> ${photo.lens}</p>` : ""}
                ${photo.aperture ? `<p><strong>Aperture:</strong> ${photo.aperture}</p>` : ""}
                ${photo.shutter ? `<p><strong>Shutter Speed:</strong> ${photo.shutter}</p>` : ""}
                ${photo.iso ? `<p><strong>ISO:</strong> ${photo.iso}</p>` : ""}
                ${photo.story ? `<p class="story">${photo.story}</p>` : ""}
            </div>
        `;
        galleryGrid.appendChild(item);
    });

    initGallery();
})
.catch(err => console.error("Failed to load gallery.json:", err));


/* ================= LIGHTBOX + LAZY LOAD + SCROLL ANIM ================= */

function initGallery(){

    const galleryItems = document.querySelectorAll(".gallery-item");
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.querySelector(".lightbox-image");
    const lightboxDetails = document.querySelector(".lightbox-details");
    const closeLightbox = document.querySelector(".close-lightbox");

    /* LIGHTBOX CLICK */
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

    /* CLOSE LIGHTBOX */
    closeLightbox.addEventListener("click", () => {
        lightbox.style.display = "none";
        document.body.style.overflow = "auto";
    });

    document.addEventListener("keydown",(e)=>{
        if(e.key==="Escape"){
            lightbox.style.display = "none";
            document.body.style.overflow = "auto";
        }
    });

    /* LAZY LOAD */
    const lazyImages = document.querySelectorAll(".lazy");
    const observer = new IntersectionObserver((entries, obs)=>{
        entries.forEach(entry=>{
            if(entry.isIntersecting){
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove("lazy");
                obs.unobserve(img);
            }
        });
    });
    lazyImages.forEach(img=>observer.observe(img));

    /* SCROLL REVEAL */
    const revealItems = document.querySelectorAll(".gallery-item");
    const revealObserver = new IntersectionObserver((entries)=>{
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
        revealObserver.observe(item);
    });
}

}); // DOMContentLoaded
