/* NSF CLIX GALLERY LOADER */

const galleryContainer = document.getElementById("galleryContainer");

async function loadGallery() {

if (!galleryContainer) return;

try {

const response = await fetch("gallery.json");
const data = await response.json();

/* GET ALBUM FROM URL */

const params = new URLSearchParams(window.location.search);
const album = params.get("album");

let filteredPhotos = data;

/* FILTER BY ALBUM */

if (album) {
filteredPhotos = data.filter(photo => photo.album === album);
}

/* UPDATE PAGE TITLE */

const albumTitle = document.getElementById("albumTitle");

if (albumTitle && album) {
albumTitle.innerText = album.charAt(0).toUpperCase() + album.slice(1);
}

/* BUILD GALLERY */

filteredPhotos.forEach(photo => {

const item = document.createElement("div");
item.className = "gallery-item";

item.innerHTML = `

<img src="images/${photo.album}/${photo.image}" alt="${photo.title}" loading="lazy">

<div class="photo-details">

<h3>${photo.title}</h3>

<p><strong>Location:</strong> ${photo.location}</p>
<p><strong>Camera:</strong> ${photo.camera}</p>
<p><strong>Lens:</strong> ${photo.lens}</p>
<p><strong>Aperture:</strong> ${photo.aperture}</p>
<p><strong>Shutter:</strong> ${photo.shutter}</p>
<p><strong>ISO:</strong> ${photo.iso}</p>

<p class="story">${photo.story}</p>

</div>

`;

galleryContainer.appendChild(item);

});

/* ACTIVATE LIGHTBOX AFTER LOADING */

if (typeof initGallery === "function") {
initGallery();
}

} catch (error) {

console.error("Gallery loading error:", error);

galleryContainer.innerHTML = "<p>Unable to load gallery.</p>";

}

}

loadGallery();
