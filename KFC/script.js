document.addEventListener("DOMContentLoaded", function () {

let data = [];
let sortedData = [];

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const printButton = document.getElementById("printButton");
const resultContainer = document.getElementById("resultContainer");

searchButton.disabled = true;
printButton.disabled = true;

searchInput.addEventListener("input", function () {

    if (searchInput.value.trim() === "") {
        searchButton.disabled = true;
    } else {
        searchButton.disabled = false;
    }

});

});
