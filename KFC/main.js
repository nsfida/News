// ================= GLOBAL VARIABLES =================
let users = [];
let currentUser = null;

// ================= ELEMENTS =================
const userArea = document.getElementById("userArea");
const usernameText = document.getElementById("username");

const dropdown = document.getElementById("userDropdown");
const guestView = document.getElementById("guestView");
const userView = document.getElementById("userView");

const openLoginBtn = document.getElementById("openLoginBtn");
const loginOverlay = document.getElementById("loginOverlay");

const loginBtn = document.getElementById("loginBtn");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");

const logoutBtn = document.getElementById("logoutBtn");

const userFullName = document.getElementById("userFullName");
const userCard = document.getElementById("userCard");
const userDesg = document.getElementById("userDesg");
const userStatus = document.getElementById("userStatus");
const userRoom = document.getElementById("userRoom");

const welcomePopup = document.getElementById("welcomePopup");
const welcomeText = document.getElementById("welcomeText");

// Stats
const totalMembers = document.getElementById("totalMembers");
const activeMembers = document.getElementById("activeMembers");
const leadersCount = document.getElementById("leadersCount");

// ================= LOAD USER DATA =================
async function loadUsers() {
    try {
        const res = await fetch("https://livenews.live/KFC/cards.json");
        users = await res.json();
        calculateStats();
    } catch (e) {
        console.error("Error loading JSON:", e);
    }
}

// ================= GENERATE USERNAME =================
function generateUsername(name) {
    let parts = name.toLowerCase().split(" ");
    if (parts.length < 2) return name.toLowerCase();
    let first = parts[0];
    let last = parts[parts.length - 1];
    return (first + last).replace(/\s/g, '');
}

// ================= GENERATE PASSWORD =================
function generatePassword(card) {
    if (!card) return "";
    let parts = card.split("-");
    return parts[parts.length - 1];
}

// ================= LOGIN FUNCTION =================
function login() {
    loginError.innerText = ""; // clear previous errors
    let uname = loginUsername.value.trim().toLowerCase();
    let pass = loginPassword.value.trim();

    if (!uname || !pass) {
        loginError.innerText = "Enter username & password";
        return;
    }

    // Find user by generated username and password
    const user = users.find(u => {
        let genUser = generateUsername(u.name);
        let genPass = generatePassword(u.CNo);
        return genUser === uname && genPass === pass;
    });

    if (!user) {
        loginError.innerText = "Invalid credentials";
        return;
    }

    // Check if Status is Cancelled
    let status = user.Status ? user.Status.toString().trim().toLowerCase() : "";
    if (status === "cancel") {
        loginError.innerText = "This username cannot login, this card is already cancelled";
        return;
    }

    // ✅ Login successful
    currentUser = user;
    localStorage.setItem("kfcUser", JSON.stringify(user));

    applyUser();
    showWelcome(user.name);
    loginOverlay.classList.remove("show");
}

// ================= APPLY USER DATA =================
function applyUser() {
    if (!currentUser) return;

    usernameText.innerText = currentUser.name;

    guestView.style.display = "none";
    userView.style.display = "flex";

    userFullName.innerText = "Welcome, " + currentUser.name;
    userCard.innerText = "Card: " + currentUser.CNo;
    userDesg.innerText = "Designation: " + currentUser.Desg;
    userStatus.innerText = "Status: " + currentUser.Status;
    userRoom.innerText = "Room: " + currentUser.Room;
}

// ================= CHECK SESSION =================
function checkSession() {
    const saved = localStorage.getItem("kfcUser");
    if (saved) {
        currentUser = JSON.parse(saved);

        let status = currentUser.Status ? currentUser.Status.toString().trim().toLowerCase() : "";
        if (status === "cancelled") {
            // Cancelled card cannot stay logged in
            localStorage.removeItem("kfcUser");
            currentUser = null;
            loginError.innerText = "This username cannot login, this card is already cancelled";
            return;
        }

        applyUser();
    }
}

// ================= LOGOUT =================
logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("kfcUser");
    currentUser = null;
    location.reload();
});

// ================= DROPDOWN =================
userArea.addEventListener("click", e => {
    e.stopPropagation();
    dropdown.classList.toggle("show");
});

document.addEventListener("click", () => {
    dropdown.classList.remove("show");
});

dropdown.addEventListener("click", e => {
    e.stopPropagation();
});

// ================= OPEN LOGIN =================
openLoginBtn.addEventListener("click", () => {
    loginOverlay.classList.add("show");
});

// ================= CLOSE LOGIN OUTSIDE =================
loginOverlay.addEventListener("click", e => {
    if (e.target === loginOverlay) {
        loginOverlay.classList.remove("show");
    }
});

// ================= LOGIN BUTTON =================
loginBtn.addEventListener("click", login);

// ENTER KEY LOGIN
document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && loginOverlay.classList.contains("show")) {
        login();
    }
});

// ================= WELCOME POPUP =================
function showWelcome(name) {
    welcomeText.innerText = "Welcome, " + name + " 👋";
    welcomePopup.classList.add("show");

    setTimeout(() => {
        welcomePopup.classList.remove("show");
    }, 2500);
}

// ================= CALCULATE STATS =================
function calculateStats() {
    totalMembers.innerText = users.length;

    let active = users.filter(u => u.Status && u.Status.toString().trim().toLowerCase() === "active");
    activeMembers.innerText = active.length;

    let leaders = users.filter(u =>
        u.Desg && (u.Desg.toLowerCase().includes("president") ||
        u.Desg.toLowerCase().includes("guardian"))
    );
    leadersCount.innerText = leaders.length;
}

// ================= INIT =================
(async function () {
    await loadUsers();
    checkSession();
})();

// Click outside sidebar to close on mobile
document.addEventListener("click", (e) => {
    const sidebar = document.querySelector(".sidebar");
    if(window.innerWidth <= 600 && sidebar.style.display === "flex"){
        if(!sidebar.contains(e.target) && e.target.id !== "mobileMenuToggle"){
            sidebar.style.display = "none";
        }
    }
});
