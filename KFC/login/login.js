let members = [];

/* LOAD JSON */

fetch("cards.json")
.then(res => res.json())
.then(data => {

```
members = data;

console.log("JSON loaded:", members);
```

})
.catch(err => {

```
console.log("JSON error:", err);
```

});

/* CREATE USERNAME */

function createUsername(name){

```
name = name.trim().toLowerCase();

let words = name.split(/\s+/);

let first = words[0];

let last = words[words.length - 1];

return first + last;
```

}

/* CREATE PASSWORD */

function createPassword(issue){

```
let p = issue.split("-");

let day = p[0];

let month = p[1];

let year = p[2].slice(-2);

return day + month + year;
```

}

/* LOGIN */

function login(){

```
if(members.length === 0){

    document.getElementById("error").innerText =
    "System loading. Please try again.";

    return;

}


let user = document.getElementById("username")
.value.trim().toLowerCase();

let pass = document.getElementById("password")
.value.trim();


let found = false;


members.forEach(m => {

    let u = createUsername(m.name);

    let p = createPassword(m.Issue);

    if(user === u && pass === p){

        found = true;

    }

});


if(found){

    document.getElementById("loginBox").style.display = "none";

    document.getElementById("formBox")
    .classList.remove("hidden");

}

else{

    document.getElementById("error").innerText =
    "Invalid username or password";

}
```

}

/* GENERATE CARD */

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

        document.getElementById("photoPreview").src =
        e.target.result;

    };

    reader.readAsDataURL(photo);

}


document.getElementById("ecardSection")
.classList.remove("hidden");
```

}
