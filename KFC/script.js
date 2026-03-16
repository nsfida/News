document.addEventListener("DOMContentLoaded", function () {

    let data = [];
    let currentSort = { column: null, asc: true };
    let loggedInUsername = ""; // store username after login
    let loggedInCardNo = ""; // store logged-in card number
    const allowedFullAccess = [
        "746-210-001",
        "746-210-011",
        "746-210-040",
        "746-210-006",
        "746-210-007",
        "746-210-008",
        "746-210-021"
    ];

    const loginOverlay = document.getElementById("loginOverlay");
    const loginButton = document.getElementById("loginButton");
    const loginUser = document.getElementById("loginUser");
    const loginPass = document.getElementById("loginPass");
    const loginError = document.getElementById("loginError");

    const searchInput = document.getElementById("searchInput");
    const searchField = document.getElementById("searchField");
    const searchButton = document.getElementById("searchButton");
    const resultContainer = document.getElementById("resultContainer");
    const printButton = document.getElementById("printButton");

    const generateButton = document.getElementById("generateButton");
    const englishConstitution = document.getElementById("englishConstitution");
    const urduConstitution = document.getElementById("urduConstitution");

    printButton.disabled = true;
    searchButton.disabled = true;

    printButton.addEventListener("click", () => window.print());
    generateButton.addEventListener("click", () => window.location.href = "NewCard/login.html");
    englishConstitution.addEventListener("click", () => window.open("English.pdf","_blank"));
    urduConstitution.addEventListener("click", () => window.open("Urdu.pdf","_blank"));

    // Load JSON
    fetch('https://livenews.live/KFC/cards.json')
        .then(response => response.json())
        .then(json => data = json)
        .catch(err => {
            console.error("Error loading JSON:", err);
            resultContainer.innerHTML = "<p class='no-data'>Failed to load data.</p>";
        });

    /* LOGIN SYSTEM WITH STATUS CHECK, ANIMATION, AND PRIVACY */
    loginButton.addEventListener("click", function(){

        let user = loginUser.value.trim().toLowerCase();
        let pass = loginPass.value.trim();

        if(!user || !pass){
            loginError.innerText = "Enter username and password";
            return;
        }

        let valid = false;
        let cancelled = false;
        let cardNoOfUser = "";

        data.forEach(card=>{
            let names = card.name.trim().toLowerCase().split(" ");
            let username = names[0] + names[names.length-1]; // first + last name

            let cnoParts = card.CNo.split("-");
            let password = cnoParts[cnoParts.length-1]; // last part of CNo

            if(user === username && pass === password){
                if(card.Status && card.Status.toLowerCase() === "active"){
                    valid = true; // active card → login allowed
                    cardNoOfUser = card.CNo;
                } else {
                    cancelled = true; // card is cancelled
                }
            }
        });

        if(valid){
            loggedInUsername = user; // save username
            loggedInCardNo = cardNoOfUser; // save card number
            loginOverlay.classList.add("fadeOut");
            setTimeout(() => {
                loginOverlay.style.display = "none";
                renderTable(); // render table immediately with masking rules
            }, 800);
        } else if(cancelled){
            loginError.innerText = "This user cannot login as the card is already cancelled.";
        } else {
            loginError.innerText = "Invalid login details";
        }

    });

    /* SEARCH SYSTEM */
    searchInput.addEventListener("input", function () {
        searchButton.disabled = searchInput.value.trim() === "";
        renderTable();
    });

    searchField.addEventListener("change", renderTable);
    searchButton.addEventListener("click", renderTable);

    function renderTable() {

        const term = searchInput.value.trim().toLowerCase();
        const field = searchField.value;

        if(!data.length || term === ""){
            resultContainer.innerHTML = "";
            printButton.disabled = true;
            return;
        }

        let results = data.filter(item => item[field] && item[field].toString().toLowerCase().includes(term));

        if(results.length===0){
            resultContainer.innerHTML = "<p class='no-data'>No matching results found.</p>";
            printButton.disabled = true;
            return;
        }

        if(currentSort.column){
            results.sort((a,b)=>{
                let valA = a[currentSort.column] ? a[currentSort.column].toString().toLowerCase() : "";
                let valB = b[currentSort.column] ? b[currentSort.column].toString().toLowerCase() : "";

                if(valA < valB) return currentSort.asc ? -1 : 1;
                if(valA > valB) return currentSort.asc ? 1 : -1;
                return 0;
            });
        }

        let table = "<table><thead><tr>";
        for(const key in results[0]){
            table += `<th onclick="sortTable('${key}')">${key}</th>`;
        }
        table += "<th>VIEW CARD</th></tr></thead><tbody>";

        results.forEach(item=>{
            table += "<tr>";
            for(const key in item){
                let value = item[key];

                // MASKING LOGIC
                let names = item.name.trim().toLowerCase().split(" ");
                let usernameOfRow = names[0] + names[names.length-1];

                let isFullAccessUser = allowedFullAccess.includes(loggedInCardNo);
                if(!isFullAccessUser && loggedInUsername && loggedInUsername !== usernameOfRow){
                    if(key === "name"){
                        if(names.length > 1){
                            value = names[0] + " ***"; // mask last name
                        } else {
                            value = "***";
                        }
                    }
                    if(key === "CNo"){
                        value = "***"; // mask card number
                    }
                }

                let cellStyle = "";
                if(key.toLowerCase()==="status"){
                    if(value && value.toLowerCase()==="cancel") cellStyle="class='cancel'";
                    if(value && value.toLowerCase()==="active") cellStyle="class='active'";
                }

                table += `<td data-label="${key}" ${cellStyle}>${value}</td>`;
            }

            // VIEW CARD BUTTON LOGIC
            let canViewCard = allowedFullAccess.includes(loggedInCardNo) || (item.CNo === loggedInCardNo);
            const cardFileName = `e-Cards/${item.name} e-Card.pdf`;
            table += `<td data-label='VIEW CARD'><button onclick="window.open('${cardFileName}','_blank')" ${canViewCard ? "" : "disabled"}>VIEW CARD</button></td>`;
            table += "</tr>";
        });

        table += "</tbody></table>";
        resultContainer.innerHTML = table;
        printButton.disabled = false;
    }

    window.sortTable = function(column){
        if(currentSort.column===column){
            currentSort.asc = !currentSort.asc;
        } else {
            currentSort.column = column;
            currentSort.asc = true;
        }
        renderTable();
    };

});
