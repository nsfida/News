/* ---------------- SMOOTH NAVIGATION SCROLL ---------------- */
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e){
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        target.scrollIntoView({behavior:"smooth"});
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

    initGallery(); // Initialize lightbox, lazy load, and scroll animations
  })
  .catch(err => console.error("Failed to load gallery.json:", err));


/* ---------------- GALLERY LIGHTBOX & LAZY LOAD & ANIMATIONS ---------------- */
function initGallery() {
    const galleryItems = document.querySelectorAll(".gallery-item");
    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.querySelector(".lightbox-image");
    const lightboxDetails = document.querySelector(".lightbox-details");
    const closeLightbox = document.querySelector(".close-lightbox");

    // Lightbox click
    galleryItems.forEach(item => {
        const img = item.querySelector("img");
        const details = item.querySelector(".photo-details").innerHTML;

        img.addEventListener("click", () => {
            lightbox.style.display = "flex";
            lightboxImg.src = img.src;
            lightboxDetails.innerHTML = details;
            document.body.style.overflow = "hidden"; // Prevent scroll
        });
    });

    // Close lightbox
    closeLightbox.addEventListener("click", () => {
        lightbox.style.display = "none";
        document.body.style.overflow = "auto";
    });

    // Close on ESC
    document.addEventListener("keydown", (e) => {
        if(e.key === "Escape"){
            lightbox.style.display = "none";
            document.body.style.overflow = "auto";
        }
    });

    /* ---------------- LAZY LOAD IMAGES ---------------- */
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

    /* ---------------- SCROLL ANIMATION FOR GALLERY ---------------- */
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
