import { db } from "./firebase.js";
import {
  addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const scoreCollection = game => collection(db, "gameScores", game, "entries");
const games = {
  penalty: { label: "ضربات الجزاء", max: 5 },
  crossbar: { label: "العارضة العنيدة", max: 5 }
};
const $ = id => document.getElementById(id);
const state = {
  penalty: { active:false, shot:0, score:0, busy:false, playerName:"" },
  crossbar: { active:false, shot:0, score:0, power:0, direction:1, timer:null, busy:false, playerName:"" }
};

function showStatus(game, message, type="") {
  const el = $(game + "Status");
  el.textContent = message;
  el.className = "game-status" + (type ? " game-feedback " + type : "");
}
function saveScore(game) {
  const input = $(game + "Name");
  const name = input.value.trim().replace(/\s+/g," ");
  if (name.length < 2 || name.length > 24) {
    showStatus(game, "اكتب اسمك من حرفين إلى 24 حرفاً لحفظ النتيجة.", "bad");
    input.focus();
    return;
  }
  const s = state[game];
  showStatus(game, "جارٍ حفظ نتيجتك...", "good");
  $(game + "Save").disabled = true;
  addDoc(scoreCollection(game), { name, score:s.score, createdAt:serverTimestamp() })
    .then(() => {
      showStatus(game, "تم تسجيل نتيجتك في قائمة أفضل 10 لاعبين!", "good");
      $(game + "Register").classList.add("hidden");
      $(game + "Start").disabled = false;
      $(game + "Start").textContent = "العب مرة أخرى";
    })
    .catch(error => {
      console.error("Could not save game score:", error);
      showStatus(game, "تعذر حفظ النتيجة. حاول مجدداً.", "bad");
      $(game + "Save").disabled = false;
    });
}
function updateScore(game) {
  const s = state[game];
  $(game + "Score").textContent = s.score;
  $(game + "Round").textContent = s.shot + " / 5";
}
function renderTop(game, docs) {
  const host = $(game + "Top");
  if (!host) return;
  host.replaceChildren();
  if (!docs.length) return;
  docs.forEach((entry, index) => {
    const data = entry.data();
    const li = document.createElement("li");
    const rank = document.createElement("span");
    rank.className = "game-rank" + (index === 0 ? " gold" : index === 1 ? " silver" : index === 2 ? " bronze" : "");
    rank.textContent = ["🥇","🥈","🥉"][index] || String(index + 1);
    const name = document.createElement("span");
    name.className = "game-player";
    name.textContent = data.name || "لاعب";
    const score = document.createElement("b");
    score.className = "game-best";
    score.textContent = data.score + " / 5";
    li.append(rank,name,score);
    host.append(li);
  });
}
Object.keys(games).forEach(game => {
  const host = $(game + "Top");
  if (!host) return;
  const scoresQuery = query(scoreCollection(game), orderBy("score", "desc"), limit(10));
  onSnapshot(scoresQuery, snapshot => renderTop(game, snapshot.docs), error => {
    console.error("Leaderboard error:", error);
    host.textContent = "تعذر تحميل الترتيب حالياً.";
  });
});

function finishGame(game) {
  const s = state[game];
  s.active = false;
  s.busy = false;
  if (s.timer) { clearInterval(s.timer); s.timer = null; }
  updateScore(game);
  showStatus(game, "انتهت اللعبة! نتيجتك " + s.score + " من 5. اكتب اسمك لتسجيلها في أفضل 10.", "good");
  $(game + "Register").classList.remove("hidden");
  $(game + "Save").disabled = false;
  $(game + "Name").focus();
}

function startPenalty() {
  const s = state.penalty;
  s.active = true; s.shot = 0; s.score = 0; s.busy = false;
  updateScore("penalty");
  $("penaltyStart").disabled = true;
  showStatus("penalty", "اختر جهة التسديد: يسار أو وسط أو يمين.");
  document.querySelectorAll("[data-penalty-shot]").forEach(button => button.disabled = false);
}
function takePenalty(direction) {
  const s = state.penalty;
  if (!s.active || s.busy) return;
  s.busy = true;
  const keeper = ["left","center","right"][Math.floor(Math.random()*3)];
  s.shot++;
  const goal = keeper !== direction;
  if (goal) s.score++;
  updateScore("penalty");
  const directionName = {left:"اليسار",center:"الوسط",right:"اليمين"};
  showStatus("penalty", goal
    ? "⚽ هدف! الحارس ارتمى نحو " + directionName[keeper] + "."
    : "تصدى الحارس! اختار نفس جهة تسديدك.", goal ? "good" : "bad");
  document.querySelectorAll("[data-penalty-shot]").forEach(button => button.disabled = true);
  setTimeout(() => {
    s.busy = false;
    if (s.shot >= 5) {
      finishGame("penalty");
    } else if (s.active) {
      showStatus("penalty", "المحاولة التالية! اختر جهة التسديد.");
      document.querySelectorAll("[data-penalty-shot]").forEach(button => button.disabled = false);
    }
  }, 850);
}
if ($("penaltyStart")) $("penaltyStart").addEventListener("click", startPenalty);
if ($("penaltySave")) $("penaltySave").addEventListener("click", () => saveScore("penalty"));
document.querySelectorAll("[data-penalty-shot]").forEach(button => {
  button.disabled = true;
  button.addEventListener("click", () => takePenalty(button.dataset.penaltyShot));
});

function paintMeter() {
  const s = state.crossbar;
  s.power += s.direction * 2.4;
  if (s.power >= 100) { s.power = 100; s.direction = -1; }
  if (s.power <= 0) { s.power = 0; s.direction = 1; }
  $("crossbarMeter").style.width = s.power + "%";
}
function startCrossbar() {
  const s = state.crossbar;
  if (s.timer) clearInterval(s.timer);
  s.active = true; s.shot = 0; s.score = 0; s.power = 0; s.direction = 1; s.busy = false;
  updateScore("crossbar");
  $("crossbarStart").disabled = true;
  $("crossbarHit").disabled = false;
  $("crossbarMeter").style.width = "0%";
  showStatus("crossbar", "أوقف المؤشر عندما يصل إلى المنطقة الذهبية!");
  s.timer = setInterval(paintMeter, 35);
}
function hitCrossbar() {
  const s = state.crossbar;
  if (!s.active || s.busy) return;
  s.busy = true;
  const power = s.power;
  const hit = power >= 72 && power <= 88;
  if (hit) s.score++;
  s.shot++;
  updateScore("crossbar");
  showStatus("crossbar", hit
    ? "🎯 أصبت العارضة! تسديدة مثالية."
    : power < 72 ? "أقل من اللازم! الكرة مرت تحت العارضة." : "قوة زائدة! الكرة علت العارضة.", hit ? "good" : "bad");
  if (s.timer) { clearInterval(s.timer); s.timer = null; }
  $("crossbarHit").disabled = true;
  setTimeout(() => {
    s.busy = false;
    if (s.shot >= 5) {
      finishGame("crossbar");
    } else if (s.active) {
      s.power = 0; s.direction = 1;
      $("crossbarMeter").style.width = "0%";
      $("crossbarHit").disabled = false;
      showStatus("crossbar", "المحاولة التالية — اضغط عند المنطقة الذهبية!");
      s.timer = setInterval(paintMeter, 35);
    }
  }, 850);
}
if ($("crossbarStart")) $("crossbarStart").addEventListener("click", startCrossbar);
if ($("crossbarHit")) $("crossbarHit").addEventListener("click", hitCrossbar);
if ($("crossbarSave")) $("crossbarSave").addEventListener("click", () => saveScore("crossbar"));
if ($("crossbarHit")) $("crossbarHit").disabled = true;
