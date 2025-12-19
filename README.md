<!DOCTYPE html>
<html>
<head>
  <title>Family Quiz Game</title>
  <style>
    body { font-family: Arial; margin: 0; }
    .side {
      position: fixed;
      right: 0;
      top: 0;
      width: 200px;
      height: 100%;
      background: #222;
      color: white;
      padding: 10px;
    }
    .hidden { display: none; }
    button { padding: 10px; margin: 5px 0; width: 100%; }
  </style>
</head>
<body>

<!-- SIDE BAR -->
<div class="side">
  <button onclick="openHost()">HOST</button>
</div>

<!-- PLAYER SIGN IN -->
<div id="playerLogin">
  <h2>Join Game</h2>
  <input id="fname" placeholder="First Name"><br><br>
  <input id="lname" placeholder="Last Name"><br><br>

  <label>
    <input type="radio" name="mode" value="private"> Private
  </label><br>
  <label>
    <input type="radio" name="mode" value="group"> Group
  </label><br><br>

  <select id="team" class="hidden">
    <option value="">Choose Team</option>
    <option value="red">🔴 Red</option>
    <option value="blue">🔵 Blue</option>
  </select><br><br>

  <button onclick="join()">Join</button>
</div>

<!-- GAME VIEW -->
<div id="game" class="hidden">
  <h2 id="question"></h2>
  <div id="answers"></div>
</div>

<!-- HOST PASSWORD -->
<div id="hostLogin" class="hidden">
  <h3>Host Password</h3>
  <input id="hostPass" type="password">
  <button onclick="hostLogin()">Enter</button>
</div>

<!-- HOST PANEL -->
<div id="hostPanel" class="hidden">
  <h3>Host Control</h3>
  <button onclick="startGame()">Start Game</button>
  <button onclick="reveal()">Reveal Answer</button>
  <button onclick="next()">Next Question</button>
</div>

<script>
let isHost = false;
let currentQuestion = 0;

document.querySelectorAll('input[name="mode"]').forEach(r => {
  r.onchange = () => {
    document.getElementById("team").classList.toggle("hidden", r.value !== "group");
  };
});

function openHost() {
  document.getElementById("hostLogin").classList.remove("hidden");
}

function hostLogin() {
  if (document.getElementById("hostPass").value === "1027") {
    isHost = true;
    document.getElementById("hostLogin").classList.add("hidden");
    document.getElementById("hostPanel").classList.remove("hidden");
    alert("You are now the host");
  } else {
    alert("Wrong password");
  }
}

function join() {
  document.getElementById("playerLogin").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");
  loadQuestion();
}

function loadQuestion() {
  let q = {
    question: "What is 5 + 3?",
    answers: ["6", "7", "8", "9"]
  };

  document.getElementById("question").innerText = q.question;
  document.getElementById("answers").innerHTML = q.answers
    .map((a, i) => `<button onclick="answer(${i})">${a}</button>`)
    .join("");
}

function answer(i) {
  alert("Answer locked: " + (i + 1));
}

function startGame() {
  alert("Game started");
}

function reveal() {
  alert("Correct answer revealed");
}

function next() {
  alert("Next question");
}
</script>

</body>
</html>


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
