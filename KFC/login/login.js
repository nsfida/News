let members=[];

fetch("cards.json")

.then(res=>res.json())

.then(data=>members=data);

function usernameBuilder(name){

let p=name.toLowerCase().split(" ");

return p[0]+p[p.length-1];

}

function passwordBuilder(issue){

let d=issue.split("-");

return d[0]+d[1]+d[2].slice(-2);

}

function login(){

let u=document.getElementById("username").value.toLowerCase();

let p=document.getElementById("password").value;

let ok=false;

members.forEach(m=>{

if(u===usernameBuilder(m.name) && p===passwordBuilder(m.Issue)){

ok=true;

}

});

if(ok){

document.getElementById("loginBox").style.display="none";

document.getElementById("formBox").classList.remove("hidden");

}else{

document.getElementById("error").innerText="Invalid username or password";

}

}

function generate(){

let name=document.getElementById("name").value;

let urdu=document.getElementById("urdu").value;

let desg=document.getElementById("desg").value;

let cno=document.getElementById("cno").value;

let bg=document.getElementById("bg").value;

let mobile=document.getElementById("mobile").value;

let photo=document.getElementById("photo").files[0];

document.getElementById("eName").innerText=name;

document.getElementById("eUrdu").innerText=urdu;

document.getElementById("eDesg").innerText=desg;

document.getElementById("eNo").innerText="Card: "+cno;

document.getElementById("eBG").innerText="Blood: "+bg;

document.getElementById("eMobile").innerText="Mobile: "+mobile;

let reader=new FileReader();

reader.onload=function(e){

document.getElementById("photoPreview").src=e.target.result;

};

reader.readAsDataURL(photo);

document.getElementById("qr").innerHTML="";

new QRCode(document.getElementById("qr"),mobile);

document.getElementById("ecardSection").classList.remove("hidden");

}

function download(){

let element=document.getElementById("ecard");

html2pdf().from(element).save("ecard.pdf");

}
