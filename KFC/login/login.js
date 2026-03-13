let members = [];

// Load JSON
fetch("cards.json")
.then(res => res.json())
.then(data => {
    members = data;
    console.log("Members loaded:", members);
})
.catch(err => console.error("JSON load error:", err));

function createUsername(name){
    if(!name) return "";
    let parts = name.trim().toLowerCase().split(/\s+/);
    return parts[0] + parts[parts.length - 1];
}

function createPassword(issue){
    if(!issue || issue === "-") return null;
    let parts = issue.split("-");
    if(parts.length !== 3) return null;
    return parts[0] + parts[1] + parts[2].slice(-2);
}

function login(){
    let user = document.getElementById("username").value.trim().toLowerCase();
    let pass = document.getElementById("password").value.trim();
    let error = document.getElementById("error");

    if(members.length === 0){
        error.innerText = "System loading, try again in a moment.";
        return;
    }

    let found = members.find(m => {
        let u = createUsername(m.name);
        let p = createPassword(m.Issue);
        return u === user && p === pass;
    });

    if(found){
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("formBox").classList.remove("hidden");

        // Auto-fill data
        document.getElementById("name").value = found.name;
        document.getElementById("desg").value = found.Desg;
        document.getElementById("cno").value = found.CNo;
        document.getElementById("bg").value = found.BG;
        document.getElementById("mobile").value = found.mobile;
    } else {
        error.innerText = "Invalid username or password.";
    }
}

function generate(){
    let name = document.getElementById("name").value;
    let urdu = document.getElementById("urdu").value;
    let desg = document.getElementById("desg").value;
    let cno = document.getElementById("cno").value;
    let bg = document.getElementById("bg").value;
    let mobile = document.getElementById("mobile").value;
    let photo = document.getElementById("photo").files[0];

    document.getElementById("ecardSection").classList.remove("hidden");
    document.getElementById("eName").innerText = name;
    document.getElementById("eUrdu").innerText = urdu;
    document.getElementById("eDesg").innerText = desg;
    document.getElementById("eNo").innerText = "Card: " + cno;
    document.getElementById("eBG").innerText = "Blood: " + bg;
    document.getElementById("eMobile").innerText = "Mobile: " + mobile;

    if(photo){
        let reader = new FileReader();
        reader.onload = function(e){
            document.getElementById("photoPreview").src = e.target.result;
        }
        reader.readAsDataURL(photo);
    }
}
