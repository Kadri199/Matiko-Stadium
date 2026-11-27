import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, collection, addDoc, deleteDoc, serverTimestamp, onSnapshot, query, where
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
const bookingSyncStatus = $("bookingSyncStatus");
function setBookingSyncStatus(message, isError=false){ if(bookingSyncStatus){ bookingSyncStatus.textContent=message; bookingSyncStatus.classList.toggle("sync-error",isError); } }
function normalizeMatchKey(day, time){
  const normalizeArabic = value => String(value||"")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670ـ]/g,"")
    .replace(/[أإآٱ]/g,"ا")
    .replace(/ى/g,"ي")
    .replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/\s+/g,"")
    .trim();
  const cleanDay=normalizeArabic(day);
  const cleanTime=normalizeArabic(time).replace(/[–—−]/g,"-");
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
    const isBooked = Boolean(match && match.status === "approved");
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
  setBookingSyncStatus(approvedMatches.size ? `المواعيد المؤكدة: ${approvedMatches.size}` : "لا توجد مواعيد مؤكدة حالياً.");
}, error => {
  console.error("Could not load approved match details:", error);
  setBookingSyncStatus("تعذر تحميل الحجوزات المؤكدة. تحقق من صلاحيات قراءة الحجوزات في Firestore.", true);
});

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
    if (item.videoUrl) {
      let videoType=item.videoType||"";
      if(!videoType){try{const u=new URL(item.videoUrl);videoType=u.hostname.includes("youtu")||u.hostname==="youtu.be"?"youtube":u.hostname.includes("facebook")||u.hostname==="fb.watch"?"facebook":u.hostname.includes("tiktok")?"tiktok":"";}catch(_){}}
      const orientation=item.videoOrientation||"auto";
      let facebookPortrait=false;
      if(videoType==="facebook"&&orientation==="auto"){try{facebookPortrait=/\/reel\//i.test(new URL(item.videoUrl).pathname);}catch(_){}}
      const portrait=videoType==="facebook"||orientation==="portrait"||(orientation==="auto"&&(videoType==="tiktok"||videoType==="instagram"||facebookPortrait));
      let embedUrl="";
      if(videoType==="youtube"){try{const u=new URL(item.videoUrl);const id=u.hostname==="youtu.be"?u.pathname.split("/").filter(Boolean)[0]:u.searchParams.get("v");if(id)embedUrl="https://www.youtube-nocookie.com/embed/"+encodeURIComponent(id);}catch(_){}}
      else if(videoType==="facebook"){const fbWidth=portrait?390:560;const fbHeight=portrait?693:315;embedUrl="https://www.facebook.com/plugins/video.php?href="+encodeURIComponent(item.videoUrl)+"&show_text=false&width="+fbWidth+"&height="+fbHeight;}
      else if(videoType==="tiktok"){const match=item.videoUrl.match(/\/video\/(\d+)/);if(match)embedUrl="https://www.tiktok.com/player/v1/"+match[1];}
      else if(videoType==="instagram"){try{const u=new URL(item.videoUrl);const parts=u.pathname.split("/").filter(Boolean);if(["reel","reels","p","tv"].includes(parts[0])&&parts[1])embedUrl="https://www.instagram.com/"+parts[0]+"/"+parts[1]+"/embed/";}catch(_){}}
      if(embedUrl){
        const videoWrap=document.createElement("div");
        videoWrap.className="news-video-wrap "+(portrait?"news-video-portrait":"news-video-wide");
        const frame=document.createElement("iframe");
        frame.className="news-video";
        frame.src=embedUrl;
        frame.title=item.title||"فيديو من الملعب";
        frame.loading="lazy";
        frame.allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        frame.referrerPolicy="strict-origin-when-cross-origin";
        frame.allowFullscreen=true;
        videoWrap.appendChild(frame);
        card.appendChild(videoWrap);
      }
    } else if (item.imageUrl) {
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

let latestResultsSnapshot = null;
function renderHomepageResults(snapshot) {
  latestResultsSnapshot = snapshot;
  const host = $("resultsList");
  host.innerHTML = "";
  const items = snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => {
      const ta = a.createdAt?.seconds || (a.date ? Date.parse(a.date) / 1000 : 0);
      const tb = b.createdAt?.seconds || (b.date ? Date.parse(b.date) / 1000 : 0);
      return tb - ta;
    });

  if (!items.length) {
    host.innerHTML = '<article class="result-card"><div class="result-date">لا توجد نتائج منشورة بعد</div><div class="score-row"><strong>ننتظر المباراة القادمة</strong></div></article>';
    return;
  }

  const formatScorers = scorers => {
    if (!Array.isArray(scorers) || !scorers.length) return "—";
    return scorers.map(player => {
      const name = String(player.name || "").trim();
      const goals = Number(player.goals || 0);
      return name ? (goals > 0 ? name + " (" + goals + ")" : name) : "";
    }).filter(Boolean).join("، ") || "—";
  };

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "result-card broadcast-card";

    const top = document.createElement("div");
    top.className = "broadcast-topline";
    const brand = document.createElement("span");
    brand.className = "broadcast-brand";
    brand.textContent = "MATIKO SPORTS";
    const status = document.createElement("span");
    status.className = "broadcast-status";
    status.textContent = "نهاية المباراة";
    top.append(brand, status);

    const date = document.createElement("div");
    date.className = "broadcast-date";
    if (item.date) {
      const parsed = new Date(item.date + "T00:00:00");
      date.textContent = Number.isNaN(parsed.getTime()) ? item.date : parsed.toLocaleDateString("ar-DZ", { day: "numeric", month: "long", year: "numeric" });
    } else {
      date.textContent = "نتيجة مباراة";
    }
    const time = document.createElement("div");
    time.className = "broadcast-time";
    time.textContent = item.time || "";

    const scoreRow = document.createElement("div");
    scoreRow.className = "broadcast-score-row";
    const knownClubCrests = [
      { names:["real madrid","ريال مدريد"], url:"https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg" },
      { names:["barcelona","fc barcelona","برشلونة"], url:"https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg" },
      { names:["manchester united","man united","مانشستر يونايتد"], url:"https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg" },
      { names:["liverpool","ليفربول"], url:"https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg" },
      { names:["manchester city","مانشستر سيتي"], url:"https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg" },
      { names:["arsenal","ارسنال","أرسنال"], url:"https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg" },
      { names:["chelsea","تشيلسي"], url:"https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg" },
      { names:["tottenham","tottenham hotspur","توتنهام"], url:"https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg" },
      { names:["bayern munich","bayern","بايرن ميونخ","بايرن"], url:"https://upload.wikimedia.org/wikipedia/en/1/1f/FC_Bayern_München_logo_%282017%29.svg" },
      { names:["borussia dortmund","dortmund","بوروسيا دورتموند","دورتموند"], url:"https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg" },
      { names:["paris saint-germain","paris saint germain","psg","باريس سان جيرمان"], url:"https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg" },
      { names:["juventus","يوفنتوس"], url:"https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_logo.svg" },
      { names:["inter milan","inter","انتر ميلان","إنتر ميلان"], url:"https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg" },
      { names:["ac milan","milan","ميلان"], url:"https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg" },
      { names:["atletico madrid","اتلتيكو مدريد","أتلتيكو مدريد"], url:"https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg" },
      { names:["ajax","أياكس","اياكس"], url:"https://upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg" }
    ];
    const normalizeClubName = value => String(value || "").toLowerCase().normalize("NFKD")
      .replace(/[\u064B-\u065F\u0670ـ]/g,"").replace(/[أإآٱ]/g,"ا")
      .replace(/[^a-z0-9\u0600-\u06ff]/g,"");
    const knownNationalTeams = [
      {names:["italy","italia","italian national team","ايطاليا","إيطاليا"],code:"it"},
      {names:["algeria","الجزائر"],code:"dz"},
      {names:["france","فرنسا"],code:"fr"},
      {names:["brazil","brasil","البرازيل"],code:"br"},
      {names:["argentina","الارجنتين","الأرجنتين"],code:"ar"},
      {names:["germany","المانيا","ألمانيا"],code:"de"},
      {names:["spain","اسبانيا","إسبانيا"],code:"es"},
      {names:["portugal","البرتغال"],code:"pt"},
      {names:["england","انجلترا","إنجلترا"],code:"gb-eng"},
      {names:["morocco","المغرب"],code:"ma"},
      {names:["tunisia","تونس"],code:"tn"},
      {names:["egypt","مصر"],code:"eg"},
      {names:["saudi arabia","السعودية"],code:"sa"},
      {names:["netherlands","holland","هولندا","هولندا"],code:"nl"},
      {names:["belgium","بلجيكا"],code:"be"},
      {names:["croatia","كرواتيا"],code:"hr"},
      {names:["japan","اليابان"],code:"jp"},
      {names:["south korea","كوريا الجنوبية"],code:"kr"},
      {names:["senegal","السنغال"],code:"sn"},
      {names:["nigeria","نيجيريا"],code:"ng"},
      {names:["cameroon","الكاميرون"],code:"cm"},
      {names:["ivory coast","cote d ivoire","ساحل العاج"],code:"ci"},
      {names:["ghana","غانا"],code:"gh"},
      {names:["united states","usa","امريكا","أمريكا"],code:"us"},
      {names:["mexico","المكسيك"],code:"mx"},
      {names:["uruguay","اوروغواي","أوروغواي"],code:"uy"},
      {names:["switzerland","سويسرا"],code:"ch"},
      {names:["turkey","turkiye","تركيا"],code:"tr"},
      {names:["russia","روسيا"],code:"ru"}
    ];
    const makeTeam = (name, side) => {
      const team = document.createElement("div");
      team.className = "broadcast-team broadcast-team-" + side;
      const cleanName = normalizeClubName(name);
      const club = knownClubCrests.find(entry => entry.names.some(alias => normalizeClubName(alias) === cleanName));
      const country = knownNationalTeams.find(entry => entry.names.some(alias => normalizeClubName(alias) === cleanName));
      if (item[side === "home" ? "crest1" : "crest2"]) {
        const chosenCrest = document.createElement("img");
        chosenCrest.className = "broadcast-crest-img";
        chosenCrest.src = item[side === "home" ? "crest1" : "crest2"];
        chosenCrest.alt = "شعار " + name;
        chosenCrest.loading = "lazy";
        chosenCrest.onerror = () => { chosenCrest.replaceWith(makeFallbackCrest(name)); };
        team.appendChild(chosenCrest);
      } else if (club) {
        const crest = document.createElement("img");
        crest.className = "broadcast-crest-img";
        crest.src = club.url;
        crest.alt = "شعار " + name;
        crest.loading = "lazy";
        crest.referrerPolicy = "no-referrer";
        crest.onerror = () => { crest.replaceWith(makeFallbackCrest(name)); };
        team.appendChild(crest);
      } else if (country) {
        const flag = document.createElement("img");
        flag.className = "broadcast-crest-img broadcast-country-flag";
        flag.src = "https://flagcdn.com/" + country.code + ".svg";
        flag.alt = "علم " + name;
        flag.loading = "lazy";
        flag.onerror = () => { flag.replaceWith(makeFallbackCrest(name)); };
        team.appendChild(flag);
      } else {
        team.appendChild(makeFallbackCrest(name));
      }
      const label = document.createElement("strong");
      label.textContent = name || (side === "home" ? "الفريق الأول" : "الفريق الثاني");
      team.appendChild(label);
      return team;
    };
    const fallbackClubCrests = [
      { name:"Real Madrid", url:"https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg" },
      { name:"Barcelona", url:"https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg" },
      { name:"Manchester United", url:"https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg" },
      { name:"Liverpool", url:"https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg" },
      { name:"Manchester City", url:"https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg" },
      { name:"Arsenal", url:"https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg" },
      { name:"Chelsea", url:"https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg" },
      { name:"Tottenham", url:"https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg" },
      { name:"Bayern Munich", url:"https://upload.wikimedia.org/wikipedia/en/1/1f/FC_Bayern_München_logo_%282017%29.svg" },
      { name:"Borussia Dortmund", url:"https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg" },
      { name:"Paris Saint-Germain", url:"https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg" },
      { name:"Juventus", url:"https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_logo.svg" },
      { name:"Inter Milan", url:"https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg" },
      { name:"AC Milan", url:"https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg" },
      { name:"Atletico Madrid", url:"https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg" },
      { name:"Ajax", url:"https://upload.wikimedia.org/wikipedia/en/7/79/Ajax_Amsterdam.svg" }
    ];
    const makeFallbackCrest = (teamName) => {
      const name = normalizeClubName(teamName);
      let hash = 0;
      for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
      const selected = fallbackClubCrests[hash % fallbackClubCrests.length];
      const crest = document.createElement("img");
      crest.className = "broadcast-crest-img";
      crest.src = selected.url;
      crest.alt = "شعار " + selected.name;
      crest.loading = "lazy";
      crest.referrerPolicy = "no-referrer";
      return crest;
    };
    const team1 = makeTeam(item.team1, "home");
    const team2 = makeTeam(item.team2, "away");
    const homeScore = Number(item.score1);
    const awayScore = Number(item.score2);
    if (Number.isFinite(homeScore) && Number.isFinite(awayScore) && homeScore !== awayScore) {
      const winnerTeam = homeScore > awayScore ? team1 : team2;
      const winnerCrest = winnerTeam.querySelector(".broadcast-crest-img, .broadcast-crest");
      if (winnerCrest) winnerCrest.classList.add("broadcast-winner-crest");
    }
    const score = document.createElement("div");
    score.className = "broadcast-score";
    const numbers = document.createElement("strong");
    numbers.textContent = String(item.score1 ?? "—") + " : " + String(item.score2 ?? "—");
    const fullTime = document.createElement("span");
    fullTime.textContent = "FULL TIME";
    score.append(numbers, fullTime);
    scoreRow.append(team1, score, team2);

    const scorerTitle = document.createElement("div");
    scorerTitle.className = "broadcast-scorers-title";
    scorerTitle.textContent = "مسجلو الأهداف";
    const scorers = document.createElement("div");
    scorers.className = "broadcast-scorers";
    const addScorers = (list, side) => {
      const column = document.createElement("div");
      column.className = "broadcast-scorer-column broadcast-scorer-" + side;
      const players = Array.isArray(list) ? list : [];
      if (!players.length) {
        const empty = document.createElement("span");
        empty.className = "broadcast-no-scorers";
        empty.textContent = "—";
        column.append(empty);
      } else {
        players.forEach(player => {
          const row = document.createElement("div");
          row.className = "broadcast-scorer";
          const name = document.createElement("span");
          name.textContent = String(player.name || "").trim();
          const goals = Number(player.goals || 0);
          if (goals > 0) {
            const count = document.createElement("b");
            count.className = "broadcast-goal-count";
            count.textContent = "⚽ × " + goals;
            row.append(name, count);
            if (goals >= 3) {
              const hattrick = document.createElement("span");
              hattrick.className = "broadcast-hattrick";
              hattrick.textContent = "هاتريك";
              row.appendChild(hattrick);
            }
          } else {
            row.append(name);
          }
          if (name.textContent) column.append(row);
        });
      }
      return column;
    };
    scorers.append(addScorers(item.scorers1, "home"), addScorers(item.scorers2, "away"));
    card.append(top, date, time, scoreRow, scorerTitle, scorers);

    host.appendChild(card);
  });
}

onSnapshot(collection(db, "results"), renderHomepageResults, error => {
  console.error("Could not load homepage results:", error);
  $("resultsList").innerHTML = '<article class="result-card"><div class="result-date">تعذر تحميل النتائج</div><p>يرجى تحديث الصفحة لاحقاً.</p></article>';
});

onSnapshot(collection(db, "news"), renderHomepageNews, error => {
  console.error("Could not load homepage news:", error);
  $("newsList").innerHTML = '<article class="news-placeholder"><span>📰</span><h3>تعذر تحميل الأخبار</h3><p>يرجى تحديث الصفحة لاحقاً.</p></article>';
});

onSnapshot(doc(db, "settings", "about"), snapshot => {
  if (!snapshot.exists()) return;
  const data = snapshot.data();
  const description = $("aboutDescriptionHome");
  const contact = $("aboutContactHome");
  if (description && data.description) description.textContent = data.description;
  if (contact) {
    contact.replaceChildren();
    [["📍", data.location], ["☎", data.phone]].forEach(([icon, value]) => {
      if (!value || !String(value).trim()) return;
      const item = document.createElement("span");
      item.className = "about-contact-item";
      item.textContent = icon + " " + String(value).trim();
      contact.appendChild(item);
    });
    contact.classList.toggle("hidden", !contact.children.length);
  }
}, error => {
  console.error("Could not load stadium information:", error);
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
$("ownerLogin").addEventListener("click", () => {
  if (isOwnerAccount(currentUser)) {
    location.href = "admin.html";
    return;
  }
  openAuth("owner");
});
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
  if (latestResultsSnapshot) renderHomepageResults(latestResultsSnapshot);
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
