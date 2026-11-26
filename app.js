import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
$("year").textContent = new Date().getFullYear();

const OWNER_EMAIL = "afterdark706@gmail.com";
const OWNER_UID = "hU0pqkyVYMYhBQ5GBAPHcHemph23";
const isOwnerAccount = (user) => !!user && user.uid === OWNER_UID && user.email?.toLowerCase() === OWNER_EMAIL;
const times = ["16:00 – 17:00","17:00 – 18:00","18:00 – 19:00","19:00 – 20:00","20:00 – 21:00","21:00 – 22:00"];
const slotsGrid = $("slotsGrid");
let selectedSlot = "";
let selectedDay = $("daySelect").value;
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
    button.className = "slot";
    button.innerHTML = `${time}<small>متاح — اضغط لطلب الحجز</small>`;
    button.addEventListener("click", () => {
      selectedSlot = time;
      $("requestTitle").textContent = "طلب حجز — " + selectedDay + " — " + time;
      $("requestMessage").textContent = currentUser ? "" : "يرجى تسجيل الدخول أولاً لإرسال طلب الحجز.";
      $("requestBackdrop").classList.add("open");
    });
    slotsGrid.appendChild(button);
  });
}
renderSlots();
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
$("publishChallenge").addEventListener("click", () => openAuth("login"));
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
      const teamProfile = await import("https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js").then(({getDoc}) => getDoc(doc(db, "users", credential.user.uid)));
      if (!teamProfile.exists() || teamProfile.data().role !== "team") {
        await signOut(auth);
        throw new Error("لم يتم العثور على ملف فريق صالح لهذا الحساب. يرجى التواصل مع إدارة الملعب.");
      }
      location.href = "team.html";
      return;
      $("modalBackdrop").classList.remove("open");
      $("loginOpen").textContent = "تسجيل الخروج";
      $("loginOpen").onclick = async () => { await signOut(auth); };
      showMessage("formMessage", "تم تسجيل الدخول بنجاح.", false);
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

$("requestForm").addEventListener("submit", e => {
  e.preventDefault();
  if (!currentUser) {
    showMessage("requestMessage", "يجب تسجيل الدخول أولاً.");
    return;
  }
  showMessage("requestMessage", "تم تجهيز النموذج. سنفعّل حفظ طلبات الحجز بعد إعداد صلاحيات قاعدة البيانات.", false);
});

onAuthStateChanged(auth, user => {
  currentUser = user;
  document.body.classList.toggle("owner-signed-in", isOwnerAccount(user));
  if (user?.email?.toLowerCase() === OWNER_EMAIL && user.uid === OWNER_UID && !location.pathname.endsWith("/admin.html")) {
    location.href = "admin.html";
    return;
  }
  if (user?.email?.toLowerCase() === OWNER_EMAIL && user.uid !== OWNER_UID) {
    showMessage("formMessage", "Owner UID mismatch. Current UID: " + user.uid + ". Send this UID so I can update the owner configuration.");
  }
  $("loginOpen").textContent = user ? "تسجيل الخروج" : "تسجيل الدخول";
  $("loginOpen").onclick = user ? async () => { await signOut(auth); } : () => openAuth("login");
  if (user) {
    $("loginOpen").title = user.email || "";
  }
});

$("menuToggle").addEventListener("click", () => $("mainNav").classList.toggle("open"));
document.querySelectorAll("#mainNav a").forEach(a => a.addEventListener("click", () => $("mainNav").classList.remove("open")));
