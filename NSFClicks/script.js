/* ================= DOCUMENT READY ================= */
document.addEventListener("DOMContentLoaded", () => {

  /* ================= SMOOTH NAVIGATION ================= */
  document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e){
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      target.scrollIntoView({behavior:"smooth"});

      // Close mobile menu on click
      const navLinks = document.querySelector('.nav-links');
      if(navLinks.classList.contains('active')) navLinks.classList.remove('active');
    });
  });

  /* ================= MOBILE MENU TOGGLE ================= */
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.querySelector('.nav-links');
  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });

  /* ================= THEME TOGGLE ICONS ================= */
  const body = document.body;
  document.getElementById('lightMode').addEventListener('click', () => {
    body.classList.remove('dark','grey');
    body.classList.add('light');
  });
  document.getElementById('darkMode').addEventListener('click', () => {
    body.classList.remove('light','grey');
    body.classList.add('dark');
  });
  document.getElementById('greyMode').addEventListener('click', () => {
    body.classList.remove('light','dark');
    body.classList.add('grey');
  });

  /* ================= HERO STAR PARTICLES ================= */
  const heroStarsContainer = document.querySelector(".hero-stars");
  const numHeroStars = 80;
  for(let i=0;i<numHeroStars;i++){
    const star = document.createElement("span");
    star.style.top = Math.random()*100 + "%";
    star.style.left = Math.random()*100 + "%";
    star.style.width = (Math.random()*2+1)+"px";
    star.style.height = star.style.width;
    star.style.opacity = Math.random()*0.7 + 0.3;
    star.style.animationDuration = (Math.random()*10 + 5)+"s";
    heroStarsContainer.appendChild(star);
  }

  // Parallax hero content on mouse move
  const heroContent = document.querySelector(".hero-content");
  document.addEventListener("mousemove", e=>{
    const x = (window.innerWidth/2 - e.clientX)/50;
    const y = (window.innerHeight/2 - e.clientY)/50;
    heroContent.style.transform = `translate(${x}px, ${y}px)`;
  });

  /* ================= DYNAMIC GALLERY LOADING ================= */
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

  /* ================= GALLERY LIGHTBOX & LAZY LOAD & ANIMATIONS ================= */
  function initGallery(){
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
        document.body.style.overflow = "hidden";
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

    // Lazy load images
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

    // Scroll animation for gallery items
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

}); // End DOMContentLoaded
