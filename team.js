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
        await loadChallenges();
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
    const openItems=openSnap.docs.filter(d=>d.data().teamUid!==currentUser.uid);
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
    showMessage("pageMessage","تم تسجيل الدخول بنجاح.");
    await loadChallenges();
  }catch(e){showMessage("pageMessage","تعذر تحميل ملف الفريق: "+e.message,true);}
});