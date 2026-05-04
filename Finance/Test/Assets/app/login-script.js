const CONFIG = {
  zipBaseUrl: "https://livenews.live/Finance/Assets/app/",
  table: "loan_ledger_entries"
};

const ZIP_USERNAME_SESSION_KEY = "loanledger-zip-username-v1";
const ZIP_PASSWORD_STORAGE_KEY = "loanledger-zip-password-v1";
const ZIP_USERNAME_STORAGE_KEY = "loanledger-zip-username-persist-v1";

function sanitizeZipUsername(raw){
  const username = String(raw || "").trim();
  if (!username) throw new Error("Please enter your username.");
  if (!/^[a-zA-Z0-9_-]+$/.test(username)){
    throw new Error("Username may only contain letters, numbers, underscores, and hyphens.");
  }
  return username;
}

function zipUrlForUsername(raw){
  const username = sanitizeZipUsername(raw);
  return `${CONFIG.zipBaseUrl}${encodeURIComponent(username)}.zip`;
}

let runtimeConfig = null;

const els = {
  lockScreen: document.getElementById("lockScreen"),
  zipUsernameInput: document.getElementById("zipUsernameInput"),
  zipPasswordInput: document.getElementById("zipPasswordInput"),
  unlockBtn: document.getElementById("unlockBtn"),
  lockError: document.getElementById("lockError"),
  welcomeScreen: document.getElementById("welcomeScreen"),
  welcomeName: document.getElementById("welcomeName")
};

const FLOAT_CURRENCY_PATHS = ["currency-float-path-1", "currency-float-path-2", "currency-float-path-3", "currency-float-path-4"];

function initFloatingCurrencyBackground(){
  const root = document.getElementById("pageCurrencyBg");
  if (!root) return;
  root.replaceChildren();
  const specs = [
    { type: "aed", cls: "float-currency-aed", html: '<span class="symbol symbol-dirham">~</span>' },
    { type: "sar", cls: "float-currency-sar", html: '<span class="symbol symbol-riyal">$</span>' },
    { type: "pkr", cls: "float-currency-pkr", html: '<span class="symbol">Rs.</span>' }
  ];
  const colorPools = {
    aed: ["rgba(36,87,214,", "rgba(99,140,235,", "rgba(55,105,200,", "rgba(130,160,240,"],
    sar: ["rgba(6,118,71,", "rgba(46,160,110,", "rgba(20,90,65,", "rgba(80,175,120,"],
    pkr: ["rgba(181,71,8,", "rgba(210,110,35,", "rgba(160,85,20,", "rgba(200,95,45,"]
  };
  const count = 16;
  for (let i = 0; i < count; i++){
    const spec = specs[i % 3];
    const el = document.createElement("span");
    el.className = `float-currency ${spec.cls}`;
    el.innerHTML = spec.html;
    el.style.left = `${5 + Math.random() * 90}%`;
    el.style.top = `${3 + Math.random() * 88}%`;
    const fsMin = 2.4;
    const fsMax = 9.5;
    el.style.fontSize = `${fsMin + Math.random() * (fsMax - fsMin)}rem`;
    const pool = colorPools[spec.type];
    const alpha = 0.055 + Math.random() * 0.055;
    el.style.color = `${pool[Math.floor(Math.random() * pool.length)]}${alpha})`;
    const dur = 24 + Math.random() * 32;
    el.style.animationDuration = `${dur}s`;
    el.style.animationDelay = `${-Math.random() * dur}s`;
    el.style.animationName = FLOAT_CURRENCY_PATHS[Math.floor(Math.random() * FLOAT_CURRENCY_PATHS.length)];
    root.appendChild(el);
  }
}

function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[m]));
}

function showLockError(msg){
  els.lockError.textContent = msg;
  els.lockError.classList.add("show");
  setTimeout(() => els.lockError.classList.remove("show"), 5000);
}

function hideLockError(){
  els.lockError.classList.remove("show");
}

async function fetchProtectedZipBlob(url, password){
  // Check if zip library is loaded
  if (!window.zip?.ZipReader || !window.zip?.BlobReader) {
    throw new Error("ZIP library failed to load. Please refresh the page and try again.");
  }
  
  const zipResp = await fetch(url);
  if (!zipResp.ok) {
    if (zipResp.status === 404) throw new Error("Username not found. Please check your username and try again.");
    throw new Error(`Failed to fetch configuration file: ${zipResp.status} ${zipResp.statusText}`);
  }
  const zipData = await zipResp.blob();
  const zipReader = new zip.ZipReader(new zip.BlobReader(zipData), { password });
  const entries = await zipReader.getEntries();
  if (!entries || entries.length === 0) throw new Error("Configuration file is empty or corrupted.");
  const configEntry = entries.find(e => /(^|\/)db-config\.json$/i.test(e.filename) || /\.json$/i.test(e.filename));
  if (!configEntry) throw new Error("No JSON configuration file found in archive.");
  const writer = new zip.BlobWriter();
  const blob = await configEntry.getData(writer);
  await zipReader.close();
  return blob;
}

async function readConfigFromZip(username, password){
  const zipUrl = zipUrlForUsername(username);
  const blob = await fetchProtectedZipBlob(zipUrl, password);
  const text = await blob.text();
  try {
    const parsed = JSON.parse(text);
    if (!parsed.supabaseUrl || !parsed.supabaseKey) {
      throw new Error("Invalid configuration format. Missing required fields.");
    }
    return parsed;
  } catch (e) {
    throw new Error("Configuration file is corrupted or invalid format.");
  }
}

async function attemptUnlock(){
  const username = els.zipUsernameInput.value.trim();
  const password = els.zipPasswordInput.value;
  hideLockError();
  
  if (!username || !password) {
    showLockError("Please enter both username and password.");
    return;
  }
  
  const btnText = els.unlockBtn.querySelector(".btn-text");
  const btnLoader = els.unlockBtn.querySelector(".btn-loader");
  
  try {
    btnText.style.display = "none";
    btnLoader.style.display = "inline-block";
    els.unlockBtn.disabled = true;
    
    const config = await readConfigFromZip(username, password);
    runtimeConfig = config;
    
    // Store in sessionStorage for all pages to access
    sessionStorage.setItem("loanledger-runtime-config", JSON.stringify(runtimeConfig));
    sessionStorage.setItem("loanledger-entries", JSON.stringify([]));
    sessionStorage.setItem("loanledger-unlocked", "true");
    
    // Store username for persistence
    sessionStorage.setItem(ZIP_USERNAME_SESSION_KEY, username);
    localStorage.setItem(ZIP_USERNAME_STORAGE_KEY, username);
    localStorage.setItem(ZIP_PASSWORD_STORAGE_KEY, password);
    
    // Show welcome screen
    els.welcomeName.textContent = username;
    els.lockScreen.classList.add("hide");
    els.welcomeScreen.classList.remove("hide");
    
    // Redirect after welcome animation
    setTimeout(() => {
      els.welcomeScreen.classList.add("exit-animation");
      setTimeout(() => {
        window.location.href = "/pages/expenses/index.html";
      }, 600);
    }, 2000);
    
  } catch (err) {
    console.error("Unlock failed:", err);
    showLockError(err.message || "Login failed. Please check your credentials and try again.");
  } finally {
    btnText.style.display = "inline-flex";
    btnLoader.style.display = "none";
    els.unlockBtn.disabled = false;
  }
}

function boot(){
  initFloatingCurrencyBackground();
  
  // Wait for zip library to be loaded
  const waitForZipLibrary = () => {
    if (window.zip?.ZipReader && window.zip?.BlobReader) {
      initializeLogin();
    } else {
      setTimeout(waitForZipLibrary, 100);
    }
  };
  
  waitForZipLibrary();
}

function initializeLogin(){
  // Auto-fill saved username if available
  const savedUsername = localStorage.getItem(ZIP_USERNAME_STORAGE_KEY) || sessionStorage.getItem(ZIP_USERNAME_SESSION_KEY);
  if (savedUsername) {
    els.zipUsernameInput.value = savedUsername;
    els.zipPasswordInput.focus();
  } else {
    els.zipUsernameInput.focus();
  }
  
  // Check if already logged in
  if (sessionStorage.getItem("loanledger-unlocked") === "true") {
    window.location.href = "/pages/expenses/index.html";
    return;
  }
  
  // Bind events
  els.unlockBtn.addEventListener("click", attemptUnlock);
  els.zipPasswordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") attemptUnlock();
  });
  els.zipUsernameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      els.zipPasswordInput.focus();
    }
  });
}

boot();
