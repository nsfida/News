/* ================== GLOBAL ================== */
const logo = document.getElementById("logo");
const lightBtn = document.getElementById("lightMode");
const darkBtn = document.getElementById("darkMode");
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.querySelector(".nav-links");

/* ---------------- THEME TOGGLE ---------------- */
lightBtn.addEventListener("click", () => {
    document.body.classList.add("light");
    document.body.classList.remove("dark");
    logo.style.filter = "invert(1)";
});

darkBtn.addEventListener("click", () => {
    document.body.classList.add("dark");
    document.body.classList.remove("light");
    logo.style.filter = "invert(0)";
});

/* ---------------- MOBILE MENU TOGGLE ---------------- */
menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("active");
});

/* ---------------- SMOOTH SCROLL ---------------- */
document.querySelectorAll('nav a, .nav-links a, .hero-btn').forEach(anchor => {
    anchor.addEventListener('click', function(e){
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        target.scrollIntoView({behavior:"smooth"});
        if(navLinks.classList.contains("active")) navLinks.classList.remove("active");
    });
});

/* ---------------- DYNAMIC GALLERY LOADING FROM JSON ---------------- */
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

/* ---------------- GALLERY LIGHTBOX & LAZY LOAD & ANIMATIONS ---------------- */
function initGallery() {
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

    document.addEventListener("keydown", (e) => {
        if(e.key === "Escape"){
            lightbox.style.display = "none";
            document.body.style.overflow = "auto";
        }
    });

    /* ---------------- LAZY LOAD ---------------- */
    const lazyImages = document.querySelectorAll(".gallery-item img");
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if(entry.isIntersecting){
                const img = entry.target;
                img.src = img.src; // triggers loading
                obs.unobserve(img);
            }
        });
    });
    lazyImages.forEach(img => observer.observe(img));

    /* ---------------- SCROLL ANIMATION ---------------- */
    const gallerySections = document.querySelectorAll(".gallery-item");
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting){
                entry.target.style.opacity = 1;
                entry.target.style.transform = "translateY(0px)";
            }
        });
    }, {threshold:0.2});

    gallerySections.forEach(section => {
        section.style.opacity = 0;
        section.style.transform = "translateY(60px)";
        section.style.transition = "all 1s ease";
        sectionObserver.observe(section);
    });
}

/* ---------------- HERO STARS BACKGROUND ---------------- */
const starsContainer = document.querySelector(".hero-stars");
for(let i=0; i<150; i++){
    const star = document.createElement("div");
    star.classList.add("star");
    star.style.top = Math.random()*100 + "%";
    star.style.left = Math.random()*100 + "%";
    star.style.width = Math.random()*2 + 1 + "px";
    star.style.height = star.style.width;
    star.style.animationDuration = (Math.random()*3 + 2) + "s";
    starsContainer.appendChild(star);
}
