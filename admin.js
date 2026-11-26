import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  collection, doc, getDocs, getDoc, addDoc, setDoc, deleteDoc, updateDoc, serverTimestamp, arrayUnion
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const OWNER_UID = "hU0pqkyVYMYhBQ5GBAPHcHemph23";
const OWNER_EMAIL = "afterdark706@gmail.com";
const $ = id => document.getElementById(id);
const timesDefault = ["16:00 – 17:00","17:00 – 18:00","18:00 – 19:00","19:00 – 20:00","20:00 – 21:00","21:00 – 22:00"];
let ownerReady = false;

function message(id, text, error=false) {
  const el=$(id); el.textContent=text; el.style.color=error?"#a34d43":"#16704d";
}
function parseScorers(value) {
  return value.split("\n").map(line=>line.trim()).filter(Boolean).map(line=>{
    const parts=line.split(/\s*[-–:]\s*/);
    const goals=Number(parts.pop());
    return {name:parts.join(" - ").trim(),goals:Number.isFinite(goals)&&goals>=0?goals:0};
  }).filter(x=>x.name);
}
function renderRecords(target, docs, type) {
  const host=$(target); host.innerHTML="";
  if(!docs.length){host.innerHTML='<div class="empty-state">لا توجد بيانات منشورة بعد.</div>';return;}
  docs.forEach(item=>{
    const d=item.data();
    const card=document.createElement("article");card.className="record";
    const content=document.createElement("div");
    const title=document.createElement("h3");
    const detail=document.createElement("p");
    if(type==="results"){
      title.textContent=`${d.team1||"الفريق الأول"} ${d.score1??"—"} : ${d.score2??"—"} ${d.team2||"الفريق الثاني"}`;
      detail.textContent=`مسجلو ${d.team1}: ${(d.scorers1||[]).map(x=>x.name+" ("+x.goals+")").join("، ")||"—"}\nمسجلو ${d.team2}: ${(d.scorers2||[]).map(x=>x.name+" ("+x.goals+")").join("، ")||"—"}`;
    } else if(type==="news"){
      title.textContent=d.title||"خبر";
      detail.textContent=d.body||"";
      if(d.imageUrl){const img=document.createElement("img");img.src=d.imageUrl;img.alt="";img.loading="lazy";content.appendChild(img);}
    } else {
      title.textContent=d.fullName||"فريق بدون اسم";
      detail.textContent=d.email||"";
    }
    content.append(title,detail);
    const actions=document.createElement("div");actions.className="record-actions";
    const del=document.createElement("button");del.className="danger-btn";del.textContent=type==="users"?"حذف الملف":type==="news"?"🗑 حذف الخبر":"🗑 حذف";
    del.addEventListener("click",async()=>{
      const warning=type==="users"?"سيُحذف ملف الفريق من Firestore فقط، ولن يُحذف حساب تسجيل الدخول. هل تريد المتابعة؟":"هل تريد حذف هذا المنشور نهائياً؟";
      if(!confirm(warning))return;
      try{await deleteDoc(doc(db,type==="users"?"users":type,item.id));await loadAll();}
      catch(e){alert("تعذر الحذف: "+e.message);}
    });
    actions.append(del);card.append(content,actions);host.append(card);
  });
}
async function loadCollection(name,target,type=name){
  const snap=await getDocs(collection(db,name));
  const docs=snap.docs.sort((a,b)=>{
    const ta=a.data().createdAt?.seconds||0,tb=b.data().createdAt?.seconds||0;return tb-ta;
  });
  renderRecords(target,docs,type);
  return docs.length;
}
async function loadBookings(){
  const host=$("bookingsAdminList");
  const snap=await getDocs(collection(db,"bookings"));
  const docs=snap.docs.sort((a,b)=>(b.data().createdAt?.seconds||0)-(a.data().createdAt?.seconds||0));
  // Repair the public schedule list from every booking already approved by the owner.
  const approvedSlotKeys=[...new Set(docs
    .filter(item=>item.data().status==="approved"&&item.data().day&&item.data().time)
    .map(item=>`${item.data().day}|${item.data().time}`))];
  if(approvedSlotKeys.length){
    await setDoc(doc(db,"settings","schedule"),{
      bookedSlots:arrayUnion(...approvedSlotKeys),
      updatedAt:serverTimestamp()
    },{merge:true});
  }
  host.innerHTML="";
  if(!docs.length){host.innerHTML='<div class="empty-state">لا توجد طلبات حجز حتى الآن.</div>';return;}
  docs.forEach(item=>{
    const d=item.data(),card=document.createElement("article");card.className="record";
    const content=document.createElement("div"),title=document.createElement("h3"),detail=document.createElement("p");
    title.textContent=(d.teamName||"فريق")+" × "+(d.opponentName||"فريق منافس");
    const statusText=d.status==="approved"?"تمت الموافقة":d.status==="rejected"?"مرفوض":"قيد الانتظار";
    detail.textContent="اليوم: "+d.day+" | الساعة: "+d.time+" | الحالة: "+statusText+(d.note?" | ملاحظة: "+d.note:"")+" | البريد: "+(d.teamEmail||"");
    content.append(title,detail);card.append(content);
    const actions=document.createElement("div");actions.className="record-actions";
    if(d.status==="pending"){
      for(const [status,label] of [["approved","موافقة"],["rejected","رفض"]]){
        const btn=document.createElement("button");btn.className=status==="approved"?"btn btn-primary":"danger-btn";btn.textContent=label;
        btn.addEventListener("click",async()=>{
          btn.disabled=true;
          try{
            if(status==="approved"){
              const allBookings=await getDocs(collection(db,"bookings"));
              const conflict=allBookings.docs.some(x=>x.id!==item.id&&x.data().day===d.day&&x.data().time===d.time&&x.data().status==="approved");
              if(conflict) throw new Error("هذا الموعد محجوز بالفعل. اختر طلباً آخر.");
            }
            if(status==="approved"){
              await setDoc(doc(db,"settings","schedule"),{
                bookedSlots:arrayUnion(`${d.day}|${d.time}`),
                updatedAt:serverTimestamp()
              },{merge:true});
            }
            await updateDoc(doc(db,"bookings",item.id),{status,reviewedAt:serverTimestamp()});
            await loadBookings();
          }catch(e){alert("تعذر تحديث الطلب: "+e.message);btn.disabled=false;}
        });
        actions.append(btn);
      }
    }
    card.append(actions);host.append(card);
  });
}
async function loadAll(){
  if(!ownerReady)return;
  try{
    const [users,results,news]=await Promise.all([
      loadCollection("users","usersAdminList","users"),
      loadCollection("results","resultsAdminList","results"),
      loadCollection("news","newsAdminList","news")
    ]);
    $("userCount").textContent=users;$("resultCount").textContent=results;$("newsCount").textContent=news;
    await loadBookings();
    const sched=await getDoc(doc(db,"settings","schedule"));
    if(sched.exists()){
      $("scheduleTimes").value=(sched.data().times||timesDefault).join("\n");
      $("scheduleEnabled").checked=sched.data().enabled!==false;
    }else $("scheduleTimes").value=timesDefault.join("\n");
    const about=await getDoc(doc(db,"settings","about"));
    if(about.exists()){
      $("aboutDescription").value=about.data().description||"";
      $("aboutLocation").value=about.data().location||"";
      $("aboutPhone").value=about.data().phone||"";
    }
  }catch(e){$("accessMessage").textContent="تعذر تحميل بيانات اللوحة: "+e.message;}
}
document.querySelectorAll(".nav-item").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".nav-item").forEach(x=>x.classList.toggle("active",x===btn));
  document.querySelectorAll(".panel").forEach(x=>x.classList.toggle("active",x.id==="panel-"+btn.dataset.panel));
}));
$("logoutBtn").addEventListener("click",async()=>{await signOut(auth);location.href="index.html";});
$("scheduleForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!ownerReady)return;
  try{
    const times=$("scheduleTimes").value.split("\n").map(x=>x.trim()).filter(Boolean);
    if(!times.length)throw new Error("أدخل فترة واحدة على الأقل.");
    await setDoc(doc(db,"settings","schedule"),{times,enabled:$("scheduleEnabled").checked,updatedAt:serverTimestamp()},{merge:true});
    message("scheduleMessage","تم حفظ جدول المواعيد.");
  }catch(err){message("scheduleMessage",err.message,true);}
});
$("resultForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!ownerReady)return;
  try{
    await addDoc(collection(db,"results"),{
      date:$("matchDate").value,team1:$("resultTeam1").value.trim(),score1:Number($("score1").value),
      team2:$("resultTeam2").value.trim(),score2:Number($("score2").value),
      scorers1:parseScorers($("scorers1").value),scorers2:parseScorers($("scorers2").value),
      createdAt:serverTimestamp()
    });
    e.target.reset();message("resultMessage","تم نشر النتيجة بنجاح.");await loadAll();
  }catch(err){message("resultMessage",err.message,true);}
});
const CLOUDINARY_CLOUD_NAME = "vigpliv3";
const CLOUDINARY_UPLOAD_PRESET = "ml_default";
let selectedNewsImage = null;
let newsPreviewUrl = "";

$("newsImageFile").addEventListener("change",()=>{
  const file=$("newsImageFile").files?.[0]||null;
  selectedNewsImage=file;
  if(newsPreviewUrl)URL.revokeObjectURL(newsPreviewUrl);
  newsPreviewUrl="";
  if(!file){$("newsImagePreviewWrap").classList.add("hidden");return;}
  if(!file.type.startsWith("image/")){
    selectedNewsImage=null;$("newsImageFile").value="";
    message("newsMessage","يرجى اختيار ملف صورة صالح.",true);return;
  }
  newsPreviewUrl=URL.createObjectURL(file);
  $("newsImagePreview").src=newsPreviewUrl;
  $("newsImagePreviewWrap").classList.remove("hidden");
  message("newsMessage","تم اختيار الصورة. ستُرفع عند نشر الخبر.");
});
$("clearNewsImage").addEventListener("click",()=>{
  selectedNewsImage=null;$("newsImageFile").value="";
  $("newsImagePreview").removeAttribute("src");
  $("newsImagePreviewWrap").classList.add("hidden");
  if(newsPreviewUrl)URL.revokeObjectURL(newsPreviewUrl);
  newsPreviewUrl="";
});
async function prepareNewsImage(file){
  const bitmap=await createImageBitmap(file);
  const maxSide=1600,scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement("canvas");
  canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  const ctx=canvas.getContext("2d");
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(new Error("تعذر تجهيز الصورة.")),"image/jpeg",0.82));
  return new File([blob],(file.name.replace(/\.[^.]+$/,"")||"news-photo")+".jpg",{type:"image/jpeg"});
}
async function uploadNewsImage(file){
  const image=await prepareNewsImage(file);
  const form=new FormData();
  form.append("file",image);
  form.append("upload_preset",CLOUDINARY_UPLOAD_PRESET);
  const response=await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,{method:"POST",body:form});
  const data=await response.json();
  if(!response.ok||!data.secure_url)throw new Error(data.error?.message||"تعذر رفع الصورة إلى Cloudinary.");
  return data.secure_url;
}
$("newsForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!ownerReady)return;
  const submit=e.submitter||e.target.querySelector('button[type="submit"],button:not([type])');
  if(submit)submit.disabled=true;
  try{
    let imageUrl="";
    if(selectedNewsImage){
      message("newsMessage","جارٍ رفع الصورة...");
      imageUrl=await uploadNewsImage(selectedNewsImage);
    }
    await addDoc(collection(db,"news"),{
      title:$("newsTitle").value.trim(),body:$("newsBody").value.trim(),
      imageUrl,createdAt:serverTimestamp()
    });
    e.target.reset();selectedNewsImage=null;
    $("newsImagePreviewWrap").classList.add("hidden");
    $("newsImagePreview").removeAttribute("src");
    if(newsPreviewUrl)URL.revokeObjectURL(newsPreviewUrl);newsPreviewUrl="";
    message("newsMessage","تم نشر الخبر بنجاح.");
    await loadAll();
  }catch(err){message("newsMessage",err.message,true);}
  finally{if(submit)submit.disabled=false;}
});
$("aboutForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!ownerReady)return;
  try{
    await setDoc(doc(db,"settings","about"),{
      description:$("aboutDescription").value.trim(),location:$("aboutLocation").value.trim(),
      phone:$("aboutPhone").value.trim(),updatedAt:serverTimestamp()
    });
    message("aboutMessage","تم حفظ معلومات الملعب.");
  }catch(err){message("aboutMessage",err.message,true);}
});
onAuthStateChanged(auth,async user=>{
  if(!user){location.href="index.html";return;}
  if(user.uid!==OWNER_UID||user.email?.toLowerCase()!==OWNER_EMAIL){
    await signOut(auth);$("accessMessage").textContent="هذا القسم مخصص لصاحب الملعب فقط.";return;
  }
  ownerReady=true;$("ownerEmail").textContent=user.email;
  $("accessMessage").classList.add("hidden");$("dashboard").classList.remove("hidden");
  await loadAll();
});