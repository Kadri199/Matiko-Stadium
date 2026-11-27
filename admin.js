import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  collection, doc, getDocs, getDoc, addDoc, setDoc, deleteDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const OWNER_UID = "hU0pqkyVYMYhBQ5GBAPHcHemph23";
const OWNER_EMAIL = "afterdark706@gmail.com";
const $ = id => document.getElementById(id);
const timesDefault = ["16:00 – 17:00","17:00 – 18:00","18:00 – 19:00","19:00 – 20:00","20:00 – 21:00","21:00 – 22:00"];
let ownerReady = false;
const normalizeBookingValue = value => String(value || "").trim().replace(/[–—−]/g,"-").replace(/\s+/g,"");

function message(id, text, error=false) {
  const el=$(id); el.textContent=text; el.style.color=error?"#a34d43":"#16704d";
}
function parseScorers(value) {
  return value.split("\n").map(line=>line.trim()).filter(Boolean).map(line=>{
    // Accept either "Player - 2" or just "Player"; never discard a name
    // merely because the goal count was omitted.
    const match=line.match(/^(.*?)\s*[-–:]\s*(\d+)\s*$/);
    if(match) return {name:match[1].trim(),goals:Number(match[2])};
    return {name:line.replace(/\s*\(\d+\)\s*$/,"").trim(),goals:0};
  }).filter(x=>x.name);
}
function openScorersEditor(team1, team2, current1, current2) {
  return new Promise(resolve => {
    const overlay=document.createElement("div");
    overlay.style.cssText="position:fixed;inset:0;z-index:9999;background:#071b13a8;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto";
    const panel=document.createElement("section");
    panel.dir="rtl";
    panel.style.cssText="width:min(560px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;padding:20px;box-shadow:0 20px 60px #0004;color:#18352b;font-family:Cairo,sans-serif";
    const heading=document.createElement("h2");
    heading.textContent="تعديل أسماء مسجلي الأهداف";
    heading.style.cssText="font-size:18px;margin:0 0 14px";
    panel.appendChild(heading);
    const fields=[];
    [[team1,current1],[team2,current2]].forEach(([team,value])=>{
      const label=document.createElement("label");
      label.textContent="مسجلو "+team+" (كل لاعب في سطر)";
      label.style.cssText="display:block;font-size:13px;font-weight:800;margin:12px 0 6px";
      const area=document.createElement("textarea");
      area.value=value;
      area.rows=5;
      area.dir="rtl";
      area.placeholder="عادل محمد سمير\nلاعب آخر";
      area.style.cssText="display:block;width:100%;min-height:112px;resize:vertical;box-sizing:border-box;border:1px solid #cbd9d0;border-radius:10px;padding:11px 12px;font:16px/1.8 Cairo,sans-serif;color:#18352b;background:#fff;white-space:pre-wrap";
      area.setAttribute("aria-label",label.textContent);
      panel.append(label,area);
      fields.push(area);
    });
    const hint=document.createElement("p");
    hint.textContent="اضغط Enter لإضافة اسم اللاعب التالي في سطر جديد. يمكنك كتابة عدد الأهداف هكذا: محمد - 2";
    hint.style.cssText="font-size:11px;color:#708078;margin:10px 0";
    const actions=document.createElement("div");
    actions.style.cssText="display:flex;gap:9px;margin-top:14px";
    const cancel=document.createElement("button");
    cancel.type="button";cancel.textContent="إلغاء";
    cancel.style.cssText="flex:1;border:1px solid #dce6df;border-radius:10px;padding:11px;background:#f5f8f5;color:#18352b;font:700 13px Cairo,sans-serif";
    const save=document.createElement("button");
    save.type="button";save.textContent="حفظ المسجلين";
    save.style.cssText="flex:1;border:0;border-radius:10px;padding:11px;background:#116149;color:#fff;font:800 13px Cairo,sans-serif";
    actions.append(cancel,save);
    panel.append(hint,actions);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    let finished=false;
    const close=value=>{
      if(finished)return;
      finished=true;
      document.removeEventListener("keydown",onKey);
      overlay.remove();
      resolve(value);
    };
    const onKey=e=>{if(e.key==="Escape")close(null);};
    document.addEventListener("keydown",onKey);
    cancel.addEventListener("click",()=>close(null));
    save.addEventListener("click",()=>close({scorers1:fields[0].value,scorers2:fields[1].value}));
    overlay.addEventListener("click",e=>{if(e.target===overlay)close(null);});
    fields[0].focus();
  });
}
const availableClubCrests = [["Real Madrid","https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg"],["Barcelona","https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg"],["Manchester United","https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg"],["Liverpool","https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg"],["Manchester City","https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg"],["Arsenal","https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg"],["Chelsea","https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg"],["Tottenham","https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg"],["Bayern Munich","https://upload.wikimedia.org/wikipedia/en/1/1f/FC_Bayern_München_logo_%282017%29.svg"],["Borussia Dortmund","https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg"],["Paris Saint-Germain","https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg"],["Juventus","https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_logo.svg"],["Inter Milan","https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg"],["AC Milan","https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg"],["Atletico Madrid","https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg"],["Ajax","https://upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg"],["CS Constantine","https://assets.football-logos.cc/logos/algeria/256x256/cs-constantine.7736f860.png"],["MC Alger","https://assets.football-logos.cc/logos/algeria/256x256/mc-alger.07948633.png"],["CR Belouizdad","https://assets.football-logos.cc/logos/algeria/256x256/cr-belouizdad.c27becc8.png"],["ES Sétif","https://assets.football-logos.cc/logos/algeria/256x256/es-setif.9dbc0932.png"]];
function setResultTimeOptions(times, selected="") {
  const select=$("resultTime");
  if(!select)return;
  const choices=(Array.isArray(times)&&times.length?times:timesDefault).map(value=>String(value).trim()).filter(Boolean);
  const previous=selected||select.value;
  select.innerHTML="";
  choices.forEach(time=>{const option=document.createElement("option");option.value=time;option.textContent=time;select.appendChild(option);});
  select.value=choices.includes(previous)?previous:(choices[0]||"");
}
function fillCrestSelect(select, selectedUrl="") {
  if(!select) return;
  select.innerHTML="";
  const automatic=document.createElement("option");
  automatic.value="";
  automatic.textContent="اختيار تلقائي حسب اسم الفريق";
  select.appendChild(automatic);
  availableClubCrests.forEach(([name,url])=>{
    const option=document.createElement("option");
    option.value=url;option.textContent=name;
    select.appendChild(option);
  });
  select.value=selectedUrl||"";
}
function openCrestsEditor(team1,team2,crest1="",crest2="") {
  return new Promise(resolve=>{
    const overlay=document.createElement("div");
    overlay.style.cssText="position:fixed;inset:0;z-index:10000;background:#071b13a8;display:flex;align-items:center;justify-content:center;padding:16px";
    const panel=document.createElement("section");
    panel.dir="rtl";
    panel.style.cssText="width:min(520px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;padding:20px;box-shadow:0 20px 60px #0004;color:#18352b;font-family:Cairo,sans-serif";
    const title=document.createElement("h2");title.textContent="اختيار شعاري الفريقين";title.style.cssText="font-size:18px;margin:0 0 14px";
    panel.appendChild(title);
    const selects=[];
    [[team1,crest1],[team2,crest2]].forEach(([team,url])=>{
      const label=document.createElement("label");
      label.textContent="شعار "+(team||"الفريق");
      label.style.cssText="display:block;font-size:13px;font-weight:800;margin:12px 0 6px";
      const select=document.createElement("select");
      select.style.cssText="width:100%;box-sizing:border-box;border:1px solid #cbd9d0;border-radius:10px;padding:12px;background:#fff;color:#18352b;font:15px Cairo,sans-serif";
      fillCrestSelect(select,url);
      const preview=document.createElement("img");
      preview.alt="معاينة الشعار";
      preview.style.cssText="display:block;width:64px;height:64px;object-fit:contain;margin:10px auto 14px";
      const updatePreview=()=>{preview.src=select.value||"";preview.style.display=select.value?"block":"none";};
      select.addEventListener("change",updatePreview);updatePreview();
      panel.append(label,select,preview);selects.push(select);
    });
    const actions=document.createElement("div");actions.style.cssText="display:flex;gap:9px;margin-top:14px";
    const cancel=document.createElement("button");cancel.type="button";cancel.textContent="إلغاء";cancel.style.cssText="flex:1;border:1px solid #dce6df;border-radius:10px;padding:11px;background:#f5f8f5;color:#18352b;font:700 13px Cairo,sans-serif";
    const save=document.createElement("button");save.type="button";save.textContent="حفظ الشعارين";save.style.cssText="flex:1;border:0;border-radius:10px;padding:11px;background:#116149;color:#fff;font:800 13px Cairo,sans-serif";
    actions.append(cancel,save);panel.appendChild(actions);overlay.appendChild(panel);document.body.appendChild(overlay);
    let done=false;
    const close=value=>{if(done)return;done=true;overlay.remove();resolve(value);};
    cancel.addEventListener("click",()=>close(null));
    save.addEventListener("click",()=>close({crest1:selects[0].value,crest2:selects[1].value}));
    overlay.addEventListener("click",e=>{if(e.target===overlay)close(null);});
  });
}
async function openResultTimeEditor(currentTime="") {
  const scheduleSnap=await getDoc(doc(db,"settings","schedule"));
  const configured=scheduleSnap.exists()&&Array.isArray(scheduleSnap.data().times)&&scheduleSnap.data().times.length
    ? scheduleSnap.data().times : timesDefault;
  const choices=[...configured.map(value=>String(value).trim()).filter(Boolean)];
  if(currentTime&&!choices.includes(currentTime)) choices.unshift(currentTime);
  return new Promise(resolve=>{
    const overlay=document.createElement("div");
    overlay.style.cssText="position:fixed;inset:0;z-index:10001;background:#071b13a8;display:flex;align-items:center;justify-content:center;padding:16px";
    const panel=document.createElement("section");
    panel.dir="rtl";
    panel.style.cssText="width:min(420px,100%);background:#fff;border-radius:18px;padding:20px;box-shadow:0 20px 60px #0004;color:#18352b;font-family:Cairo,sans-serif";
    const title=document.createElement("h2");
    title.textContent="تعديل وقت المباراة";
    title.style.cssText="font-size:18px;margin:0 0 14px";
    const label=document.createElement("label");
    label.textContent="اختر الوقت من جدول المواعيد";
    label.style.cssText="display:block;font-size:13px;font-weight:800;margin:10px 0 7px";
    const select=document.createElement("select");
    select.style.cssText="width:100%;box-sizing:border-box;border:1px solid #cbd9d0;border-radius:10px;padding:12px;background:#fff;color:#18352b;font:15px Cairo,sans-serif";
    choices.forEach(time=>{
      const option=document.createElement("option");
      option.value=time;option.textContent=time;select.appendChild(option);
    });
    select.value=currentTime&&choices.includes(currentTime)?currentTime:(choices[0]||"");
    label.appendChild(select);
    const actions=document.createElement("div");
    actions.style.cssText="display:flex;gap:9px;margin-top:16px";
    const cancel=document.createElement("button");
    cancel.type="button";cancel.textContent="إلغاء";
    cancel.style.cssText="flex:1;border:1px solid #dce6df;border-radius:10px;padding:11px;background:#f5f8f5;color:#18352b;font:700 13px Cairo,sans-serif";
    const save=document.createElement("button");
    save.type="button";save.textContent="حفظ الوقت";
    save.style.cssText="flex:1;border:0;border-radius:10px;padding:11px;background:#116149;color:#fff;font:800 13px Cairo,sans-serif";
    actions.append(cancel,save);
    panel.append(title,label,actions);overlay.appendChild(panel);document.body.appendChild(overlay);
    let done=false;
    const close=value=>{if(done)return;done=true;overlay.remove();resolve(value);};
    cancel.addEventListener("click",()=>close(null));
    save.addEventListener("click",()=>close(select.value));
    overlay.addEventListener("click",e=>{if(e.target===overlay)close(null);});
  });
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
      detail.textContent=`الوقت: ${d.time||"—"}\nمسجلو ${d.team1}: ${(d.scorers1||[]).map(x=>x.name+" ("+x.goals+")").join("، ")||"—"}\nمسجلو ${d.team2}: ${(d.scorers2||[]).map(x=>x.name+" ("+x.goals+")").join("، ")||"—"}`;
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
    if(type==="results"){
      const edit=document.createElement("button");
      edit.className="edit-btn";
      edit.textContent="تعديل المسجلين";
      edit.addEventListener("click",async()=>{
        const current1=(d.scorers1||[]).map(x=>x.name+(Number(x.goals)>0?" - "+x.goals:"")).join("\n");
        const current2=(d.scorers2||[]).map(x=>x.name+(Number(x.goals)>0?" - "+x.goals:"")).join("\n");
        const entered=await openScorersEditor(d.team1||"الفريق الأول",d.team2||"الفريق الثاني",current1,current2);
        if(!entered)return;
        edit.disabled=true;
        try{
          await updateDoc(doc(db,"results",item.id),{
            scorers1:parseScorers(entered.scorers1),
            scorers2:parseScorers(entered.scorers2)
          });
          await loadAll();
          message("resultMessage","تم تحديث أسماء المسجلين فقط دون تغيير النتيجة.");
        }catch(error){
          alert("تعذر تحديث أسماء المسجلين: "+error.message);
          edit.disabled=false;
        }
      });
      const crestEdit=document.createElement("button");
      crestEdit.className="edit-btn";
      crestEdit.textContent="تعديل الشعارين";
      crestEdit.addEventListener("click",async()=>{
        const chosen=await openCrestsEditor(d.team1||"الفريق الأول",d.team2||"الفريق الثاني",d.crest1||"",d.crest2||"");
        if(!chosen)return;
        crestEdit.disabled=true;
        try{
          await updateDoc(doc(db,"results",item.id),{crest1:chosen.crest1,crest2:chosen.crest2});
          await loadAll();
          message("resultMessage","تم تحديث شعاري الفريقين.");
        }catch(error){alert("تعذر تحديث الشعارين: "+error.message);crestEdit.disabled=false;}
      });
      const timeEdit=document.createElement("button");
      timeEdit.className="edit-btn";
      timeEdit.textContent="تعديل الوقت";
      timeEdit.addEventListener("click",async()=>{
        timeEdit.disabled=true;
        try{
          const chosenTime=await openResultTimeEditor(d.time||"");
          if(!chosenTime)return;
          await updateDoc(doc(db,"results",item.id),{time:chosenTime});
          await loadAll();
          message("resultMessage","تم تحديث وقت المباراة.");
        }catch(error){
          alert("تعذر تحديث وقت المباراة: "+error.message);
          timeEdit.disabled=false;
        }
      });
      actions.append(timeEdit);
      actions.append(crestEdit);
      actions.append(edit);
    }
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
  host.innerHTML="";
  if(!docs.length){host.innerHTML='<div class="empty-state">لا توجد طلبات حجز حتى الآن.</div>';return;}
  docs.forEach(item=>{
    const d=item.data(),card=document.createElement("article");card.className="record booking-record";
    const bin=document.createElement("button");bin.type="button";bin.className="booking-delete-btn";bin.textContent="حذف";bin.title="حذف طلب الحجز";Object.assign(bin.style,{minWidth:"58px",padding:"6px 14px",display:"inline-grid",placeItems:"center",alignSelf:"center",border:"1px solid #b91c1c",borderRadius:"14px",backgroundColor:"#dc2626",color:"#ffeb3b",fontSize:"13px",fontWeight:"900",lineHeight:"1.5",cursor:"pointer",flex:"0 0 auto",boxShadow:"0 2px 5px #991b1b55"});bin.setAttribute("aria-label","حذف طلب الحجز");
    bin.addEventListener("click",async()=>{if(!confirm("هل تريد حذف طلب الحجز نهائياً؟ لا يمكن التراجع عن هذا الإجراء."))return;bin.disabled=true;try{await deleteDoc(doc(db,"bookings",item.id));await loadBookings();}catch(error){alert("تعذر حذف طلب الحجز: "+error.message);bin.disabled=false;}});
    const content=document.createElement("div"),title=document.createElement("h3"),detail=document.createElement("p");
    title.textContent=(d.teamName||"فريق")+" × "+(d.opponentName||"فريق منافس");
    const statusText=d.status==="approved"?"تمت الموافقة":d.status==="rejected"?"مرفوض":"قيد الانتظار";
    detail.textContent="اليوم: "+d.day+" | الساعة: "+d.time+" | الحالة: "+statusText+(d.note?" | ملاحظة: "+d.note:"")+" | البريد: "+(d.teamEmail||"");
    content.append(title,detail);card.append(content);
    const actions=document.createElement("div");actions.className="record-actions";
    actions.appendChild(bin);
    // Owner can approve any request, or disapprove it to release the slot back to green.
    const actionOptions = d.status === "approved"
      ? [["rejected","إلغاء الموافقة (إعادة إلى الأخضر)"]]
      : d.status === "rejected"
        ? [["approved","موافقة (تحويل إلى الأحمر)"]]
        : [["approved","موافقة (تحويل إلى الأحمر)"],["rejected","عدم الموافقة (إبقاء الموعد أخضر)"]];
    for(const [status,label] of actionOptions){
      const btn=document.createElement("button");
      btn.className=status==="approved"?"btn btn-primary":"danger-btn";
      btn.textContent=label;
      btn.addEventListener("click",async()=>{
        btn.disabled=true;
        try{
          if(status==="approved"){
            const allBookings=await getDocs(collection(db,"bookings"));
            const conflict=allBookings.docs.some(x=>x.id!==item.id&&normalizeBookingValue(x.data().day)===normalizeBookingValue(d.day)&&normalizeBookingValue(x.data().time)===normalizeBookingValue(d.time)&&x.data().status==="approved");
            if(conflict) throw new Error("هذا الموعد محجوز بالفعل. اختر طلباً آخر.");
          }
          await updateDoc(doc(db,"bookings",item.id),{status,reviewedAt:serverTimestamp()});
          await loadBookings();
        }catch(e){alert("تعذر تحديث الطلب: "+e.message);btn.disabled=false;}
      });
      actions.append(btn);
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
      const configuredTimes=sched.data().times||timesDefault;
      $("scheduleTimes").value=configuredTimes.join("\n");
      $("scheduleEnabled").checked=sched.data().enabled!==false;
      setResultTimeOptions(configuredTimes);
    }else {
      $("scheduleTimes").value=timesDefault.join("\n");
      setResultTimeOptions(timesDefault);
    }
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
    setResultTimeOptions(times);
    message("scheduleMessage","تم حفظ جدول المواعيد.");
  }catch(err){message("scheduleMessage",err.message,true);}
});
fillCrestSelect($("resultCrest1"));
fillCrestSelect($("resultCrest2"));
$("resultForm").addEventListener("submit",async e=>{
  e.preventDefault();if(!ownerReady)return;
  try{
    await addDoc(collection(db,"results"),{
      date:$("matchDate").value,time:$("resultTime").value,team1:$("resultTeam1").value.trim(),score1:Number($("score1").value),
      team2:$("resultTeam2").value.trim(),score2:Number($("score2").value),
      crest1:$("resultCrest1").value,crest2:$("resultCrest2").value,
      scorers1:parseScorers($("scorers1").value),scorers2:parseScorers($("scorers2").value),
      createdAt:serverTimestamp()
    });
    e.target.reset();message("resultMessage","تم نشر النتيجة بنجاح.");await loadAll();
  }catch(err){message("resultMessage",err.message,true);}
});
const CLOUDINARY_CLOUD_NAME = "vigpliv3";
const CLOUDINARY_UPLOAD_PRESET = "Kadri1992";
let selectedNewsImage = null;
let newsPreviewUrl = "";
const newsVideoInput = $("newsVideoUrl");
function parseNewsVideoUrl(value){
  const raw=String(value||"").trim();if(!raw)return null;
  try{
    const url=new URL(raw);const host=url.hostname.toLowerCase().replace(/^www\./,"").replace(/^m\./,"");
    if(host==="youtu.be"||host==="youtube.com"||host==="youtube-nocookie.com"){
      let id="";
      if(host==="youtu.be")id=url.pathname.split("/").filter(Boolean)[0]||"";
      else if(url.pathname==="/watch")id=url.searchParams.get("v")||"";
      else {const parts=url.pathname.split("/").filter(Boolean);if(["embed","shorts","live"].includes(parts[0]))id=parts[1]||"";}
      if(!/^[A-Za-z0-9_-]{11}$/.test(id))throw new Error("رابط YouTube غير صالح.");
      return {type:"youtube",url:"https://www.youtube.com/watch?v="+id,id};
    }
    if(host==="facebook.com"||host==="fb.watch"){
      if(!/(^|\.)facebook\.com$/.test(url.hostname.toLowerCase())&&host!=="fb.watch")throw new Error("رابط Facebook غير صالح.");
      if(!/(\/videos\/|\/watch\/|video\.php|\/reel\/|fb\.watch)/i.test(url.href))throw new Error("يرجى لصق رابط فيديو أو Reel من Facebook.");
      return {type:"facebook",url:raw};
    }
    if(host==="tiktok.com"){
      const match=url.pathname.match(/\/video\/(\d+)/)||url.pathname.match(/\/player\/v1\/(\d+)/);
      if(!match)throw new Error("رابط TikTok غير صالح.");
      return {type:"tiktok",url:"https://www.tiktok.com/@video/video/"+match[1],id:match[1]};
    }
    if(host==="instagram.com"){
      const parts=url.pathname.split("/").filter(Boolean);
      if(!["reel","reels","p","tv"].includes(parts[0])||!parts[1])throw new Error("يرجى لصق رابط Instagram Reel أو فيديو أو منشور صحيح.");
      return {type:"instagram",url:"https://www.instagram.com/"+parts[0]+"/"+parts[1]+"/"};
    }
  }catch(err){if(err instanceof TypeError)throw new Error("رابط الفيديو غير صالح.");throw err;}
  throw new Error("يدعم الموقع روابط YouTube وFacebook وTikTok فقط.");
}

$("newsImageFile").addEventListener("change",()=>{
  const file=$("newsImageFile").files?.[0]||null;
  selectedNewsImage=file;
  if(file&&newsVideoInput.value.trim()){selectedNewsImage=null;$("newsImageFile").value="";message("newsMessage","اختر صورة أو فيديو فقط، وليس الاثنين معاً.",true);return;}
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
newsVideoInput.addEventListener("input",()=>{if(newsVideoInput.value.trim()&&selectedNewsImage){selectedNewsImage=null;$("newsImageFile").value="";$("newsImagePreview").removeAttribute("src");$("newsImagePreviewWrap").classList.add("hidden");if(newsPreviewUrl)URL.revokeObjectURL(newsPreviewUrl);newsPreviewUrl="";}});
$("clearNewsImage").addEventListener("click",()=>{
  selectedNewsImage=null;$("newsImageFile").value="";
  $("newsImagePreview").removeAttribute("src");
  $("newsImagePreviewWrap").classList.add("hidden");
  if(newsPreviewUrl)URL.revokeObjectURL(newsPreviewUrl);
  newsPreviewUrl="";
});
async function prepareNewsImage(file){
  let source,sourceWidth,sourceHeight,releaseSource=()=>{};
  try{
    if(typeof createImageBitmap==="function"){
      try{
        source=await createImageBitmap(file);
        sourceWidth=source.width;sourceHeight=source.height;
        releaseSource=()=>source.close?.();
      }catch(_){}
    }
    if(!source){
      const objectUrl=URL.createObjectURL(file);
      const img=new Image();
      try{
        await new Promise((resolve,reject)=>{
          img.onload=resolve;
          img.onerror=()=>reject(new Error("تعذر قراءة الصورة. اختر صورة بصيغة JPG أو PNG أو WebP."));
          img.src=objectUrl;
        });
        source=img;sourceWidth=img.naturalWidth;sourceHeight=img.naturalHeight;
        releaseSource=()=>URL.revokeObjectURL(objectUrl);
      }catch(err){
        URL.revokeObjectURL(objectUrl);
        throw err;
      }
    }
    if(!sourceWidth||!sourceHeight)throw new Error("ملف الصورة غير صالح أو أن صيغة الصورة غير مدعومة. اختر JPG أو PNG أو WebP.");
    const maxSide=1600,scale=Math.min(1,maxSide/Math.max(sourceWidth,sourceHeight));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(sourceWidth*scale));canvas.height=Math.max(1,Math.round(sourceHeight*scale));
    const ctx=canvas.getContext("2d");
    if(!ctx)throw new Error("تعذر تجهيز الصورة على هذا الجهاز.");
    ctx.drawImage(source,0,0,canvas.width,canvas.height);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(new Error("تعذر تحويل الصورة. جرّب صورة أخرى بصيغة JPG أو PNG.")),"image/jpeg",0.82));
    return new File([blob],(file.name.replace(/\.[^.]+$/,"")||"news-photo")+".jpg",{type:"image/jpeg"});
  }finally{releaseSource();}
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
    let imageUrl="",videoUrl="",videoType="";
    const enteredVideoUrl=newsVideoInput.value.trim();
    let videoOrientation="auto";
    if(selectedNewsImage&&enteredVideoUrl)throw new Error("اختر صورة أو فيديو فقط، وليس الاثنين معاً.");
    if(enteredVideoUrl){const parsed=parseNewsVideoUrl(enteredVideoUrl);videoUrl=parsed.url;videoType=parsed.type;videoOrientation=document.querySelector("input[name=\"newsVideoOrientation\"]:checked")?.value||"portrait";}
    if(selectedNewsImage){
      message("newsMessage","جارٍ رفع الصورة...");
      imageUrl=await uploadNewsImage(selectedNewsImage);
    }
    await addDoc(collection(db,"news"),{
      title:$("newsTitle").value.trim(),body:$("newsBody").value.trim(),
      imageUrl,videoUrl,videoType,videoOrientation,createdAt:serverTimestamp()
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