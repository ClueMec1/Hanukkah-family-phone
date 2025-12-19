<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Neon Quiz Live</title>

<style>
:root {
  --bg:#050505; --panel:#000c; --neon:#00ff9c; --soft:#00ff9c55;
}
*{box-sizing:border-box;font-family:Arial}
body{
  margin:0;height:100vh;background:radial-gradient(circle,#0b2d1f,#000);
  color:#eafff5;overflow:hidden;
}
.hidden{display:none}
button{
  border:2px solid var(--neon);background:black;color:var(--neon);
  padding:14px;border-radius:12px;cursor:pointer;
  transition:.2s;
}
button:hover{background:var(--neon);color:black;box-shadow:0 0 20px var(--neon)}
input,select{
  width:100%;padding:10px;margin:6px 0;
  background:black;color:white;border:1px solid var(--soft);
  border-radius:8px;
}
.modal{
  position:fixed;inset:0;background:#000a;
  display:flex;align-items:center;justify-content:center;
}
.box{
  background:var(--panel);padding:25px;width:330px;
  border-radius:16px;text-align:center;
  box-shadow:0 0 30px var(--soft);
}
#game{padding:30px}
#question{font-size:28px;margin-bottom:25px}
.answers{display:grid;grid-template-columns:1fr 1fr;gap:15px}
.correct{background:var(--neon)!important;color:black}
.wrong{opacity:.3}
#hostPanel{
  position:fixed;bottom:0;width:100%;
  background:black;border-top:2px solid var(--soft);
  padding:10px;display:flex;gap:10px;justify-content:center;
}
#players{
  position:fixed;right:0;top:0;width:220px;height:100%;
  background:black;border-left:2px solid var(--soft);padding:10px;
}
.player{padding:6px;border-bottom:1px solid #133}
</style>
</head>

<body>

<!-- LOGIN -->
<div id="login" class="modal">
  <div class="box">
    <h2>JOIN GAME</h2>
    <input id="fname" placeholder="First name">
    <input id="lname" placeholder="Last name">
    <button onclick="join()">Join</button><br><br>
    <button onclick="openHost()">Host</button>
  </div>
</div>

<!-- HOST LOGIN -->
<div id="hostLogin" class="modal hidden">
  <div class="box">
    <h3>Host Password</h3>
    <input id="hostPass" type="password">
    <button onclick="hostLogin()">Enter</button>
  </div>
</div>

<!-- GAME -->
<div id="game" class="hidden">
  <h1 id="question"></h1>
  <div class="answers" id="answers"></div>
</div>

<!-- HOST CONTROLS -->
<div id="hostPanel" class="hidden">
  <button onclick="reveal()">Reveal</button>
  <button onclick="next()">Next</button>
  <button onclick="showAdd()">Add Question</button>
</div>

<!-- PLAYERS -->
<div id="players" class="hidden">
  <h3>Players</h3>
  <div id="playerList"></div>
</div>

<!-- ADD QUESTION -->
<div id="addQ" class="modal hidden">
  <div class="box">
    <h3>New Question</h3>
    <input id="qText" placeholder="Question">
    <input id="a0" placeholder="Answer 1">
    <input id="a1" placeholder="Answer 2">
    <input id="a2" placeholder="Answer 3">
    <input id="a3" placeholder="Answer 4">
    <select id="correct">
      <option value="0">Correct: 1</option>
      <option value="1">Correct: 2</option>
      <option value="2">Correct: 3</option>
      <option value="3">Correct: 4</option>
    </select>
    <button onclick="addQuestion()">Save</button>
  </div>
</div>

<!-- SOUNDS -->
<audio id="clickS" src="https://assets.mixkit.co/sfx/preview/mixkit-select-click-1109.mp3"></audio>
<audio id="rightS" src="https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3"></audio>
<audio id="wrongS" src="https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3"></audio>

<script type="module">
/* ================= FIREBASE ================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, update, onValue, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* 
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyByh09evolR8lCvwWZ160zLUJdGXIzPXIk",
  authDomain: "family-phone-game.firebaseapp.com",
  databaseURL: "https://family-phone-game-default-rtdb.firebaseio.com",
  projectId: "family-phone-game",
  storageBucket: "family-phone-game.firebasestorage.app",
  messagingSenderId: "933908338610",
  appId: "1:933908338610:web:ca5ce26b24118b833bb6ab",
  measurementId: "G-DRVXJM4THP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const firebaseConfig = {
  apiKey: "PASTE_HERE",
  authDomain: "PASTE_HERE",
  databaseURL: "PASTE_HERE",
  projectId: "PASTE_HERE",
  storageBucket: "PASTE_HERE",
  messagingSenderId: "PASTE_HERE",
  appId: "PASTE_HERE"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ================= STATE ================= */
let playerId=null,isHost=false;
let QUESTIONS=[];

/* ================= JOIN ================= */
window.join=()=>{
  const name=fname.value+" "+lname.value;
  playerId=push(ref(db,"players")).key;
  set(ref(db,"players/"+playerId),{name,score:0});
  login.classList.add("hidden");
  game.classList.remove("hidden");
};

window.openHost=()=>hostLogin.classList.remove("hidden");

window.hostLogin=()=>{
  if(hostPass.value==="1027"){
    isHost=true;
    hostLogin.classList.add("hidden");
    hostPanel.classList.remove("hidden");
    players.classList.remove("hidden");
  }
};

/* ================= ANSWER ================= */
window.answer=i=>{
  clickS.play();
  set(ref(db,"answers/"+playerId),i);
};

/* ================= HOST ================= */
window.reveal=()=>update(ref(db,"game"),{reveal:true});
window.next=()=>update(ref(db,"game"),{index:Date.now(),reveal:false,answers:{}});
window.showAdd=()=>addQ.classList.remove("hidden");

window.addQuestion=()=>{
  QUESTIONS.push({
    q:qText.value,
    a:[a0.value,a1.value,a2.value,a3.value],
    correct:+correct.value
  });
  set(ref(db,"questions"),QUESTIONS);
  addQ.classList.add("hidden");
};

/* ================= LISTENERS ================= */
onValue(ref(db,"questions"),s=>QUESTIONS=s.val()||[]);

onValue(ref(db,"game"),snap=>{
  if(!QUESTIONS.length)return;
  const d=snap.val()||{};
  const q=QUESTIONS[(d.index||0)%QUESTIONS.length];
  question.innerText=q.q;
  answers.innerHTML=q.a.map((x,i)=>
    `<button onclick="answer(${i})">${x}</button>`).join("");

  if(d.reveal){
    document.querySelectorAll("#answers button").forEach((b,i)=>{
      if(i===q.correct){b.classList.add("correct");rightS.play();}
      else b.classList.add("wrong");
    });
  }
});

onValue(ref(db,"answers"),snap=>{
  if(!snap.exists())return;
  snap.forEach(a=>{
    if(a.val()===QUESTIONS[0]?.correct){
      update(ref(db,"players/"+a.key+"/score"),{".sv":{increment:1}});
    }
  });
});

onValue(ref(db,"players"),snap=>{
  playerList.innerHTML="";
  snap.forEach(p=>{
    const d=p.val();
    playerList.innerHTML+=`<div class="player">${d.name} — ${d.score}</div>`;
  });
});
</script>

</body>
</html>




const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
