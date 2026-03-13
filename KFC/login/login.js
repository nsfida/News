let members = [];

fetch("cards.json")
.then(response => response.json())
.then(data => {
members = data;
console.log("Members Loaded:", members);
});

/* CREATE USERNAME
firstname + lastname */

function createUsername(name){

```
name = name.trim().toLowerCase();

let parts = name.split(/\s+/);

let first = parts[0];

let last = parts[parts.length - 1];

return first + last;
```

}

/* CREATE PASSWORD
dd-mm-yyyy → ddmmyy */

function createPassword(issue){

```
issue = issue.trim();

let parts = issue.split("-");

let day = parts[0].padStart(2,"0");

let month = parts[1].padStart(2,"0");

let year = parts[2].slice(-2);

return day + month + year;
```

}

function login(){

```
let inputUser = document
    .getElementById("username")
    .value
    .trim()
    .toLowerCase();

let inputPass = document
    .getElementById("password")
    .value
    .trim();

let match = false;


members.forEach(member => {

    let jsonUser = createUsername(member.name);

    let jsonPass = createPassword(member.Issue);

    console.log(
        "Checking:",
        jsonUser,
        jsonPass
    );

    if(inputUser === jsonUser && inputPass === jsonPass){

        match = true;

    }

});


if(match){

    document.getElementById("loginBox").style.display = "none";

    document.getElementById("formBox").classList.remove("hidden");

}

else{

    document.getElementById("error").innerText =
    "Invalid username or password";

}
```

}

/* CARD GENERATION */

function generate(){

```
let name = document.getElementById("name").value;

let urdu = document.getElementById("urdu").value;

let desg = document.getElementById("desg").value;

let cno = document.getElementById("cno").value;

let bg = document.getElementById("bg").value;

let mobile = document.getElementById("mobile").value;

let photo = document.getElementById("photo").files[0];


document.getElementById("eName").innerText = name;

document.getElementById("eUrdu").innerText = urdu;

document.getElementById("eDesg").innerText = desg;

document.getElementById("eNo").innerText = "Card: " + cno;

document.getElementById("eBG").innerText = "Blood: " + bg;

document.getElementById("eMobile").innerText = "Mobile: " + mobile;


let reader = new FileReader();

reader.onload = function(e){

    document.getElementById("photoPreview").src = e.target.result;

};

reader.readAsDataURL(photo);


document.getElementById("ecardSection")
.classList.remove("hidden");
```

}
