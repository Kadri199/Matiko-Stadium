import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const OWNER_UID = "hU0pqkyVYMYhBQ5GBAPHcHemph23";
const OWNER_EMAIL = "afterdark706@gmail.com";
const $ = id => document.getElementById(id);
let currentUser = null;
let profile = null;
let ready = false;
const goHome = () => { window.location.assign("https://kadri199.github.io/Matiko-Stadium/"); };
document.getElementById("homeBtn").addEventListener("click", goHome);
document.getElementById("homeBtnBottom").addEventListener("click", goHome);
const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function showMessage(id, value, error=false) {
  const el=$(id); el.textContent=value; el.style.color=error?"#a34d43":"#16704d";
}
function challengeCard(item, own=false) {
  const d=item.data();
  const accepted=d.status==="accepted";
  const card=document.createElement("article"); card.className="challenge-card";
  const title=document.createElement("h3"); title.textContent=d.teamName||"فريق";
  const tag=document.createElement("span"); tag.className="tag"; tag.textContent=accepted?"تم قبول التحدي":"تحدٍ مفتوح";
  const meta=document.createElement("div"); meta.className="meta"; meta.textContent="📅 "+d.day+"   •   🕒 "+d.time;
  const note=document.createElement("p"); note.textContent=d.note||"لا توجد ملاحظة.";
  card.append(tag,title,meta,note);
  if(accepted){const acceptedLine=document.createElement("p");acceptedLine.textContent="الفريق المنافس: "+(d.acceptedByName||"فريق مشارك");card.append(acceptedLine);}
  const actions=document.createElement("div");actions.className="card-actions";
  if(!own&&!accepted&&d.teamUid!==currentUser.uid){
    const btn=document.createElement("button");btn.className="btn btn-primary";btn.textContent="قبول التحدي";
    btn.addEventListener("click",async()=>{
      if(!confirm("هل تريد قبول تحدي "+(d.teamName||"هذا الفريق")+"؟"))return;
      btn.disabled=true;
      try{
        await updateDoc(doc(db,"challenges",item.id),{
          status:"accepted",acceptedByUid:currentUser.uid,acceptedByName:profile.fullName,acceptedAt:serverTimestamp()
        });
        showMessage("pageMessage","تم قبول التحدي. سيظهر ضمن تحدياتك.");
        await Promise.all([loadChallenges(),loadTeamMatches()]);
      }catch(e){btn.disabled=false;showMessage("pageMessage","تعذر قبول التحدي: "+e.message,true);}
    });
    actions.append(btn);
  }
  if(own && d.teamUid===currentUser.uid){
    const del=document.createElement("button");del.className="btn btn-outline";del.textContent="حذف التحدي";
    del.addEventListener("click",async()=>{
      if(!confirm("هل تريد حذف هذا التحدي؟"))return;
      try{await deleteDoc(doc(db,"challenges",item.id));await loadChallenges();}
      catch(e){showMessage("pageMessage","تعذر حذف التحدي: "+e.message,true);}
    });
    actions.append(del);
  }
  if(actions.childElementCount)card.append(actions);
  return card;
}
function renderTeamMatches(items){
  const host=$("teamMatchResults");
  const ordered=[...items].sort((a,b)=>String(b.data().matchDate||"").localeCompare(String(a.data().matchDate||"")));
  const totals=ordered.reduce((sum,item)=>{
    const d=item.data();
    sum.scored+=Number(d.goalsFor)||0;
    sum.conceded+=Number(d.goalsAgainst)||0;
    return sum;
  },{scored:0,conceded:0});
  $("teamMatchesPlayed").textContent=ordered.length;
  $("teamGoalsScored").textContent=totals.scored;
  $("teamGoalsConceded").textContent=totals.conceded;
  host.innerHTML="";
  if(!ordered.length){host.innerHTML='<div class="empty">لم تسجّل أي مقابلة بعد. أضف نتيجة أول مباراة لفريقك.</div>';return;}
  ordered.forEach(item=>{
    const d=item.data();
    const card=document.createElement("article");card.className="team-match-card";
    const head=document.createElement("div");head.className="team-match-head";
    const opponent=document.createElement("strong");opponent.textContent=d.opponentName||"فريق منافس";
    const date=document.createElement("time");date.textContent=d.matchDate||"";
    head.append(opponent,date);
    const score=document.createElement("div");score.className="team-match-score";
    const own=document.createElement("span");own.textContent=profile.fullName||"فريقي";
    const result=document.createElement("b");result.textContent=String(d.goalsFor)+" - "+String(d.goalsAgainst);
    const other=document.createElement("span");other.textContent=d.opponentName||"المنافس";
    score.append(own,result,other);
    const del=document.createElement("button");del.type="button";del.className="btn btn-outline match-delete";del.textContent="حذف";
    del.addEventListener("click",async()=>{
      if(!confirm("هل تريد حذف نتيجة هذه المقابلة؟"))return;
      del.disabled=true;
      try{await deleteDoc(doc(db,"teamMatches",item.id));await loadTeamMatches();}
      catch(e){del.disabled=false;showMessage("matchMessage","تعذر حذف النتيجة: "+e.message,true);}
    });
    card.append(head,score,del);host.append(card);
  });
}
async function loadTeamMatches(){
  if(!ready||!currentUser)return;
  try{
    const snap=await getDocs(query(collection(db,"teamMatches"),where("teamUid","==",currentUser.uid)));
    renderTeamMatches(snap.docs);
  }catch(e){showMessage("matchMessage","تعذر تحميل نتائج المقابلات: "+e.message,true);}
}
$("teamMatchForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!ready||!currentUser||!profile){showMessage("matchMessage","انتظر حتى يكتمل تحميل ملف فريقك.",true);return;}
  const opponent=$("matchOpponent").value.trim();
  const matchDate=$("matchDate").value;
  const goalsFor=Number($("matchGoalsFor").value);
  const goalsAgainst=Number($("matchGoalsAgainst").value);
  if(!opponent||!matchDate||!Number.isInteger(goalsFor)||!Number.isInteger(goalsAgainst)||goalsFor<0||goalsAgainst<0||goalsFor>99||goalsAgainst>99){
    showMessage("matchMessage","يرجى إدخال اسم الفريق والتاريخ وعدد صحيح للأهداف من 0 إلى 99.",true);return;
  }
  const btn=$("saveMatchBtn");btn.disabled=true;btn.textContent="جارٍ حفظ النتيجة...";
  try{
    await addDoc(collection(db,"teamMatches"),{
      teamUid:currentUser.uid,teamName:profile.fullName||"فريق",
      opponentName:opponent,matchDate,goalsFor,goalsAgainst,createdAt:serverTimestamp()
    });
    e.target.reset();
    $("matchDate").value=new Date().toLocaleDateString("en-CA");
    showMessage("matchMessage","تم تسجيل نتيجة المقابلة بنجاح.");
    await loadTeamMatches();
  }catch(err){showMessage("matchMessage","تعذر تسجيل النتيجة: "+err.message,true);}
  finally{btn.disabled=false;btn.textContent="＋ تسجيل نتيجة المقابلة";}
});
function renderList(id,items,own=false){
  const host=$(id);host.innerHTML="";
  if(!items.length){host.innerHTML='<div class="empty">لا توجد تحديات لعرضها حالياً.</div>';return;}
  items.forEach(item=>host.append(challengeCard(item,own)));
}
async function loadChallenges(){
  if(!ready)return;
  try{
    const [openSnap,ownSnap,acceptedSnap]=await Promise.all([
      getDocs(query(collection(db,"challenges"),where("status","==","open"))),
      getDocs(query(collection(db,"challenges"),where("teamUid","==",currentUser.uid))),
      getDocs(query(collection(db,"challenges"),where("acceptedByUid","==",currentUser.uid)))
    ]);
    const openItems=openSnap.docs;
    const ownItems=[...ownSnap.docs,...acceptedSnap.docs.filter(d=>!ownSnap.docs.some(o=>o.id===d.id))];
    renderList("openChallenges",openItems,false);
    renderList("myChallenges",ownItems,true);
    $("myChallengeCount").textContent=ownItems.length;
    $("openChallengeCount").textContent=openItems.length;
    $("acceptedCount").textContent=acceptedSnap.size;
  }catch(e){showMessage("pageMessage","تعذر تحميل التحديات: "+e.message,true);}
}
$("challengeForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const btn=$("publishBtn");
  if(!ready || !currentUser || !profile){
    showMessage("challengeMessage","يرجى الانتظار حتى يكتمل تحميل بيانات الفريق، ثم حاول مجدداً.",true);
    return;
  }
  const day=$("challengeDay").value;
  const time=$("challengeTime").value;
  if(!day || !time){
    showMessage("challengeMessage","يرجى اختيار اليوم والساعة أولاً.",true);
    return;
  }
  btn.disabled=true;
  btn.textContent="جارٍ نشر التحدي...";
  showMessage("challengeMessage","جارٍ إرسال التحدي...",false);
  try{
    await addDoc(collection(db,"challenges"),{
      teamUid:currentUser.uid,
      teamName:profile.fullName || "فريق",
      day,
      time,
      note:$("challengeNote").value.trim(),
      status:"open",
      createdAt:serverTimestamp()
    });
    e.target.reset();
    showMessage("challengeMessage","تم نشر التحدي بنجاح، وأصبح ظاهراً للفرق الأخرى.",false);
    await loadChallenges();
  }catch(err){
    console.error("Challenge publishing failed:",err);
    showMessage("challengeMessage","تعذر نشر التحدي: "+(err.message || "خطأ غير معروف"),true);
  }finally{
    btn.disabled=false;
    btn.textContent="＋ نشر تحدي";
  }
});
$("refreshBtn").addEventListener("click",loadChallenges);
$("logoutBtn").addEventListener("click",async()=>{await signOut(auth);location.href="index.html";});
onAuthStateChanged(auth,async user=>{
  if(!user){location.href="index.html";return;}
  if(user.uid===OWNER_UID&&user.email?.toLowerCase()===OWNER_EMAIL){location.href="admin.html";return;}
  currentUser=user;
  try{
    const snap=await getDoc(doc(db,"users",user.uid));
    if(!snap.exists()||snap.data().role!=="team"){await signOut(auth);location.href="index.html";return;}
    profile=snap.data();ready=true;
    $("teamName").textContent=profile.fullName||"فريقي";
    $("teamEmail").textContent=user.email||"";
    $("matchDate").value=new Date().toLocaleDateString("en-CA");
    showMessage("pageMessage","تم تسجيل الدخول بنجاح.");
    await loadChallenges();
  }catch(e){showMessage("pageMessage","تعذر تحميل ملف الفريق: "+e.message,true);}
});