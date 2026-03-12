document.addEventListener("DOMContentLoaded", function () {

let data = []; // Data from cards.json

const searchInput = document.getElementById("searchInput");
const searchField = document.getElementById("searchField");
const resultContainer = document.getElementById("resultContainer");
const printButton = document.getElementById("printButton");

const generateButton = document.getElementById("generateButton");
const englishConstitution = document.getElementById("englishConstitution");
const urduConstitution = document.getElementById("urduConstitution");

/* Buttons */
printButton.disabled = true;
printButton.addEventListener("click", () => window.print());
generateButton.addEventListener("click", () => alert("e-Card generator page will open here."));
englishConstitution.addEventListener("click", () => window.open("constitution-english.pdf","_blank"));
urduConstitution.addEventListener("click", () => window.open("constitution-urdu.pdf","_blank"));

/* Load data from cards.json */
fetch('cards.json')
  .then(response => response.json())
  .then(json => data = json)
  .catch(err => {
      console.error("Error loading JSON:", err);
      resultContainer.innerHTML = "<p class='no-data'>Failed to load data.</p>";
  });

/* Enable Search button */
searchInput.addEventListener("input", function () {
    searchButton.disabled = searchInput.value.trim() === "";
});

/* Live Search with VIEW CARD */
searchInput.addEventListener("input", function () {
    const term = searchInput.value.trim().toLowerCase();
    const field = searchField.value;

    if(term === ""){
        resultContainer.innerHTML = "";
        printButton.disabled = true;
        return;
    }

    const results = data.filter(item => item[field] && item[field].toString().toLowerCase().includes(term));

    if(results.length === 0){
        resultContainer.innerHTML = "<p class='no-data'>No matching results found.</p>";
        printButton.disabled = true;
        return;
    }

    // Build table with VIEW CARD
    let table = "<table><thead><tr>";
    for(const key in results[0]){
        table += `<th>${key}</th>`;
    }
    table += "<th>VIEW CARD</th></tr></thead><tbody>";

    results.forEach(item => {
        table += "<tr>";
        for(const key in item){
            table += `<td>${item[key]}</td>`;
        }
        const cardFileName = `e-Cards/${item.name} e-Card.pdf`;
        table += `<td><button onclick="window.open('${cardFileName}','_blank')">VIEW CARD</button></td>`;
        table += "</tr>";
    });

    table += "</tbody></table>";

    resultContainer.innerHTML = table;
    printButton.disabled = false;
});
});
