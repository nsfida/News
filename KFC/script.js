document.addEventListener("DOMContentLoaded", function () {

    let data = []; // Load from cards.json
    let currentSort = { column: null, asc: true };

    const searchInput = document.getElementById("searchInput");
    const searchField = document.getElementById("searchField");
    const searchButton = document.getElementById("searchButton");
    const resultContainer = document.getElementById("resultContainer");
    const printButton = document.getElementById("printButton");

    const generateButton = document.getElementById("generateButton");
    const englishConstitution = document.getElementById("englishConstitution");
    const urduConstitution = document.getElementById("urduConstitution");

    /* Buttons */
    printButton.disabled = true;
    searchButton.disabled = true;

    printButton.addEventListener("click", () => window.print());
    generateButton.addEventListener("click", () => window.location.href = "NewCard/login.html");
    englishConstitution.addEventListener("click", () => window.open("English.pdf","_blank"));
    urduConstitution.addEventListener("click", () => window.open("Urdu.pdf","_blank"));

    /* Load JSON data */
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
        renderTable();
    });

    /* Search field change triggers re-render */
    searchField.addEventListener("change", renderTable);

    /* Search button click */
    searchButton.addEventListener("click", renderTable);

    /* Main table render function */
    function renderTable() {
        const term = searchInput.value.trim().toLowerCase();
        const field = searchField.value;

        if(!data.length || term === "") {
            resultContainer.innerHTML = "";
            printButton.disabled = true;
            return;
        }

        let results = data.filter(item => item[field] && item[field].toString().toLowerCase().includes(term));

        if(results.length === 0){
            resultContainer.innerHTML = "<p class='no-data'>No matching results found.</p>";
            printButton.disabled = true;
            return;
        }

        /* Sorting */
        if(currentSort.column){
            results.sort((a,b)=>{
                let valA = a[currentSort.column] ? a[currentSort.column].toString().toLowerCase() : "";
                let valB = b[currentSort.column] ? b[currentSort.column].toString().toLowerCase() : "";
                if(valA < valB) return currentSort.asc ? -1 : 1;
                if(valA > valB) return currentSort.asc ? 1 : -1;
                return 0;
            });
        }

        // Build table
        let table = "<table><thead><tr>";
        for(const key in results[0]){
            table += `<th onclick="sortTable('${key}')">${key}</th>`;
        }
        table += "<th>VIEW CARD</th></tr></thead><tbody>";

        results.forEach(item => {
            table += "<tr>";

            for(const key in item){
                let value = item[key];
                let cellStyle = "";

                /* Highlight Status text only */
                if(key.toLowerCase() === "status"){
                    if(value && value.toLowerCase() === "cancel"){
                        cellStyle = "style='background-color:yellow;color:red;font-weight:bold;text-align:center;'";
                    }
                    if(value && value.toLowerCase() === "active"){
                        cellStyle = "style='background-color:green;color:white;font-weight:bold;text-align:center;'";
                    }
                }

                table += `<td data-label="${key}" ${cellStyle}>${value}</td>`;
            }

            const cardFileName = `e-Cards/${item.name} e-Card.pdf`;
            table += `<td data-label='VIEW CARD'><button onclick="window.open('${cardFileName}','_blank')">VIEW CARD</button></td>`;
            table += "</tr>";
        });

        table += "</tbody></table>";
        resultContainer.innerHTML = table;
        printButton.disabled = false;
    }

    /* Sorting function (called on th click) */
    window.sortTable = function(column){
        if(currentSort.column === column){
            currentSort.asc = !currentSort.asc; // toggle asc/desc
        } else {
            currentSort.column = column;
            currentSort.asc = true;
        }
        renderTable();
    };

});
