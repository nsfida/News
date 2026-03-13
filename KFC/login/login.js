let members=[];

fetch("cards.json")
.then(res=>res.json())
.then(data=>{
members=data;
});

function buildUsername(name){

let parts=name.toLowerCase().split(" ");

let first=parts[0];
let last=parts[parts.length-1];

return first+last;
}

function buildPassword(issue){

let parts=issue.split("-");

let day=parts[0];
let month=parts[1];
let year=parts[2].slice(-2);

return day+month+year;
}


function login(){

let user=document.getElementById("username").value.toLowerCase();
let pass=document.getElementById("password").value;

let found=false;

members.forEach(m=>{

let u=buildUsername(m.name);
let p=buildPassword(m.Issue);

if(user===u && pass===p){
found=true;
}

});

if(found){

document.getElementById("loginPanel").classList.add("hidden");

document.getElementById("formPanel").classList.remove("hidden");

}else{

document.getElementById("loginError").innerText="Invalid Login";

}

}



function generateCard(){

let name=document.getElementById("name").value;
let urdu=document.getElementById("urdu").value;
let desg=document.getElementById("desg").value;
let cno=document.getElementById("cno").value;
let bg=document.getElementById("bg").value;
let mobile=document.getElementById("mobile").value;

let photo=document.getElementById("photo").files[0];

let reader=new FileReader();

reader.onload=function(e){

document.getElementById("cardPhoto").src=e.target.result;

};

reader.readAsDataURL(photo);

document.getElementById("cardName").innerText=name;
document.getElementById("cardUrdu").innerText=urdu;
document.getElementById("cardDesg").innerText=desg;
document.getElementById("cardNo").innerText="Card: "+cno;
document.getElementById("cardBG").innerText="Blood: "+bg;
document.getElementById("cardMobile").innerText="Mobile: "+mobile;

document.getElementById("cardPanel").classList.remove("hidden");

}