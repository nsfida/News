let data = [];
let sortedData = [];
let sortDirection = {};

const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const printButton = document.getElementById('printButton');
const generateButton = document.getElementById('generateButton');
const englishConstitutionButton = document.getElementById('englishConstitution');
const urduConstitutionButton = document.getElementById('urduConstitution');
const resultContainer = document.getElementById('resultContainer');

fetch('cards.json')
.then(res => res.json())
.then(json => {
data = json;
sortedData = [...data];
});

function toggleButtons(){
const hasInput = searchInput.value.trim().length>0;
searchButton.disabled=!hasInput;
printButton.disabled=!hasInput;
}

function searchData(){

const field=document.getElementById('searchField').value;
const value=searchInput.value.toLowerCase();

sortedData=data.filter(item =>
item[field]?.toLowerCase().includes(value)
);

displayResults(sortedData);
}

function displayResults(results){

resultContainer.innerHTML='';

if(results.length>0){

const table=document.createElement('table');

table.innerHTML=`
<thead>
<tr>
<th onclick="sortTable('name')">Member Name</th>
<th onclick="sortTable('CNo')">e-Card Number</th>
<th onclick="sortTable('Desg')">Designation</th>
<th onclick="sortTable('BG')">Blood Type</th>
<th onclick="sortTable('Issue')">e-Card Issue Date</th>
<th onclick="sortTable('mobile')">Mobile</th>
<th onclick="sortTable('Room')">Room</th>
<th onclick="sortTable('Status')">Status</th>
<th>e-Card</th>
</tr>
</thead>

<tbody>

${results.map(item=>`
<tr>
<td>${item.name}</td>
<td>${item.CNo}</td>
<td>${item.Desg}</td>
<td>${item.BG}</td>
<td>${item.Issue}</td>
<td>${item.mobile}</td>
<td>${item.Room}</td>
<td class="${item.Status.toLowerCase()}">${item.Status}</td>
<td><button onclick="viewECard('${item.name}')">VIEW CARD</button></td>
</tr>
`).join('')}

</tbody>
`;

resultContainer.appendChild(table);

}
else{
resultContainer.innerHTML='<p class="no-data">No matching data found.</p>';
}

}

function viewECard(name){

const file=name+' e-Card.pdf';
const path='e-Cards/'+file;

window.open(path,'_blank');

}

function sortTable(field){

const direction=sortDirection[field]==='asc'?'desc':'asc';
sortDirection={[field]:direction};

sortedData.sort((a,b)=>{
if(a[field]>b[field]) return direction==='asc'?1:-1;
if(a[field]<b[field]) return direction==='asc'?-1:1;
return 0;
});

displayResults(sortedData);

}

searchInput.addEventListener('input',toggleButtons);
searchButton.addEventListener('click',searchData);

printButton.addEventListener('click',()=>{
displayResults(sortedData);
setTimeout(()=>window.print(),100);
});

generateButton.addEventListener('click',()=>{
window.location.href='http://127.0.0.1:5000/';
});

englishConstitutionButton.addEventListener('click',()=>{
window.open('English.pdf','_blank');
});

urduConstitutionButton.addEventListener('click',()=>{
window.open('Urdu.pdf','_blank');
});
