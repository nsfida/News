document.addEventListener("DOMContentLoaded", function () {

    // ------------------- PRINT FOOTER -------------------
    function createPrintFooter() {
        const existing = document.querySelector(".print-footer");
        if (existing) existing.remove();

        const footer = document.createElement("div");
        footer.className = "print-footer";
        footer.innerHTML = `
            <a href="#"><i class="fas fa-users"></i>  <span>CABINET MEMBERS</span></a>
            <a href="#"><i class="fas fa-user"></i> Arbab M. Rizwan <span>President</span></a>
            <a href="#"><i class="fas fa-user"></i> Salar Khan <span>Vice President</span></a>
            <a href="#"><i class="fas fa-user"></i> Ahmad A. Khattak <span>Acting President</span></a>
            <a href="#"><i class="fas fa-user"></i> Naveed A. Liaqat <span>Finance Manager</span></a>
            <a href="#"><i class="fas fa-user"></i> Nadeem Shahzad Fida <span>Media Manager</span></a>
            <a href="#"><i class="fas fa-user"></i> Sabir Ali <span>Joint Finance Secretary</span></a>
            <a href="#"><i class="fas fa-user"></i> Amjad Ali Khattak <span>General Secretary</span></a>
        `;
        document.body.appendChild(footer);
    }

    window.onbeforeprint = createPrintFooter;
    window.onafterprint = () => {
        const footer = document.querySelector(".print-footer");
        if (footer) footer.remove();
    };

    // ------------------- VARIABLES -------------------
    let data = [];
    let currentSort = { column: null, asc: true };

    let loggedInUsername = "";
    let loggedInCardNo = "";
    let loggedInFullName = "";
    let loggedInStatus = "";
    let isLoggedIn = false;

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

const toggle = document.getElementById('menuToggle');
const menu = document.getElementById('menuList');

toggle.addEventListener('click', () => {
  menu.classList.toggle('show');
});
document.addEventListener('click', function (e) {
  if (!menu.contains(e.target) && !toggle.contains(e.target)) {
    menu.classList.remove('show');
  }
});

    printButton.disabled = true;
    searchButton.disabled = true;

    // ------------------- BUTTON EVENTS -------------------
    printButton.addEventListener("click", () => window.print());
    generateButton.addEventListener("click", () => window.location.href = "NewCard/login.html");
    englishConstitution.addEventListener("click", () => window.open("English.pdf","_blank"));
    urduConstitution.addEventListener("click", () => window.open("Urdu.pdf","_blank"));

    // ------------------- LOAD DATA -------------------
    function loadData(){
        const token = Math.random().toString(36).substring(2);
        fetch(`https://livenews.live/KFC/card2.json?t=${token}`)
            .then(response => response.json())
            .then(json => data = json)
            .catch(err => {
                console.error("Error loading JSON:", err);
                resultContainer.innerHTML = "<p class='no-data'>Failed to load data.</p>";
            });
    }
    loadData();

    // ------------------- CHECK SAVED LOGIN -------------------
    const savedLogin = localStorage.getItem("kfcLogin");
    if(savedLogin){
        const session = JSON.parse(savedLogin);
        loggedInUsername = session.username;
        loggedInCardNo = session.cardNo;
        loggedInFullName = session.fullName;
        loggedInStatus = session.status;
        isLoggedIn = true;

        loginOverlay.style.display = "none";
        showWelcomeBox(loggedInFullName);
        showLoggedInUser(loggedInFullName);
    }
if (isLoggedIn) {
    if (!allowedFullAccess.includes(loggedInCardNo)) {
        generateButton.disabled = true;          // disable the button
        generateButton.title = "Full Access members only";  // optional tooltip
        generateButton.style.cursor = "not-allowed";
    } else {
        generateButton.disabled = false;
    }
} else {
    generateButton.disabled = true;  // default for not logged-in users
}
    // ------------------- LOGIN SYSTEM -------------------
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
        let statusOfUser = "";

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
                    statusOfUser = card.Status;
                } else {
                    cancelled = true;
                }
            }
        });

        if(valid){
            loggedInUsername = user;
            loggedInCardNo = cardNoOfUser;
            loggedInFullName = fullNameOfUser;
            loggedInStatus = statusOfUser;
            isLoggedIn = true;

            localStorage.setItem("kfcLogin", JSON.stringify({
                username: loggedInUsername,
                cardNo: loggedInCardNo,
                fullName: loggedInFullName,
                status: loggedInStatus
            }));

            loginOverlay.classList.add("fadeOut");
            setTimeout(() => {
                loginOverlay.style.display = "none";
                showWelcomeBox(loggedInFullName);
                showLoggedInUser(loggedInFullName);
            }, 800);
        }
        else if(cancelled){
            loginError.innerText = "This user cannot login as the card is already cancelled.";
        }
        else{
            loginError.innerText = "Invalid login details";
        }
    });

    // ------------------- WELCOME MESSAGE -------------------
    function showWelcomeBox(fullName){
        const box = document.createElement("div");
        box.className="welcome-box";
        box.innerText = `Welcome, ${fullName}`;
        document.body.appendChild(box);
        setTimeout(()=>{
            box.remove();
        },3500);
    }

    // ------------------- LOGGED IN USER -------------------
function showLoggedInUser(fullName){
    let existing = document.querySelector(".logged-in-user");
    if(existing) existing.remove();

    const uaetitle = document.querySelector(".uae-text");

    // Try .png first, then .jpg, then default photo.png
    function getProfileImagePath(cardNo) {
        const basePath = `static/images/photos/${cardNo}`;
        const defaultPath = "static/images/photos/photo.png";

        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(`${basePath}.png`);
            img.onerror = () => {
                const imgJpg = new Image();
                imgJpg.onload = () => resolve(`${basePath}.jpg`);
                imgJpg.onerror = () => resolve(defaultPath);
                imgJpg.src = `${basePath}.jpg`;
            };
            img.src = `${basePath}.png`;
        });
    }

    getProfileImagePath(loggedInCardNo).then(profileImgPath => {
        const userDiv = document.createElement("div");
        userDiv.className = "logged-in-user";

        userDiv.innerHTML = `
            <img src="${profileImgPath}" class="user-avatar">
            <span>Welcome, ${fullName}</span>
        `;

        uaetitle.insertAdjacentElement("afterend", userDiv);

        const profileBox = document.createElement("div");
        profileBox.className = "user-dropdown";

        const accessType = allowedFullAccess.includes(loggedInCardNo) ? "Full Access" : "Limited Access";

        profileBox.innerHTML = `
            <div class="profile-banner">
                <img src="${profileImgPath}" class="profile-large">
                <div style="margin-top:6px;font-weight:bold">${loggedInFullName}</div>
            </div>

            <div style="text-align:center;margin:5px 0;font-weight:bold">${accessType}</div>
            <div>Card No: ${loggedInCardNo}</div>
            <div>Status: ${loggedInStatus || "Active"}</div>

            <div class="photo-action">
                <button id="viewPhotoBtn" class="view-photo-btn">
                    View Photo
                </button>
            </div>

            <hr>
            <div id="signOutBtn"><i class="fas fa-sign-out-alt"></i> Sign Out</div>
        `;

        userDiv.appendChild(profileBox);

        userDiv.addEventListener("click",function(e){
            e.stopPropagation();
            profileBox.style.display = profileBox.style.display === "block" ? "none" : "block";
        });

        // PHOTO MODAL
        let existingModal = document.getElementById("photoModal");
        if(!existingModal){
            const modal = document.createElement("div");
            modal.id = "photoModal";
            modal.innerHTML = `
                <div class="photo-modal-content">
                    <span class="close-photo">&times;</span>
                    <img id="modalImage" src="">
                </div>
            `;
            document.body.appendChild(modal);
        }

        profileBox.querySelector("#viewPhotoBtn").addEventListener("click", function(e){
            e.stopPropagation();
            const modal = document.getElementById("photoModal");
            const modalImg = document.getElementById("modalImage");
            modalImg.src = profileImgPath;
            modal.style.display = "flex";
        });

        document.addEventListener("click", function(e){
            const modal = document.getElementById("photoModal");
            if(e.target.classList.contains("close-photo") || e.target.id === "photoModal"){
                modal.style.display = "none";
            }
        });

        profileBox.querySelector("#signOutBtn").addEventListener("click",function(){
            localStorage.removeItem("kfcLogin");
            location.reload();
        });

        document.addEventListener("click",function(){
            profileBox.style.display="none";
        });
    });
}

    // ------------------- SEARCH SYSTEM -------------------
    searchInput.addEventListener("input", handleSearch);
    searchField.addEventListener("change", handleSearch);
    searchButton.addEventListener("click", handleSearch);

    function handleSearch(){
        if(!isLoggedIn){
            resultContainer.innerHTML = "<p class='no-data'>⚠ Please login before searching.</p>";
            searchButton.disabled = true;
            printButton.disabled = true;
            return;
        }

        const term = searchInput.value.trim();
        searchButton.disabled = term === "";
        if(term !== ""){
            renderTable();
        } else {
            resultContainer.innerHTML = "";
            printButton.disabled = true;
        }
    }

    // ------------------- TABLE RENDER -------------------
    function renderTable() {
        if(!isLoggedIn){
            resultContainer.innerHTML = "<p class='no-data'>⚠ Login required to search.</p>";
            printButton.disabled = true;
            return;
        }

        const term = searchInput.value.trim().toLowerCase();
        const field = searchField.value;
        if(!data.length || term === ""){
            resultContainer.innerHTML = "";
            printButton.disabled = true;
            return;
        }

        let results = data.filter(item =>
            item[field] && item[field].toString().toLowerCase().includes(term)
        );

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

        let table = "<table><thead><tr><th>S.No.</th>";

        for(const key in results[0]){
            table += `<th onclick="sortTable('${key}')">${key==="Room"?"ROOM/ADDRESS":key}</th>`;
        }
        table += "<th>VIEW CARD</th></tr></thead><tbody>";

        results.forEach((item,index)=>{
            table += "<tr>";
            table += `<td data-label="S.No.">${index+1}</td>`;

            for(const key in item){
                let value = item[key];
                let names = item.name.trim().split(" ");
                let usernameOfRow = names[0].toLowerCase() + names[names.length-1].toLowerCase();
                let isFullAccessUser = allowedFullAccess.includes(loggedInCardNo);

                if(!isFullAccessUser && loggedInUsername && loggedInUsername.toLowerCase()!==usernameOfRow){
                    if(key==="name"){
                        if(names.length>2) value="*** "+names.slice(1,-1).join(" ")+" ***";
                        else if(names.length===2) value="*** ***";
                        else value="***";
                    }
                    if(key==="CNo"){
                        let parts = item.CNo.split("-");
                        value = parts.slice(0,-1).join("-")+"-***";
                    }
                }

                let cellStyle="";
                if(key.toLowerCase()==="status"){
                    if(value && value.toLowerCase()==="cancel") cellStyle="class='cancel'";
                    if(value && value.toLowerCase()==="active") cellStyle="class='active'";
                }

                table += `<td data-label="${key}" ${cellStyle}>${value}</td>`;
            }

            const canViewCard = allowedFullAccess.includes(loggedInCardNo) || (item.CNo === loggedInCardNo);
            const cardFileName = `e-Cards/${item.name} e-Card.pdf`;
            table += `<td data-label='VIEW CARD'>
<button onclick="window.open('viewcard.html?card=${btoa(item.CNo)}','_blank')" ${canViewCard?"":"disabled"}>
VIEW CARD
</button></td>`;
            table += "</tr>";
        });

        table += "</tbody></table>";
        resultContainer.innerHTML = table;
        printButton.disabled = false;
    }

    window.sortTable = function(column){
        if(currentSort.column===column) currentSort.asc=!currentSort.asc;
        else { currentSort.column=column; currentSort.asc=true; }
        renderTable();
    };
});
