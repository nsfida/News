document.addEventListener("DOMContentLoaded", function () {

    let data = [];
    let currentSort = { column: null, asc: true };
    let loggedInUsername = "";
    let loggedInCardNo = "";
    let loggedInFullName = "";
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

    /* LOGIN SYSTEM */
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
        let fullNameOfUser = "";

        data.forEach(card=>{
            let names = card.name.trim().toLowerCase().split(" ");
            let username = names[0] + names[names.length-1];

            let cnoParts = card.CNo.split("-");
            let password = cnoParts[cnoParts.length-1];

            if(user === username && pass === password){
                if(card.Status && card.Status.toLowerCase() === "active"){
                    valid = true; 
                    cardNoOfUser = card.CNo;
                    fullNameOfUser = card.name;
                } else {
                    cancelled = true;
                }
            }
        });

        if(valid){
            loggedInUsername = user;
            loggedInCardNo = cardNoOfUser;
            loggedInFullName = fullNameOfUser;

            loginOverlay.classList.add("fadeOut");

            setTimeout(() => {
                loginOverlay.style.display = "none";
                showFullScreenWelcome(loggedInFullName);
                showLoggedInUser(loggedInFullName);
                renderTable(); 
            }, 800);

        } else if(cancelled){
            loginError.innerText = "This user cannot login as the card is already cancelled.";
        } else {
            loginError.innerText = "Invalid login details";
        }

    });

    /* FULLSCREEN WELCOME ANIMATION */
    function showFullScreenWelcome(fullName){
        const welcomeOverlay = document.createElement("div");
        welcomeOverlay.style.position = "fixed";
        welcomeOverlay.style.top = "0";
        welcomeOverlay.style.left = "0";
        welcomeOverlay.style.width = "100%";
        welcomeOverlay.style.height = "100%";
        welcomeOverlay.style.background = "linear-gradient(135deg,#0d3c91,#125fa6)";
        welcomeOverlay.style.color = "#fff";
        welcomeOverlay.style.display = "flex";
        welcomeOverlay.style.flexDirection = "column";
        welcomeOverlay.style.alignItems = "center";
        welcomeOverlay.style.justifyContent = "center";
        welcomeOverlay.style.zIndex = "9999";
        welcomeOverlay.style.fontFamily = "Calibri, sans-serif";
        welcomeOverlay.style.opacity = "0";
        welcomeOverlay.style.transform = "scale(0.8)";
        welcomeOverlay.style.transition = "opacity 0.6s ease, transform 0.6s ease";
        welcomeOverlay.style.padding = "20px";
        welcomeOverlay.style.textAlign = "center";

        const message = document.createElement("div");
        message.innerText = `Welcome, ${fullName}`;
        message.style.fontSize = "8vw";
        message.style.fontWeight = "bold";
        message.style.marginBottom = "1rem";
        message.style.wordBreak = "break-word";

        const subMessage = document.createElement("div");
        subMessage.innerText = "Loading your dashboard...";
        subMessage.style.fontSize = "4vw";
        subMessage.style.opacity = "0.8";

        welcomeOverlay.appendChild(message);
        welcomeOverlay.appendChild(subMessage);
        document.body.appendChild(welcomeOverlay);

        setTimeout(() => {
            welcomeOverlay.style.opacity = "1";
            welcomeOverlay.style.transform = "scale(1)";
        }, 50);

        setTimeout(() => {
            welcomeOverlay.style.opacity = "0";
            welcomeOverlay.style.transform = "scale(1.2)";
        }, 3000);

        setTimeout(() => {
            document.body.removeChild(welcomeOverlay);
        }, 3800);
    }

    /* SHOW LOGGED-IN USER BELOW URDU TITLE */
    function showLoggedInUser(fullName){
        let existing = document.querySelector(".logged-in-user");
        if(existing) existing.remove();

        const uaetitle = document.querySelector(".uae-text");
        const userDiv = document.createElement("div");
        userDiv.className = "logged-in-user";
        userDiv.innerHTML = `<i class="fas fa-user"></i> ${fullName}`;
        uaetitle.insertAdjacentElement("afterend", userDiv);

        userDiv.style.opacity = "0";
        setTimeout(()=> userDiv.style.opacity = "1", 50);
    }

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

                let names = item.name.trim().split(" ");
                let usernameOfRow = names[0].toLowerCase() + names[names.length-1].toLowerCase();
                let isFullAccessUser = allowedFullAccess.includes(loggedInCardNo);

                if(!isFullAccessUser && loggedInUsername && loggedInUsername.toLowerCase() !== usernameOfRow){
                    if(key === "name" && names.length>1){
                        value = names.slice(0,-1).join(" ") + " ***";
                    }
                    if(key === "CNo"){
                        let parts = item.CNo.split("-");
                        value = parts.slice(0,-1).join("-") + "-***";
                    }
                }

                let cellStyle = "";
                if(key.toLowerCase()==="status"){
                    if(value && value.toLowerCase()==="cancel") cellStyle="class='cancel'";
                    if(value && value.toLowerCase()==="active") cellStyle="class='active'";
                }

                table += `<td data-label="${key}" ${cellStyle}>${value}</td>`;
            }

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
