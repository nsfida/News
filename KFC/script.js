import { data } from './cards.json';

const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const printButton = document.getElementById('printButton');
const generateButton = document.getElementById('generateButton');
const englishConstitutionButton = document.getElementById('englishConstitution');
const urduConstitutionButton = document.getElementById('urduConstitution');
const resultContainer = document.getElementById('resultContainer');

searchInput.addEventListener('input', () => {
    searchButton.disabled = searchInput.value.trim() === '';
});

searchButton.addEventListener('click', () => {
    const field = document.getElementById('searchField').value;
    const term = searchInput.value.trim().toLowerCase();
    const filtered = data.filter(item => {
        return item[field] && item[field].toString().toLowerCase().includes(term);
    });
    displayResults(filtered);
    printButton.disabled = filtered.length === 0;
});

printButton.addEventListener('click', () => {
    window.print();
});

generateButton.addEventListener('click', () => {
    alert('Redirecting to New e-Card generation page.');
});

englishConstitutionButton.addEventListener('click', () => {
    alert('Opening English Constitution.');
});

urduConstitutionButton.addEventListener('click', () => {
    alert('Opening Urdu Constitution.');
});

function displayResults(list) {
    if (list.length === 0) {
        resultContainer.innerHTML = '<p class="no-data">No results found.</p>';
        return;
    }

    let table = '<table><thead><tr>';
    table += '<th>Name</th><th>Designation</th><th>Blood Type</th><th>Mobile</th><th>e-Card Number</th><th>Status</th><th>Room</th><th>Issue Date</th>';
    table += '</tr></thead><tbody>';

    list.forEach(item => {
        table += `<tr>
            <td>${item.name}</td>
            <td>${item.Desg}</td>
            <td>${item.BG}</td>
            <td>${item.mobile}</td>
            <td>${item.CNo}</td>
            <td class="${item.Status.toLowerCase()}">${item.Status}</td>
            <td>${item.Room}</td>
            <td>${item.Issue}</td>
        </tr>`;
    });

    table += '</tbody></table>';
    resultContainer.innerHTML = table;
}
