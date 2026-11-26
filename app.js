import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, collection, addDoc, serverTimestamp, onSnapshot, query, where
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
$("year").textContent = new Date().getFullYear();

const OWNER_EMAIL = "afterdark706@gmail.com";
const OWNER_UID = "hU0pqkyVYMYhBQ5GBAPHcHemph23";
const isOwnerAccount = (user) => !!user && user.uid === OWNER_UID && user.email?.toLowerCase() === OWNER_EMAIL;
const defaultTimes = ["16:00 – 17:00","17:00 – 18:00","18:00 – 19:00","19:00 – 20:00","20:00 – 21:00","21:00 – 22:00"];
let times = [...defaultTimes];
const slotsGrid = $("slotsGrid");
let selectedSlot = "";
const arabicWeekdays = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
const daySelect = $("daySelect");
daySelect.value = arabicWeekdays[new Date().getDay()];
let selectedDay = daySelect.value;
daySelect.addEventListener("change", () => {
  selectedDay = daySelect.value;
  renderSlots();
});
let approvedMatches = new Map();
function normalizeMatchKey(day, time){
  const cleanDay=String(day||"").trim().replace(/\s+/g,"");
  const cleanTime=String(time||"").trim().replace(/[–—−]/g,"-").replace(/\s+/g,"");
  return cleanDay+"|"+cleanTime;
}
let matchInfoBackdrop = null;
function showApprovedMatch(match){
  if(!matchInfoBackdrop){
    matchInfoBackdrop=document.createElement("div");
    matchInfoBackdrop.className="modal-backdrop";
    matchInfoBackdrop.id="approvedMatchBackdrop";
    matchInfoBackdrop.innerHTML='<section class="modal match-info-modal" role="dialog" aria-modal="true" aria-label="تفاصيل المباراة"><button type="button" class="modal-close" aria-label="إغلاق">×</button><div class="match-team match-team-home"></div><div class="match-vs">VS</div><div class="match-team match-team-away"></div><p class="match-info-time"></p></section>';
    document.body.appendChild(matchInfoBackdrop);
    matchInfoBackdrop.querySelector(".modal-close").addEventListener("click",()=>matchInfoBackdrop.classList.remove("open"));
    matchInfoBackdrop.addEventListener("click",e=>{if(e.target===matchInfoBackdrop)matchInfoBackdrop.classList.remove("open");});
  }
  matchInfoBackdrop.querySelector(".match-team-home").textContent=match.teamName||"الفريق الأول";
  matchInfoBackdrop.querySelector(".match-team-away").textContent=match.opponentName||"الفريق الثاني";
  matchInfoBackdrop.querySelector(".match-info-time").textContent=(match.day||"")+" — "+(match.time||"");
  matchInfoBackdrop.classList.add("open");
}
let authMode = "login";
let currentUser = null;

function showMessage(id, message, isError = true) {
  const el = $(id);
  el.textContent = message;
  el.style.color = isError ? "#a34d43" : "#16704d";
}

function renderSlots(){
  slotsGrid.innerHTML = "";
  times.forEach((time) => {
    const button = document.createElement("button");
    const key = normalizeMatchKey(selectedDay,time);
    const match = approvedMatches.get(key);
    const isBooked = !!match;
    button.className = isBooked ? "slot booked-slot" : "slot";
    button.innerHTML = `${time}<small>${isBooked ? (match ? "اضغط لعرض المباراة" : "محجوز — تمت الموافقة") : "متاح — اضغط لطلب الحجز"}</small>`;
    if (isBooked) {
      button.addEventListener("click", () => { if(match) showApprovedMatch(match); });
      button.setAttribute("aria-label",match ? `مباراة ${match.teamName} ضد ${match.opponentName}` : "موعد محجوز");
    } else button.addEventListener("click", () => {
      selectedSlot = time;
      $("requestTitle").textContent = "طلب حجز — " + selectedDay + " — " + time;
      $("requestMessage").textContent = currentUser ? "" : "يرجى تسجيل الدخول أولاً لإرسال طلب الحجز.";
      $("requestBackdrop").classList.add("open");
    });
    slotsGrid.appendChild(button);
  });
}
renderSlots();

onSnapshot(doc(db, "settings", "schedule"), snapshot => {
  const data = snapshot.exists() ? snapshot.data() : {};
  const configuredTimes = Array.isArray(data.times)
    ? data.times.map(value => String(value).trim()).filter(Boolean)
    : [];
  times = configuredTimes.length ? configuredTimes : [...defaultTimes];
  if (!times.includes(selectedSlot)) selectedSlot = "";
  renderSlots();
}, error => console.error("Could not load schedule settings:", error));

onSnapshot(query(collection(db, "bookings"), where("status", "==", "approved")), snapshot => {
  approvedMatches = new Map();
  snapshot.docs.forEach(item => {
    const match = item.data();
    if (match.day && match.time) approvedMatches.set(normalizeMatchKey(match.day,match.time), match);
  });
  renderSlots();
}, error => console.error("Could not load approved match details:", error));

function renderHomepageChallenges(snapshot) {
  const host = $("challengeList");
  host.innerHTML = "";
  const items = snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  if (!items.length) {
    host.innerHTML = '<article class="empty-card"><span>🏆</span><h3>لا توجد تحديات مفتوحة حالياً</h3><p>سجّل الدخول وانشر تحدياً لفريقك.</p></article>';
    return;
  }
  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "challenge-card";
    const top = document.createElement("div");
    top.className = "card-top";
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = "تحدٍ مفتوح";
    top.append(tag);
    const title = document.createElement("h3");
    title.textContent = item.teamName || "فريق";
    const meta = document.createElement("div");
    meta.className = "match-meta";
    const day = document.createElement("span");
    day.textContent = "📅 " + (item.day || "");
    const time = document.createElement("span");
    time.textContent = "🕕 " + (item.time || "");
    meta.append(day,time);
    const note = document.createElement("p");
    note.textContent = item.note || "لا توجد ملاحظة.";
    const action = document.createElement("button");
    action.className = "btn btn-outline-dark";
    action.textContent = "قبول التحدي";
    action.addEventListener("click", () => {
      if (currentUser && !isOwnerAccount(currentUser)) location.href = "team.html";
      else openAuth("login");
    });
    card.append(top,title,meta,note,action);
    host.append(card);
  });
}


function renderHomepageNews(snapshot) {
  const host = $("newsList");
  host.innerHTML = "";
  const items = snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => {
      const ta = a.createdAt?.seconds || 0;
      const tb = b.createdAt?.seconds || 0;
      return tb - ta;
    });

  if (!items.length) {
    host.innerHTML = '<article class="news-placeholder"><span>📰</span><h3>لا توجد أخبار حالياً</h3><p>ستظهر هنا أخبار وإعلانات إدارة الملعب عند نشرها.</p></article>';
    return;
  }

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "news-card";
    if (item.imageUrl) {
      const img = document.createElement("img");
      img.className = "news-image";
      img.src = item.imageUrl;
      img.alt = item.title || "صورة الخبر";
      img.loading = "lazy";
      card.appendChild(img);
    }
    const content = document.createElement("div");
    content.className = "news-content";
    const title = document.createElement("h3");
    title.textContent = item.title || "خبر من إدارة الملعب";
    const body = document.createElement("p");
    body.textContent = item.body || "";
    content.append(title, body);
    if (item.createdAt?.toDate) {
      const date = document.createElement("time");
      date.className = "news-date";
      date.dateTime = item.createdAt.toDate().toISOString();
      date.textContent = item.createdAt.toDate().toLocaleDateString("ar-DZ");
      content.appendChild(date);
    }
    card.appendChild(content);
    host.appendChild(card);
  });
}

onSnapshot(collection(db, "news"), renderHomepageNews, error => {
  console.error("Could not load homepage news:", error);
  $("newsList").innerHTML = '<article class="news-placeholder"><span>📰</span><h3>تعذر تحميل الأخبار</h3><p>يرجى تحديث الصفحة لاحقاً.</p></article>';
});

onSnapshot(query(collection(db, "challenges"), where("status", "==", "open")), renderHomepageChallenges, error => {
  console.error("Could not load homepage challenges:", error);
  $("challengeList").innerHTML = '<article class="empty-card"><h3>تعذر تحميل التحديات</h3><p>يرجى تحديث الصفحة لاحقاً.</p></article>';
});

$("daySelect").addEventListener("change", () => {
  selectedDay = $("daySelect").value;
  renderSlots();
});

function openAuth(mode){
  authMode = mode;
  $("modalTitle").textContent = mode === "owner" ? "دخول إدارة الملعب" : "تسجيل الدخول";
  $("modalDescription").textContent = mode === "owner" ? "الدخول مخصص لصاحب الملعب فقط." : "أدخل بيانات حسابك للمتابعة.";
  $("authSubmit").textContent = "تسجيل الدخول";
  $("nameField").classList.add("hidden");
  $("authSwitch").classList.toggle("hidden", mode === "owner");
  $("formMessage").textContent = "";
  $("modalBackdrop").classList.add("open");
}
$("loginOpen").addEventListener("click", () => openAuth("login"));
$("ownerLogin").addEventListener("click", () => openAuth("owner"));
$("publishChallenge").addEventListener("click", () => {
  if (currentUser && !isOwnerAccount(currentUser)) {
    location.href = "team.html";
  } else {
    openAuth("login");
  }
});
$("modalClose").addEventListener("click", () => $("modalBackdrop").classList.remove("open"));
$("requestClose").addEventListener("click", () => $("requestBackdrop").classList.remove("open"));
$("modalBackdrop").addEventListener("click", e => { if(e.target === $("modalBackdrop")) $("modalBackdrop").classList.remove("open"); });
$("requestBackdrop").addEventListener("click", e => { if(e.target === $("requestBackdrop")) $("requestBackdrop").classList.remove("open"); });

$("registerSwitch").addEventListener("click", () => {
  authMode = "register";
  $("modalTitle").textContent = "إنشاء حساب فريق";
  $("modalDescription").textContent = "أدخل اسمك الكامل وبريدك الإلكتروني لإنشاء حساب.";
  $("nameField").classList.remove("hidden");
  $("authSubmit").textContent = "إنشاء الحساب";
  $("formMessage").textContent = "";
});

$("authForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("email").value.trim().toLowerCase();
  const password = $("password").value;
  const fullName = $("fullName").value.trim();
  const submit = $("authSubmit");
  submit.disabled = true;
  submit.textContent = "يرجى الانتظار...";
  try {
    if (authMode === "register") {
      if (!fullName) throw new Error("يرجى إدخال الاسم الكامل.");
      if (email === OWNER_EMAIL) throw new Error("هذا البريد مخصص لإدارة الملعب. استخدم دخول الإدارة.");
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      try {
        await setDoc(doc(db, "users", credential.user.uid), {
          fullName,
          email,
          role: "team",
          createdAt: serverTimestamp()
        });
      } catch (profileError) {
        await signOut(auth);
        throw new Error("تم إنشاء حساب الدخول، لكن تعذر إنشاء ملف الفريق في قاعدة البيانات: " + profileError.message);
      }
      showMessage("formMessage", "تم إنشاء الحساب بنجاح. يمكنك الآن تسجيل الدخول.", false);
      authMode = "login";
      $("authSubmit").textContent = "تسجيل الدخول";
      $("nameField").classList.add("hidden");
      $("authSwitch").classList.remove("hidden");
      await signOut(auth);
    } else {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      if (authMode === "owner") {
        if (credential.user.email?.toLowerCase() !== OWNER_EMAIL) {
          await signOut(auth);
          throw new Error("This is not the stadium owner's email account.");
        }
        if (credential.user.uid !== OWNER_UID) {
          const actualUid = credential.user.uid;
          await signOut(auth);
          throw new Error("Owner account UID does not match the configured owner UID. Actual UID: " + actualUid + ". Please send me this UID.");
        }
        location.href = "admin.html";
        return;
      }
      if (authMode !== "owner" && isOwnerAccount(credential.user)) {
        await signOut(auth);
        throw new Error("يرجى استخدام زر دخول الإدارة لهذا الحساب.");
      }
      const teamProfile = await getDoc(doc(db, "users", credential.user.uid));
      if (!teamProfile.exists() || teamProfile.data().role !== "team") {
        await signOut(auth);
        throw new Error("لم يتم العثور على ملف فريق صالح لهذا الحساب. يرجى التواصل مع إدارة الملعب.");
      }
      location.href = "team.html";
      return;
    }
  } catch (error) {
    const messages = {
      "auth/email-already-in-use": "هذا البريد مسجل من قبل. جرّب تسجيل الدخول.",
      "auth/invalid-email": "البريد الإلكتروني غير صحيح.",
      "auth/weak-password": "كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.",
      "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      "auth/network-request-failed": "تعذر الاتصال. تحقق من الإنترنت وحاول مجدداً."
    };
    showMessage("formMessage", messages[error.code] || error.message || "حدث خطأ. حاول مرة أخرى.");
  } finally {
    submit.disabled = false;
    submit.textContent = authMode === "register" ? "إنشاء الحساب" : "تسجيل الدخول";
  }
});

$("requestForm").addEventListener("submit", async e => {
  e.preventDefault();
  const submit=e.submitter || e.target.querySelector('button[type="submit"],button:not([type])');
  if (!currentUser) { showMessage("requestMessage", "يرجى تسجيل الدخول بحساب فريق أولاً."); return; }
  if (isOwnerAccount(currentUser)) { showMessage("requestMessage", "طلبات الحجز متاحة لحسابات الفرق فقط."); return; }
  if (!selectedSlot) { showMessage("requestMessage", "يرجى اختيار الفترة الزمنية أولاً."); return; }
  if (submit) { submit.disabled=true; submit.textContent="جارٍ إرسال الطلب..."; }
  try {
    const profileSnap=await getDoc(doc(db,"users",currentUser.uid));
    if(!profileSnap.exists() || profileSnap.data().role!=="team") throw new Error("يجب تسجيل الدخول بحساب فريق صالح.");
    const teamName=profileSnap.data().fullName || $("teamOne").value.trim();
    $("teamOne").value=teamName;
    const opponent=$("teamTwo").value.trim();
    if(!opponent) throw new Error("يرجى إدخال اسم الفريق المنافس.");
    await addDoc(collection(db,"bookings"),{
      teamUid:currentUser.uid,teamEmail:currentUser.email||"",teamName,
      opponentName:opponent,day:selectedDay,time:selectedSlot,
      note:$("requestNote").value.trim(),status:"pending",createdAt:serverTimestamp()
    });
    e.target.reset();
    showMessage("requestMessage","تم إرسال طلب الحجز بنجاح. يبقى الطلب قيد الانتظار حتى موافقة إدارة الملعب.",false);
  } catch(err) { showMessage("requestMessage","تعذر إرسال الطلب: "+err.message); }
  finally { if(submit){submit.disabled=false;submit.textContent="إرسال الطلب";} }
});

$("teamLogout").addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert("تعذر تسجيل الخروج: " + error.message);
  }
});

onAuthStateChanged(auth, async user => {
  currentUser = user;
  document.body.classList.toggle("owner-signed-in", isOwnerAccount(user));
  const teamHeader = $("teamHeaderAccount");
  teamHeader.classList.add("hidden");
  $("loginOpen").classList.remove("hidden");
  $("loginOpen").textContent = user ? "تسجيل الخروج" : "تسجيل الدخول";
  $("loginOpen").title = user?.email || "";
  $("loginOpen").onclick = user ? async () => { await signOut(auth); } : () => openAuth("login");

  if (user?.email?.toLowerCase() === OWNER_EMAIL && user.uid !== OWNER_UID) {
    showMessage("formMessage", "Owner UID mismatch. Current UID: " + user.uid + ". Send this UID so I can update the owner configuration.");
  }

  if (user && !isOwnerAccount(user)) {
    try {
      const profile = await getDoc(doc(db, "users", user.uid));
      if (auth.currentUser?.uid === user.uid && profile.exists() && profile.data().role === "team") {
        $("headerTeamName").textContent = profile.data().fullName || "فريقي";
        teamHeader.classList.remove("hidden");
        $("loginOpen").classList.add("hidden");
      }
    } catch (error) {
      console.error("Could not load team name for header:", error);
    }
  }
});

$("menuToggle").addEventListener("click", () => $("mainNav").classList.toggle("open"));
document.querySelectorAll("#mainNav a").forEach(a => a.addEventListener("click", () => $("mainNav").classList.remove("open")));
