const $ = (id) => document.getElementById(id);
$("year").textContent = new Date().getFullYear();

const times = ["16:00 – 17:00","17:00 – 18:00","18:00 – 19:00","19:00 – 20:00","20:00 – 21:00","21:00 – 22:00"];
const slotsGrid = $("slotsGrid");
let selectedSlot = "";
let authMode = "login";

function renderSlots(){
  slotsGrid.innerHTML = "";
  times.forEach((time) => {
    const button = document.createElement("button");
    button.className = "slot";
    button.innerHTML = `${time}<small>متاح — اضغط لطلب الحجز</small>`;
    button.addEventListener("click", () => {
      selectedSlot = time;
      $("requestTitle").textContent = "طلب حجز — " + time;
      $("requestMessage").textContent = "هذه معاينة للواجهة؛ سيتم تفعيل إرسال الطلبات بعد ربط Firebase.";
      $("requestBackdrop").classList.add("open");
    });
    slotsGrid.appendChild(button);
  });
}
renderSlots();
$("daySelect").addEventListener("change", () => renderSlots());

function openAuth(mode){
  authMode = mode;
  $("modalTitle").textContent = mode === "owner" ? "دخول إدارة الملعب" : "تسجيل الدخول";
  $("modalDescription").textContent = mode === "owner" ? "الدخول مخصص لصاحب الملعب." : "أدخل بيانات حسابك للمتابعة.";
  $("authSubmit").textContent = "تسجيل الدخول";
  $("nameField").classList.add("hidden");
  $("authSwitch").classList.toggle("hidden", mode === "owner");
  $("formMessage").textContent = "سيتم تفعيل الحسابات وتسجيل الدخول بعد إعداد Firebase.";
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
  $("modalTitle").textContent = "إنشاء حساب جديد";
  $("modalDescription").textContent = "أنشئ حسابك للمشاركة في الحجوزات والتحديات.";
  $("nameField").classList.remove("hidden");
  $("authSubmit").textContent = "إنشاء الحساب";
  $("formMessage").textContent = "سيتم تفعيل التسجيل بعد ربط Firebase.";
});
$("authForm").addEventListener("submit", e => {
  e.preventDefault();
  $("formMessage").textContent = "واجهة تجريبية فقط حالياً. ربط Firebase هو الخطوة التالية لتفعيل الحسابات.";
});
$("requestForm").addEventListener("submit", e => {
  e.preventDefault();
  $("requestMessage").textContent = "لم يُرسل الطلب بعد؛ سنفعّل الحجز الحقيقي بعد ربط قاعدة البيانات.";
});
$("menuToggle").addEventListener("click", () => $("mainNav").classList.toggle("open"));
document.querySelectorAll("#mainNav a").forEach(a => a.addEventListener("click", () => $("mainNav").classList.remove("open")));