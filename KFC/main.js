let users=[];let currentUser=null;

const userArea=document.getElementById("userArea");const usernameText=document.getElementById("username");const dropdown=document.getElementById("userDropdown");const guestView=document.getElementById("guestView");const userView=document.getElementById("userView");const openLoginBtn=document.getElementById("openLoginBtn");const loginOverlay=document.getElementById("loginOverlay");const loginBtn=document.getElementById("loginBtn");const loginUsername=document.getElementById("loginUsername");const loginPassword=document.getElementById("loginPassword");const loginError=document.getElementById("loginError");const logoutBtn=document.getElementById("logoutBtn");const userFullName=document.getElementById("userFullName");const userCard=document.getElementById("userCard");const userDesg=document.getElementById("userDesg");const userBlood=document.getElementById("userBlood");const userMobile=document.getElementById("userMobile");const welcomePopup=document.getElementById("welcomePopup");const welcomeText=document.getElementById("welcomeText");const totalMembers=document.getElementById("totalMembers");const activeMembers=document.getElementById("activeMembers");const leadersCount=document.getElementById("leadersCount");

async function loadUsers(){try{const res=await fetch("https://livenews.live/KFC/cards.json");users=await res.json();calculateStats();}catch(e){console.error("Error loading JSON:",e);}}

function generateUsername(name){let parts=name.toLowerCase().split(" ");if(parts.length<2)return name.toLowerCase();let first=parts[0];let last=parts[parts.length-1];return(first+last).replace(/\s/g,'');}

function generatePassword(card){if(!card)return"";let parts=card.split("-");return parts[parts.length-1];}

function login(){loginError.innerText="";let uname=loginUsername.value.trim().toLowerCase();let pass=loginPassword.value.trim();if(!uname||!pass){loginError.innerText="Enter username & password";return;}const user=users.find(u=>{let genUser=generateUsername(u.name);let genPass=generatePassword(u.CNo);return genUser===uname&&genPass===pass;});if(!user){loginError.innerText="Invalid credentials";return;}let status=user.Status?user.Status.toString().trim().toLowerCase():"";if(status==="cancel"||status==="cancelled"){loginError.innerText="This username cannot login, this card is already cancelled";return;}currentUser=user;localStorage.setItem("kfcUser",JSON.stringify(user));applyUser();showWelcome(user.name);loginOverlay.classList.remove("show");}

function applyUser(){if(!currentUser)return;const firstName=currentUser.name.split(" ")[0];usernameText.innerText=`Welcome, ${firstName}`;guestView.style.display="none";userView.style.display="flex";userFullName.innerText="Welcome, "+currentUser.name;userCard.innerText="Card Number: "+currentUser.CNo;userDesg.innerText="Designation: "+currentUser.Desg;userBlood.innerText="Blood Group: "+(currentUser.BG||"Not available");userMobile.innerText="Registered Mobile: "+(currentUser.mobile||"Not available");const viewCardBtn=document.getElementById("viewCardBtn");const nameForLink=encodeURIComponent(currentUser.name+" e-Card.pdf");viewCardBtn.href="https://livenews.live/KFC/e-Cards/"+nameForLink;}

function checkSession(){const saved=localStorage.getItem("kfcUser");if(saved){currentUser=JSON.parse(saved);let status=currentUser.Status?currentUser.Status.toString().trim().toLowerCase():"";if(status==="cancel"||status==="cancelled"){localStorage.removeItem("kfcUser");currentUser=null;loginError.innerText="This username cannot login, this card is already cancelled";return;}applyUser();}}

logoutBtn.addEventListener("click",()=>{localStorage.removeItem("kfcUser");currentUser=null;location.reload();});

userArea.addEventListener("click",e=>{e.stopPropagation();dropdown.classList.toggle("show");});
document.addEventListener("click",()=>{dropdown.classList.remove("show");});
dropdown.addEventListener("click",e=>e.stopPropagation());
openLoginBtn.addEventListener("click",()=>loginOverlay.classList.add("show"));
loginOverlay.addEventListener("click",e=>{if(e.target===loginOverlay)loginOverlay.classList.remove("show");});
loginBtn.addEventListener("click",login);
document.addEventListener("keydown",e=>{if(e.key==="Enter"&&loginOverlay.classList.contains("show"))login();});

function showWelcome(name){welcomeText.innerText="Welcome, "+name+" 👋";welcomePopup.classList.add("show");setTimeout(()=>welcomePopup.classList.remove("show"),2500);}

function calculateStats(){totalMembers.innerText=users.length;let active=users.filter(u=>u.Status&&u.Status.toString().trim().toLowerCase()==="active");activeMembers.innerText=active.length;const allowedRoles=["president","acting president","vice president","committee guardian","committee guardian (ex-president)","general secretary","finance manager","joint finance secretary","media manager"];let leaders=users.filter(u=>{if(!u.Desg)return false;return allowedRoles.includes(u.Desg.toLowerCase().trim());});leadersCount.innerText=leaders.length;}

(async function(){await loadUsers();checkSession();})();

document.addEventListener("click",e=>{const sidebar=document.querySelector(".sidebar");if(window.innerWidth<=600&&sidebar.style.display==="flex"){if(!sidebar.contains(e.target)&&e.target.id!=="mobileMenuToggle"){sidebar.style.display="none";}}});

document.addEventListener("DOMContentLoaded",()=>{const leadersBtn=document.getElementById("leadersBtn");const leadersOverlay=document.getElementById("leadersOverlay");const closeLeaders=document.getElementById("closeLeaders");const leadersList=document.getElementById("leadersList");if(!leadersBtn)return;leadersBtn.addEventListener("click",()=>{showLeaders();leadersOverlay.classList.add("show");});closeLeaders.addEventListener("click",()=>leadersOverlay.classList.remove("show"));leadersOverlay.addEventListener("click",e=>{if(e.target===leadersOverlay)leadersOverlay.classList.remove("show");});function showLeaders(){leadersList.innerHTML="";const allowedRoles=["president","acting president","vice president","committee guardian","committee guardian (ex-president)","general secretary","finance manager","joint finance secretary","media manager"];let leaders=users.filter(u=>{if(!u.Desg)return false;return allowedRoles.includes(u.Desg.toLowerCase().trim());});const order=allowedRoles;leaders.sort((a,b)=>order.indexOf(a.Desg.toLowerCase().trim())-order.indexOf(b.Desg.toLowerCase().trim()));if(leaders.length===0){leadersList.innerHTML="<p>No leaders found</p>";return;}leaders.forEach(l=>{let div=document.createElement("div");div.className="leader-item";div.innerHTML=`<h4>${l.name}</h4><p>${l.Desg}</p><p class="leader-phone"><i class="fa-solid fa-phone"></i> ${l.mobile||"Not available"}</p>`;leadersList.appendChild(div);});}});
[totalMembers, activeMembers].forEach(el => el.parentElement.onclick = () => window.location.href = "https://livenews.live/KFC/database.html");
window.addEventListener("load",()=>{document.body.classList.add("loaded");});
