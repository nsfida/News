window.addEventListener("load",()=>{
document.getElementById("loader").style.display="none";
});

document.addEventListener("DOMContentLoaded", function () {

let data = [];
let currentSort = { column: null, asc: true };

const searchInput = document.getElementById("searchInput");
const searchField = document.getElementById("searchField");
const resultContainer = document.getElementById("resultContainer");
const printButton = document.getElementById("printButton");

const generateButton = document.getElementById("generateButton");
const englishConstitution = document.getElementById("englishConstitution");
const urduConstitution = document.getElementById("urduConstitution");

printButton.disabled = true;

printButton.addEventListener("click", () => window.print());

generateButton.addEventListener("click", () => window.location.href = "NewCard/login.html");

englishConstitution.addEventListener("click", () => window.open("English.pdf","_blank"));

urduConstitution.addEventListener("click", () => window.open("Urdu.pdf","_blank"));

fetch('cards.json')
.then(response => response.json())
.then(json => data = json)
.catch(err => {

console.error("Error loading JSON:", err);

resultContainer.innerHTML = "<p class='no-data'>Failed to load data.</p>";

});

searchInput.addEventListener("input", function () {

searchButton.disabled = searchInput.value.trim() === "";

renderTable();

});

searchField.addEventListener("change", renderTable);

function renderTable() {

const term = searchInput.value.trim().toLowerCase();
const field = searchField.value;

if(!data.length || term === ""){
resultContainer.innerHTML="";
printButton.disabled=true;
return;
}

let results = data.filter(item => item[field] && item[field].toString().toLowerCase().includes(term));

if(results.length === 0){
resultContainer.innerHTML="<p class='no-data'>No matching results found.</p>";
printButton.disabled=true;
return;
}

if(currentSort.column){
results.sort((a,b)=>{
let valA=a[currentSort.column]?a[currentSort.column].toString().toLowerCase():"";
let valB=b[currentSort.column]?b[currentSort.column].toString().toLowerCase():"";

if(valA<valB) return currentSort.asc?-1:1;
if(valA>valB) return currentSort.asc?1:-1;
return 0;
});
}

let table="<table><thead><tr>";

for(const key in results[0]){
table+=`<th onclick="sortTable('${key}')">${key}</th>`;
}

table+="<th>VIEW CARD</th></tr></thead><tbody>";

results.forEach(item=>{

table+="<tr>";

for(const key in item){

let value=item[key];
let cellStyle="";

if(key.toLowerCase()==="status"){

if(value && value.toLowerCase()==="cancel"){
cellStyle="style='background:yellow;color:red;font-weight:bold;text-align:center;'";
}

if(value && value.toLowerCase()==="active"){
cellStyle="style='background:green;color:white;font-weight:bold;text-align:center;'";
}

}

table+=`<td data-label="${key}" ${cellStyle}>${value}</td>`;
}

const cardFileName=`e-Cards/${item.name} e-Card.pdf`;

table+=`<td data-label='VIEW CARD'><button onclick="window.open('${cardFileName}','_blank')">VIEW CARD</button></td>`;

table+="</tr>";

});

table+="</tbody></table>";

resultContainer.innerHTML=table;

printButton.disabled=false;

}

window.sortTable=function(column){

if(currentSort.column===column){
currentSort.asc=!currentSort.asc;
}
else{
currentSort.column=column;
currentSort.asc=true;
}

renderTable();

};

});
