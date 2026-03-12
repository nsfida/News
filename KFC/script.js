document.addEventListener("DOMContentLoaded", function () {

let data = [];
let sortedData = [];

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const printButton = document.getElementById("printButton");
const resultContainer = document.getElementById("resultContainer");

const generateButton = document.getElementById("generateButton");
const englishConstitution = document.getElementById("englishConstitution");
const urduConstitution = document.getElementById("urduConstitution");

searchButton.disabled = true;
printButton.disabled = true;

/* Enable Search Button */

searchInput.addEventListener("input", function () {

    if (searchInput.value.trim() === "") {
        searchButton.disabled = true;
    } else {
        searchButton.disabled = false;
    }

});

/* Search Button */

searchButton.addEventListener("click", function () {

    const term = searchInput.value.trim();

    if(term === ""){
        return;
    }

    resultContainer.innerHTML = "<p class='no-data'>Search feature working. Connect your data source.</p>";
    printButton.disabled = false;

});

/* Print Button */

printButton.addEventListener("click", function () {
    window.print();
});

/* New e-Card */

generateButton.addEventListener("click", function () {
    alert("e-Card generator page will open here.");
});

/* Constitution English */

englishConstitution.addEventListener("click", function () {
    window.open("constitution-english.pdf", "_blank");
});

/* Constitution Urdu */

urduConstitution.addEventListener("click", function () {
    window.open("constitution-urdu.pdf", "_blank");
});

});
