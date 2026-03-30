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

// Profile Picture Elements
const headerProfileImg = document.getElementById("headerProfileImg");
const headerUserIcon = document.getElementById("headerUserIcon");
const dropdownProfileImg = document.getElementById("dropdownProfileImg");
const viewPhotoBtn = document.getElementById("viewPhotoBtn");
const photoOverlay = document.getElementById("photoOverlay");
const fullProfileImg = document.getElementById("fullProfileImg");
const closePhotoOverlay = document.getElementById("closePhotoOverlay");

// Notification & Message Elements
const notificationBtn = document.getElementById("notificationBtn");
const notiDropdown = document.getElementById("notiDropdown");
const notiBadge = document.getElementById("notiBadge");
const notiList = document.getElementById("notiList");
const msgBtn = document.getElementById("msgBtn");
const msgDropdown = document.getElementById("msgDropdown");
const msgBadge = document.getElementById("msgBadge");
const msgList = document.getElementById("msgList");

// Leaders Elements
const leadersBtn = document.getElementById("leadersBtn");
const leadersOverlay = document.getElementById("leadersOverlay");
const closeLeaders = document.getElementById("closeLeaders");
const leadersList = document.getElementById("leadersList");

// Optional full alerts page button if it exists in HTML
const seeAllAlertsBtn = document.getElementById("seeAllAlertsBtn");

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

function applyProfileImage(cardNo) {
    const basePath = "https://livenews.live/KFC/static/images/photos/";
    const defaultImg = basePath + "photo.png";
    const pngPath = basePath + cardNo + ".png";
    const jpgPath = basePath + cardNo + ".jpg";

    const updateAllSources = (src) => {
        headerProfileImg.src = src;
        dropdownProfileImg.src = src;
        fullProfileImg.src = src;
    };

    updateAllSources(pngPath);

    const handleImgError = (imgTag) => {
        if (imgTag.src === pngPath) {
            updateAllSources(jpgPath);
        } else if (imgTag.src === jpgPath) {
            updateAllSources(defaultImg);
        } else {
            headerProfileImg.style.display = "none";
            headerUserIcon.style.display = "block";
        }
    };

    headerProfileImg.onerror = () => handleImgError(headerProfileImg);
    dropdownProfileImg.onerror = () => handleImgError(dropdownProfileImg);
    
    headerProfileImg.style.display = "block";
    headerUserIcon.style.display = "none";
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

    applyProfileImage(currentUser.CNo);

    const viewCardBtn = document.getElementById("viewCardBtn");
    viewCardBtn.href = "viewcard.html?card=" + btoa(currentUser.CNo);
    viewCardBtn.target = "_blank";

    msgBtn.style.display = "flex";
    notificationBtn.style.display = "flex";
}

function checkSession() {
    const saved = localStorage.getItem("kfcUser");
    if (saved) {
        currentUser = JSON.parse(saved);
        let status = currentUser.Status ? currentUser.Status.toString().trim().toLowerCase() : "";
        if (status === "cancel" || status === "cancelled") {
            localStorage.removeItem("kfcUser");
            currentUser = null;
            return;
        }
        applyUser();
    }
    if (!currentUser) {
        msgBtn.style.display = "none";
        notificationBtn.style.display = "none";
        headerProfileImg.style.display = "none";
        headerUserIcon.style.display = "block";
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
userArea.addEventListener("click", e => {
    e.stopPropagation();
    notiDropdown.classList.remove("show");
    msgDropdown.classList.remove("show");
    dropdown.classList.toggle("show");
});

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

viewPhotoBtn.addEventListener("click", () => {
    photoOverlay.classList.add("show");
    dropdown.classList.remove("show");
});

closePhotoOverlay.addEventListener("click", () => photoOverlay.classList.remove("show"));
photoOverlay.addEventListener("click", e => { if (e.target === photoOverlay) photoOverlay.classList.remove("show"); });

document.addEventListener("click", () => {
    dropdown.classList.remove("show");
    notiDropdown.classList.remove("show");
    msgDropdown.classList.remove("show");
});

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

// --- Download Helper ---
async function downloadNotificationAsImage(element, fileName) {
    if (typeof html2canvas === "undefined") {
        console.error("html2canvas is missing.");
        return;
    }

    const clone = element.cloneNode(true);

    clone.style.position = "absolute";
    clone.style.left = "-99999px";
    clone.style.top = "0";
    clone.style.display = "block";
    clone.style.visibility = "visible";
    clone.style.pointerEvents = "none";
    clone.style.width = `${element.getBoundingClientRect().width}px`;
    clone.style.maxWidth = "none";
    clone.style.margin = "0";
    clone.style.transform = "none";

    const cloneBody = clone.querySelector(".noti-body-ur");
    if (cloneBody) cloneBody.style.display = "block";

    document.body.appendChild(clone);

    try {
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        await new Promise(resolve => setTimeout(resolve, 80));

        const canvas = await html2canvas(clone, {
            scale: 5,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            scrollX: 0,
            scrollY: 0,
            width: clone.scrollWidth,
            height: clone.scrollHeight,
            windowWidth: document.documentElement.clientWidth,
            windowHeight: document.documentElement.clientHeight
        });

        const link = document.createElement("a");
        link.download = fileName;
        link.href = canvas.toDataURL("image/png", 1.0);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error("Notification download error:", error);
    } finally {
        clone.remove();
    }
}

// --- Data Systems ---
async function fetchUrduAlerts() {
    try {
        const response = await fetch("https://livenews.live/KFC/message/alerts.json");
        const alerts = await response.json();
        
        // Ensure the container itself can expand
        notiList.style.height = "auto";
        notiList.style.maxHeight = "500px";
        notiList.style.overflowY = "auto";
        notiList.innerHTML = "";
        
        if (alerts.length > 0) {
            const sortedAlerts = [...alerts].reverse(); 
            sortedAlerts.slice(0, 3).forEach(latest => {
                const item = document.createElement("div");
                item.className = "noti-item";
                
                // Professional Styling with Auto Height
                item.style.cssText = `
                    direction: rtl;
                    text-align: right;
                    position: relative;
                    background-color: #ffffff;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    margin-bottom: 10px;
                    overflow: hidden;
                    height: auto;
                    min-height: 50px;
                    transition: all 0.3s ease;
                `;

                item.innerHTML = `
                    <div style="background-color:#0d3c91; height:6px;"></div>
                    <img src="logo.png" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:60%; opacity:0.08; z-index:1; pointer-events:none;">
                    
                    <div class="noti-top-row" style="padding: 12px 15px; display:flex; justify-content: space-between; align-items: center; position: relative; z-index: 2; cursor: pointer;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span class="noti-title-ur" style="font-weight:bold; color:#0d3c91; font-size: 15px;">${latest.title_ur || "اعلان"}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <i class="fa-solid fa-download download-btn" title="Download" style="cursor:pointer; font-size:16px; color:#7873f5; z-index: 3;"></i>
                            <span class="noti-date" style="font-size:11px; color:#888;">${latest.date}</span>
                        </div>
                    </div>
                    
                    <div class="noti-body-ur" lang="ur" style="display:none; padding: 15px; border-top:1px dashed #eee; white-space:pre-line; position: relative; z-index: 2; font-size: 14px; line-height: 1.8; color: #333;">
                        ${latest.body_ur}
                        <div style="margin-top:20px; font-size:10px; color:#aaa; text-align:center; border-top: 1px solid #f0f0f0; padding-top: 5px;">KFC Official Notification</div>
                    </div>
                `;
                
                // --- Download directly as high-quality image ---
                const downloadBtn = item.querySelector(".download-btn");
                downloadBtn.addEventListener("click", async (e) => {
                    e.stopPropagation();

                    const downloadCard = item.cloneNode(true);
                    downloadCard.style.position = "absolute";
                    downloadCard.style.left = "-99999px";
                    downloadCard.style.top = "0";
                    downloadCard.style.display = "block";
                    downloadCard.style.visibility = "visible";
                    downloadCard.style.width = `${item.getBoundingClientRect().width}px`;

                    const downloadBody = downloadCard.querySelector(".noti-body-ur");
                    if (downloadBody) downloadBody.style.display = "block";

                    document.body.appendChild(downloadCard);

                    const cleanDate = String(latest.date || "alert").replace(/[^\w\-]+/g, "_");
                    await downloadNotificationAsImage(downloadCard, `KFC-Alert-${cleanDate}.png`);

                    setTimeout(() => {
                        if (downloadCard && downloadCard.parentNode) {
                            downloadCard.remove();
                        }
                    }, 100);
                });

                // --- Accordion Logic ---
                item.addEventListener("click", () => {
                    const body = item.querySelector(".noti-body-ur");
                    const isVisible = body.style.display === "block";
                    
                    // Close others
                    document.querySelectorAll('.noti-body-ur').forEach(el => el.style.display = 'none');
                    
                    if (!isVisible) {
                        body.style.display = "block";
                        item.style.backgroundColor = "#f9f9ff";
                    } else {
                        item.style.backgroundColor = "#ffffff";
                    }
                });
                
                notiList.appendChild(item);
            });

            // --- Click here to see all Alerts button ---
            const alertsButtonWrap = document.createElement("div");
            alertsButtonWrap.style.cssText = `
                margin-top: 12px;
                text-align: center;
                padding: 6px 0 2px;
            `;

            const alertsButton = document.createElement("button");
            alertsButton.id = "seeAllAlertsBtn";
            alertsButton.type = "button";
            alertsButton.innerText = "Click here to see all Alerts";
            alertsButton.style.cssText = `
                width: 100%;
                padding: 10px 14px;
                border: none;
                border-radius: 999px;
                background: linear-gradient(90deg, #ff6ec4, #7873f5);
                color: #fff;
                font-weight: bold;
                cursor: pointer;
                font-size: 13px;
                box-shadow: 0 8px 18px rgba(120, 115, 245, 0.18);
            `;

            alertsButton.addEventListener("click", (e) => {
                e.stopPropagation();
                window.location.href = "message/alerts.html";
            });

            alertsButtonWrap.appendChild(alertsButton);
            notiList.appendChild(alertsButtonWrap);
        } else {
            notiList.innerHTML = `<p style="text-align:center; padding:20px; color:#888;">No alerts found.</p>`;
        }
    } catch (error) { 
        console.error("Alerts error:", error);
    }
}

async function fetchPersonalMessages() {
    try {
        const response = await fetch("https://livenews.live/KFC/messages.json");
        const messages = await response.json();
        msgList.innerHTML = "";
        const myMessages = messages.filter(m => m.cardNumber === currentUser.CNo || m.cardNumber?.toLowerCase() === "all");
        if (myMessages.length > 0) {
            myMessages.sort((a, b) => new Date(b.date) - new Date(a.date));
            myMessages.forEach(msg => {
                const item = document.createElement("div");
                item.className = "noti-item msg-item";
                item.style.direction = "ltr"; 
                item.style.textAlign = "left";
                const isGlobal = msg.cardNumber?.toLowerCase() === "all";
                const typeLabel = isGlobal ? '<span style="color:#ff6ec4; font-size:10px;">[Public]</span>' : '<span style="color:#7873f5; font-size:10px;">[Private]</span>';
                item.innerHTML = `
                    <div class="noti-top-row" style="flex-direction: column; align-items: flex-start;">
                        <span class="msg-date" style="font-size:11px; color:#888;">${msg.date} ${typeLabel}</span>
                        <strong class="msg-title" style="color:#0d3c91; font-size: 15px; display:flex; align-items:center; gap:5px;">
                            <i class="fa-solid fa-chevron-right icon-rotate" style="font-size: 10px;"></i> ${msg.title}
                        </strong>
                    </div>
                    <div class="msg-body" style="display:none; padding-top:10px; font-size:13px; color:#444; border-top:1px dashed #ccc; margin-top:5px;">${msg.body}</div>
                `;
                item.addEventListener("click", () => {
                    const body = item.querySelector(".msg-body");
                    const icon = item.querySelector(".icon-rotate");
                    const isVisible = body.style.display === "block";
                    document.querySelectorAll('.msg-body').forEach(el => el.style.display = 'none');
                    document.querySelectorAll('.icon-rotate').forEach(i => i.className = "fa-solid fa-chevron-right icon-rotate");
                    if (!isVisible) {
                        body.style.display = "block";
                        icon.className = "fa-solid fa-chevron-down icon-rotate";
                    }
                });
                msgList.appendChild(item);
            });
            const seeAllMsgs = document.createElement("div");
            seeAllMsgs.style.textAlign = "center";
            seeAllMsgs.style.marginTop = "10px";
            seeAllMsgs.innerHTML = `<span style="font-size:12px; color:#999;">End of messages</span>`;
            msgList.appendChild(seeAllMsgs);
        } else {
            msgList.innerHTML = "<p style='text-align:center; padding:20px; color:#888;'>No messages found.</p>";
        }
    } catch (error) { 
        msgList.innerHTML = "<p style='text-align:center;'>Error loading messages.</p>";
    }
}

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
