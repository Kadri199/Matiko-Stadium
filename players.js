import { db } from "./firebase.js";
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
const $=id=>document.getElementById(id);
const players=[
["Lionel Messi","https://geofootballguessr.com/footballers/messi.webp"],
["Cristiano Ronaldo","https://geofootballguessr.com/footballers/ronaldo.webp"],
["Neymar Jr.","https://geofootballguessr.com/footballers/neymar.webp"],
["Kylian Mbappé","https://geofootballguessr.com/footballers/mbappe.webp"],
["Erling Haaland","https://geofootballguessr.com/footballers/haaland.webp"],
["Mohamed Salah","https://geofootballguessr.com/footballers/salah.webp"],
["Luka Modrić","https://geofootballguessr.com/footballers/modric.webp"],
["Kevin De Bruyne","https://geofootballguessr.com/footballers/de-bruyne.webp"],
["Vinícius Júnior","https://geofootballguessr.com/footballers/vinicius.webp"],
["Jude Bellingham","https://geofootballguessr.com/footballers/bellingham.webp"],
["Harry Kane","https://geofootballguessr.com/footballers/kane.webp"],
["Son Heung-min","https://geofootballguessr.com/footballers/son.webp"],
["Robert Lewandowski","https://geofootballguessr.com/footballers/lewandowski.webp"],
["Zlatan Ibrahimović","https://geofootballguessr.com/footballers/ibrahimovic.webp"],
["Zinedine Zidane","https://geofootballguessr.com/footballers/zidane.webp"],
["Ronaldinho","https://geofootballguessr.com/footballers/ronaldinho.webp"],
["David Beckham","https://geofootballguessr.com/footballers/beckham.webp"],
["Karim Benzema","https://geofootballguessr.com/footballers/benzema.webp"],
["Lamine Yamal","https://geofootballguessr.com/footballers/lamine-yamal.webp"]
];
let order=[],index=0,score=0,locked=false;
const shuffle=a=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x};
onSnapshot(query(collection(db,"gameScores","players","entries"),orderBy("score","desc"),limit(10)),snap=>{const list=$("top10");list.replaceChildren();snap.docs.forEach((doc,i)=>{const d=doc.data(),li=document.createElement("li");const rank=document.createElement("span");rank.textContent=["🥇","🥈","🥉"][i]||String(i+1);const name=document.createElement("span");name.textContent=d.name||"لاعب";const points=document.createElement("b");points.textContent=d.score+"/19";li.append(rank,name,points);list.append(li)})},console.warn);
function start(){order=shuffle(players);index=0;score=0;locked=false;$("quizFinish").classList.add("hidden");$("playerOptions").classList.remove("hidden");render()}
function render(){const p=order[index];$("questionNo").textContent=(index+1)+" / "+order.length;$("currentScore").textContent=score;$("correctCount").textContent=score;$("progressBar").style.width=(index/order.length*100)+"%";$("playerPhoto").src=p[1];$("playerPhoto").alt="صورة لاعب كرة قدم";$("quizFeedback").textContent="من هو هذا اللاعب؟";$("quizFeedback").className="players-feedback";const wrong=shuffle(players.filter(x=>x!==p)).slice(0,3);const options=shuffle([p,...wrong]);const box=$("playerOptions");box.replaceChildren();options.forEach(opt=>{const b=document.createElement("button");b.className="player-option";b.type="button";b.textContent=opt[0];b.addEventListener("click",()=>answer(b,opt===p,p[0]));box.append(b)})}
function answer(button,correct,name){if(locked)return;locked=true;const buttons=[...$("playerOptions").querySelectorAll("button")];buttons.forEach(b=>{b.disabled=true;if(b.textContent===name)b.classList.add("correct")});if(correct){score++;$("quizFeedback").textContent="إجابة صحيحة! أحسنت ⚽";$("quizFeedback").classList.add("good")}else{button.classList.add("wrong");$("quizFeedback").textContent="للأسف، اللاعب هو "+name;$("quizFeedback").classList.add("bad")} $("currentScore").textContent=score;$("correctCount").textContent=score;setTimeout(()=>{index++;if(index<order.length){locked=false;render()}else finish()},1050)}
function finish(){$("progressBar").style.width="100%";$("playerOptions").classList.add("hidden");$("quizFeedback").textContent="أكملت جميع اللاعبين!";$("finalScore").textContent="نتيجتك: "+score+" من "+players.length+" — "+Math.round(score/players.length*100)+"%";$("quizFinish").classList.remove("hidden")}
$("saveScore").addEventListener("click",async()=>{const name=$("playerName").value.trim().replace(/\s+/g," ");if(name.length<2||name.length>24){$("saveStatus").textContent="اكتب اسماً صحيحاً من حرفين إلى 24 حرفاً.";return}const btn=$("saveScore");btn.disabled=true;try{await addDoc(collection(db,"gameScores","players","entries"),{name,score,createdAt:serverTimestamp()});$("saveStatus").textContent="تم تسجيل نتيجتك في أفضل 10!";}catch(e){$("saveStatus").textContent="تعذر الحفظ. تحقق من الاتصال وحاول مجدداً.";btn.disabled=false}});
$("playAgain").addEventListener("click",()=>{ $("playerName").value="";$("saveStatus").textContent="";$("saveScore").disabled=false;start();window.scrollTo({top:0,behavior:"smooth"})});
start();