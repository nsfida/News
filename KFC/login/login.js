/* --------------------------
LOAD MEMBERS FROM JSON
--------------------------- */

let members = [];

fetch("cards.json")
.then(response => response.json())
.then(data => {
members = data;
console.log("Members loaded:", members);
})
.catch(error => {
console.error("JSON loading error:", error);
});

/* --------------------------
CREATE USERNAME
first name + last name
--------------------------- */

function createUsername(fullName){

```
if(!fullName) return "";

fullName = fullName.trim().toLowerCase();

let words = fullName.split(/\s+/);

let firstName = words[0];

let lastName = words[words.length - 1];

return firstName + lastName;
```

}

/* --------------------------
CREATE PASSWORD
08-06-2022 → 080622
--------------------------- */

function createPassword(issueDate){

```
if(!issueDate) return "";

let parts = issueDate.split("-");

let day = parts[0].padStart(2,"0");

let month = parts[1].padStart(2,"0");

let year = parts[2].slice(-2);

return day + month + year;
```

}

/* --------------------------
LOGIN FUNCTION
--------------------------- */

function login(){

```
let username = document
    .getElementById("username")
    .value
    .trim()
    .toLowerCase();

let password = document
    .getElementById("password")
    .value
    .trim();

let foundUser = false;

members.forEach(member => {

    let jsonUser = createUsername(member.name);

    let jsonPass = createPassword(member.Issue);

    console.log("Checking:", jsonUser, jsonPass);

    if(username === jsonUser && password === jsonPass){

        foundUser = true;

    }

});


if(foundUser){

    document.getElementById("loginBox").style.display = "none";

    document.getElementById("formBox").classList.remove("hidden");

}

else{

    document.getElementById("error").innerText =
    "Invalid username or password";

}
```

}

/* --------------------------
GENERATE CARD
--------------------------- */

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



if(photo){

    let reader = new FileReader();

    reader.onload = function(e){

        document.getElementById("photoPreview").src = e.target.result;

    };

    reader.readAsDataURL(photo);

}



document
    .getElementById("ecardSection")
    .classList.remove("hidden");
```

}
