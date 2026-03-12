document.addEventListener("DOMContentLoaded", function () {

let data = [
    // Example data structure; replace with your real database array
    {name: "Nadeem Shahzad Fida", Desg:"Committee Member", BG:"O+", mobile:"0501234567", CNo:"746", Status:"Active", Room:"101", Issue:"2026-01-01"},
    {name: "Ali Khan", Desg:"Member", BG:"A+", mobile:"0507654321", CNo:"747", Status:"Active", Room:"102", Issue:"2026-02-01"}
];

const searchInput = document.getElementById("searchInput");
const searchField = document.getElementById("searchField");
const resultContainer = document.getElementById("resultContainer");
const printButton = document.getElementById("printButton");

const generateButton = document.getElementById("generateButton");
const englishConstitution = document.getElementById("englishConstitution");
const urduConstitution = document.getElementById("urduConstitution");

/* Print, New Card, Constitution Buttons */
printButton.disabled = true;

printButton.addEventListener("click", () => window.print());
generateButton.addEventListener("click", () => alert("e-Card generator page will open here."));
englishConstitution.addEventListener("click", () => window.open("constitution-english.pdf","_blank"));
urduConstitution.addEventListener("click", () => window.open("constitution-urdu.pdf","_blank"));

/* Live Search */
searchInput.addEventListener("input", function () {
    const term = searchInput.value.trim().toLowerCase();
    const field = searchField.value;

    if(term === ""){
        resultContainer.innerHTML = "";
        printButton.disabled = true;
        return;
    }

    const results = data.filter(item => item[field].toString().toLowerCase().includes(term));

    if(results.length === 0){
        resultContainer.innerHTML = "<p class='no-data'>No matching results found.</p>";
        printButton.disabled = true;
        return;
    }

    // Build table
    let table = "<table><thead><tr>";
    for(const key in results[0]){
        table += `<th>${key}</th>`;
    }
    table += "</tr></thead><tbody>";

    results.forEach(item => {
        table += "<tr>";
        for(const key in item){
            table += `<td>${item[key]}</td>`;
        }
        table += "</tr>";
    });

    table += "</tbody></table>";

    resultContainer.innerHTML = table;
    printButton.disabled = false;
});
});
