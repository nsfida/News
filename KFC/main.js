let users = [];
let currentUser = null;

// --- DOM Elements ---
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
const userBlood = document.getElementById("userBlood");
const userMobile = document.getElementById("userMobile");
const welcomePopup = document.getElementById("welcomePopup");
const welcomeText = document.getElementById("welcomeText");
const totalMembers = document.getElementById("totalMembers");
const activeMembers = document.getElementById("activeMembers");
const leadersCount = document.getElementById("leadersCount");

// Notification & Message Elements
const notificationBtn = document.getElementById("notificationBtn");
const notiDropdown = document.getElementById("notiDropdown");
const notiBadge = document.getElementById("notiBadge");
const notiList = document.getElementById("notiList");
const msgBtn = document.getElementById("msgBtn");
const msgDropdown = document.getElementById("msgDropdown");
const msgBadge = document.getElementById("msgBadge");
const msgList = document.getElementById("msgList");

// --- Core Functions ---
async function loadUsers() {
    try {
        const res = await fetch("https://livenews.live/KFC/cards.json");
        users = await res.json();
        calculateStats();
    } catch (e) {
        console.error("Error loading JSON:", e);
    }
}

function generateUsername(name) {
    let parts = name.toLowerCase().split(" ");
    if (parts.length < 2) return name.toLowerCase();
    let first = parts[0];
    let last = parts[parts.length - 1];
    return (first + last).replace(/\s/g, '');
}

function generatePassword(card) {
    if (!card) return "";
    let parts = card.split("-");
    return parts[parts.length - 1];
}

function login() {
    loginError.innerText = "";
    let uname = loginUsername.value.trim().toLowerCase();
    let pass = loginPassword.value.trim();
    if (!uname || !pass) {
        loginError.innerText = "Enter username & password";
        return;
    }
    const user = users.find(u => {
        let genUser = generateUsername(u.name);
        let genPass = generatePassword(u.CNo);
        return genUser === uname && genPass === pass;
    });
    if (!user) {
        loginError.innerText = "Invalid credentials";
        return;
    }
    let status = user.Status ? user.Status.toString().trim().toLowerCase() : "";
    if (status === "cancel" || status === "cancelled") {
        loginError.innerText = "This username cannot login, this card is already cancelled";
        return;
    }
    currentUser = user;
    localStorage.setItem("kfcUser", JSON.stringify(user));
    applyUser();
    showWelcome(user.name);
    loginOverlay.classList.remove("show");
}

function applyUser() {
    if (!currentUser) return;
    const firstName = currentUser.name.split(" ")[0];
    usernameText.innerText = `Welcome, ${firstName}`;
    guestView.style.display = "none";
    userView.style.display = "flex";
    userFullName.innerText = "Welcome, " + currentUser.name;
    userCard.innerText = "Card Number: " + currentUser.CNo;
    userDesg.innerText = "Designation: " + currentUser.Desg;
    userBlood.innerText = "Blood Group: " + (currentUser.BG || "Not available");
    userMobile.innerText = "Registered Mobile: " + (currentUser.mobile || "Not available");
    const viewCardBtn = document.getElementById("viewCardBtn");
    const nameForLink = encodeURIComponent(currentUser.name + " e-Card.pdf");
    viewCardBtn.href = "https://livenews.live/KFC/e-Cards/" + nameForLink;
}

function checkSession() {
    const saved = localStorage.getItem("kfcUser");
    if (saved) {
        currentUser = JSON.parse(saved);
        let status = currentUser.Status ? currentUser.Status.toString().trim().toLowerCase() : "";
        if (status === "cancel" || status === "cancelled") {
            localStorage.removeItem("kfcUser");
            currentUser = null;
            loginError.innerText = "This username cannot login, this card is already cancelled";
            return;
        }
        applyUser();
    }
    if (!currentUser) {
        notiBadge.style.display = "none";
    }
}

function showWelcome(name) {
    welcomeText.innerText = "Welcome, " + name + " 👋";
    welcomePopup.classList.add("show");
    setTimeout(() => welcomePopup.classList.remove("show"), 2500);
}

function calculateStats() {
    totalMembers.innerText = users.length;
    let active = users.filter(u => u.Status && u.Status.toString().trim().toLowerCase() === "active");
    activeMembers.innerText = active.length;
    const allowedRoles = ["president", "acting president", "vice president", "committee guardian", "committee guardian (ex-president)", "general secretary", "finance manager", "joint finance secretary", "media manager"];
    let leaders = users.filter(u => {
        if (!u.Desg) return false;
        return allowedRoles.includes(u.Desg.toLowerCase().trim());
    });
    leadersCount.innerText = leaders.length;
}

// --- Interaction Handlers ---

// Toggle User Dropdown
userArea.addEventListener("click", e => {
    e.stopPropagation();
    notiDropdown.classList.remove("show");
    msgDropdown.classList.remove("show");
    dropdown.classList.toggle("show");
});

// Toggle Notification Dropdown
notificationBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.remove("show");
    msgDropdown.classList.remove("show");
    notiDropdown.classList.toggle("show");

    if (!currentUser) {
        notiList.innerHTML = `<p style="text-align:center; padding:20px;">Please sign-in to view recent alerts</p>`;
        notiBadge.style.display = "none";
        return;
    }
    fetchUrduAlerts();
    notiBadge.style.display = "none";
});

// Toggle Message Dropdown
msgBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.remove("show");
    notiDropdown.classList.remove("show");
    msgDropdown.classList.toggle("show");

    if (!currentUser) {
        msgList.innerHTML = `<p style="text-align:center; padding:20px;">Please sign-in to view your messages</p>`;
        msgBadge.style.display = "none";
        return;
    }
    fetchPersonalMessages();
});

// Global Close
document.addEventListener("click", () => {
    dropdown.classList.remove("show");
    notiDropdown.classList.remove("show");
    msgDropdown.classList.remove("show");
});

// Stop internal clicks from closing boxes
[dropdown, notiDropdown, msgDropdown].forEach(box => {
    if (box) box.addEventListener("click", e => e.stopPropagation());
});

logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("kfcUser");
    currentUser = null;
    location.reload();
});

openLoginBtn.addEventListener("click", () => loginOverlay.classList.add("show"));
loginOverlay.addEventListener("click", e => { if (e.target === loginOverlay) loginOverlay.classList.remove("show"); });
loginBtn.addEventListener("click", login);
document.addEventListener("keydown", e => { if (e.key === "Enter" && loginOverlay.classList.contains("show")) login(); });

// --- Data Systems ---

async function fetchUrduAlerts() {
    try {
        const response = await fetch("https://livenews.live/KFC/message/alerts.json");
        const alerts = await response.json();
        notiList.innerHTML = "";
        if (alerts.length > 0) {
            notiBadge.style.display = "block";
            alerts.reverse().slice(0, 3).forEach(latest => {
                const item = document.createElement("div");
                item.className = "noti-item";
                item.innerHTML = `
                    <div class="noti-top-row" style="position:relative;">
                        <i class="fa-solid fa-download download-btn" style="position:absolute;left:0;top:0;cursor:pointer;font-size:14px;color:#7873f5;"></i>
                        <span class="noti-title-ur">${latest.title_ur || "اعلان"}</span>
                        <span class="noti-date">${latest.date}</span>
                    </div>
                    <div class="noti-body-ur" lang="ur">${latest.body_ur}</div>
                `;
                const downloadBtn = item.querySelector(".download-btn");
                downloadBtn.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    item.classList.add("expanded");
                    setTimeout(async () => {
                        const canvas = await html2canvas(item, { backgroundColor: null, scale: 2 });
                        const link = document.createElement("a");
                        link.download = "notification.png";
                        link.href = canvas.toDataURL("image/png");
                        link.click();
                    }, 50);
                });
                item.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (item.classList.contains("expanded")) {
                        item.classList.remove("expanded");
                    } else {
                        document.querySelectorAll('.noti-item').forEach(el => el.classList.remove('expanded'));
                        item.classList.add("expanded");
                    }
                });
                notiList.appendChild(item);
            });
            const seeAll = document.createElement("div");
            seeAll.style.textAlign = "center";
            seeAll.style.marginTop = "10px";
            seeAll.innerHTML = `<a href="https://livenews.live/KFC/message/alerts.html" style="font-weight:bold; color:#7873f5; text-decoration:underline;">Click here to see all notifications</a>`;
            notiList.appendChild(seeAll);
        } else {
            notiList.innerHTML = "<p style='text-align:center; font-family:UrduFont;'>کوئی نیا نوٹیفیکیشن نہیں ہے۔</p>";
        }
    } catch (error) { notiList.innerHTML = "<p style='text-align:center;'>Error loading notifications.</p>"; }
}

async function fetchPersonalMessages() {
    try {
        const response = await fetch("https://livenews.live/KFC/messages.json");
        const messages = await response.json();
        msgList.innerHTML = "";
        const myMessages = messages.filter(m => m.cardNumber === currentUser.CNo || m.cardNumber?.toLowerCase() === "all");
        if (myMessages.length > 0) {
            msgBadge.style.display = "none";
            myMessages.sort((a, b) => new Date(b.date) - new Date(a.date));
            myMessages.forEach(msg => {
                const item = document.createElement("div");
                item.className = "noti-item msg-item";
                const isGlobal = msg.cardNumber?.toLowerCase() === "all";
                const typeLabel = isGlobal ? '<span style="color:#ff6ec4; font-size:10px;">[Public]</span>' : '<span style="color:#7873f5; font-size:10px;">[Private]</span>';
                item.innerHTML = `
                    <div class="noti-top-row" style="flex-direction: column; align-items: flex-start;">
                        <span class="msg-date">${msg.date} ${typeLabel}</span>
                        <strong class="msg-title" style="color:#0d3c91; font-size: 15px;">
                            <i class="fa-solid fa-chevron-right" style="font-size: 10px; margin-right: 5px;"></i> ${msg.title}
                        </strong>
                    </div>
                    <div class="msg-body">${msg.body}</div>
                `;
                item.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const isExpanded = item.classList.contains("expanded");
                    document.querySelectorAll('.msg-item').forEach(el => el.classList.remove('expanded'));
                    if (!isExpanded) {
                        item.classList.add("expanded");
                        item.querySelector('i').className = "fa-solid fa-chevron-down";
                    } else {
                        item.querySelector('i').className = "fa-solid fa-chevron-right";
                    }
                });
                msgList.appendChild(item);
            });
        } else { msgList.innerHTML = "<p style='text-align:center; padding:20px; color:#888;'>No messages found.</p>"; }
    } catch (error) { msgList.innerHTML = "<p style='text-align:center;'>Error loading messages.</p>"; }
}

// --- On Page Load ---
(async function() {
    await loadUsers();
    checkSession();
})();

document.addEventListener("DOMContentLoaded", () => {
    const leadersBtn = document.getElementById("leadersBtn");
    const leadersOverlay = document.getElementById("leadersOverlay");
    const closeLeaders = document.getElementById("closeLeaders");
    const leadersList = document.getElementById("leadersList");
    if (!leadersBtn) return;
    leadersBtn.addEventListener("click", () => {
        showLeaders();
        leadersOverlay.classList.add("show");
    });
    closeLeaders.addEventListener("click", () => leadersOverlay.classList.remove("show"));
    leadersOverlay.addEventListener("click", e => { if (e.target === leadersOverlay) leadersOverlay.classList.remove("show"); });
    function showLeaders() {
        leadersList.innerHTML = "";
        const allowedRoles = ["president", "acting president", "vice president", "committee guardian", "committee guardian (ex-president)", "general secretary", "finance manager", "joint finance secretary", "media manager"];
        let leaders = users.filter(u => u.Desg && allowedRoles.includes(u.Desg.toLowerCase().trim()));
        leaders.sort((a, b) => allowedRoles.indexOf(a.Desg.toLowerCase().trim()) - allowedRoles.indexOf(b.Desg.toLowerCase().trim()));
        leaders.forEach(l => {
            let div = document.createElement("div");
            div.className = "leader-item";
            div.innerHTML = `<h4>${l.name}</h4><p>${l.Desg}</p><p class="leader-phone"><i class="fa-solid fa-phone"></i> ${l.mobile || "Not available"}</p>`;
            leadersList.appendChild(div);
        });
    }
});

[totalMembers, activeMembers].forEach(el => el.parentElement.onclick = () => window.location.href = "https://livenews.live/KFC/database.html");
window.addEventListener("load", () => { document.body.classList.add("loaded"); });

document.addEventListener("click", e => {
    const sidebar = document.querySelector(".sidebar");
    if (window.innerWidth <= 600 && sidebar.style.display === "flex") {
        if (!sidebar.contains(e.target) && e.target.id !== "mobileMenuToggle") {
            sidebar.style.display = "none";
        }
    }
});
