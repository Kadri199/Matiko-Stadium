import { db } from "./firebase.js";
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
const $=id=>document.getElementById(id);
const raw=[["easy","Lionel Messi","messi"],["easy","Cristiano Ronaldo","ronaldo"],["easy","Neymar Jr.","neymar"],["easy","Kylian Mbappé","mbappe"],["easy","Erling Haaland","haaland"],["easy","Mohamed Salah","salah"],["easy","Luka Modrić","modric"],["easy","Kevin De Bruyne","de-bruyne"],["easy","Vinícius Júnior","vinicius"],["easy","Jude Bellingham","bellingham"],["easy","Harry Kane","kane"],["easy","Son Heung-min","son"],["easy","Robert Lewandowski","lewandowski"],["easy","Zlatan Ibrahimović","ibrahimovic"],["easy","Zinedine Zidane","zidane"],["easy","Ronaldinho","ronaldinho"],["easy","David Beckham","beckham"],["easy","Karim Benzema","benzema"],["easy","Lamine Yamal","lamine-yamal"],["medium","Andrés Iniesta","andres-iniesta"],["medium","Xavi","xavi"],["medium","Pelé","pele"],["medium","Diego Maradona","diego-maradona"],["medium","Johan Cruyff","johan-cruyff"],["medium","Ronaldo Nazário","ronaldo-nazario"],["medium","Gianluigi Buffon","gianluigi-buffon"],["medium","Iker Casillas","iker-casillas"],["medium","Manuel Neuer","manuel-neuer"],["medium","Sergio Ramos","sergio-ramos"],["medium","Virgil van Dijk","virgil-van-dijk"],["medium","Luis Suárez","luis-suarez"],["medium","Gareth Bale","gareth-bale"],["medium","Wayne Rooney","wayne-rooney"],["medium","Thierry Henry","thierry-henry"],["medium","Francesco Totti","francesco-totti"],["medium","Mesut Özil","mesut-ozil"],["medium","Frank Lampard","frank-lampard"],["medium","Antoine Griezmann","antoine-griezmann"],["medium","Kaká","kaka"],["medium","Robin van Persie","robin-van-persie"],["medium","Steven Gerrard","steven-gerrard"],["medium","Eusébio","eusebio"],["medium","Thomas Müller","thomas-muller"],["medium","Eden Hazard","eden-hazard"],["medium","Arjen Robben","arjen-robben"],["medium","Didier Drogba","didier-drogba"],["medium","Samuel Eto'o","samuel-etoo"],["medium","Fernando Torres","fernando-torres"],["medium","Sergio Agüero","sergio-aguero"],["medium","James Rodríguez","james-rodriguez"],["medium","Olivier Giroud","olivier-giroud"],["medium","Franck Ribéry","franck-ribery"],["medium","Andriy Shevchenko","andriy-shevchenko"],["medium","Ryan Giggs","ryan-giggs"],["medium","Andrea Pirlo","andrea-pirlo"],["medium","Toni Kroos","toni-kroos"],["medium","David Villa","david-villa"],["medium","Ángel Di María","angel-di-maria"],["medium","Paolo Maldini","paolo-maldini"],["medium","Luis Figo","luis-figo"],["medium","Marcelo Vieira","marcelo-vieira"],["medium","Riyad Mahrez","riyad-mahrez"],["medium","Achraf Hakimi","achraf-hakimi"],["hard","Sunil Chhetri","sunil-chhetri"],["hard","Marta","marta"],["hard","Alex Morgan","alex-morgan"],["hard","Megan Rapinoe","megan-rapinoe"],["hard","Sam Kerr","sam-kerr"],["hard","Alexia Putellas","alexia-putellas"],["hard","Aitana Bonmatí","aitana-bonmati"],["hard","Ada Hegerberg","ada-hegerberg"],["hard","Lucy Bronze","lucy-bronze"],["hard","Leah Williamson","leah-williamson"],["hard","Mary Earps","mary-earps"],["hard","Vivianne Miedema","vivianne-miedema"],["hard","Christine Sinclair","christine-sinclair"],["hard","Roberto Baggio","roberto-baggio"],["hard","Gerd Müller","gerd-muller"],["hard","Alfredo Di Stéfano","alfredo-di-stefano"],["hard","Marco van Basten","marco-van-basten"],["hard","George Best","george-best"],["hard","Diego Forlán","diego-forlan"],["hard","Alessandro Del Piero","alessandro-del-piero"],["hard","Philipp Lahm","philipp-lahm"],["hard","Edinson Cavani","edinson-cavani"],["hard","Fabio Cannavaro","fabio-cannavaro"],["hard","Oliver Kahn","oliver-kahn"],["hard","Bobby Charlton","bobby-charlton"],["hard","Raúl","raul"],["hard","Michael Ballack","michael-ballack"],["hard","Sergio Busquets","sergio-busquets"],["hard","Paolo Rossi","paolo-rossi"],["hard","Romário","romario"],["hard","Javier Zanetti","javier-zanetti"],["hard","Hristo Stoichkov","hristo-stoichkov"],["hard","Yaya Touré","yaya-toure"],["hard","N'Golo Kanté","ngolo-kante"],["hard","Edin Džeko","edin-dzeko"],["hard","Park Ji-Sung","park-ji-sung"],["hard","Hidetoshi Nakata","hidetoshi-nakata"],["hard","Carlos Tevez","carlos-tevez"],["hard","Gabriel Batistuta","gabriel-batistuta"],["hard","Javier Mascherano","javier-mascherano"],["hard","Arturo Vidal","arturo-vidal"],["hard","Nani","nani"],["hard","Rio Ferdinand","rio-ferdinand"],["hard","Patrick Vieira","patrick-vieira"],["hard","Xherdan Shaqiri","xherdan-shaqiri"],["hard","Zico","zico"],["hard","Ruud van Nistelrooy","ruud-van-nistelrooy"],["hard","Lilian Thuram","lilian-thuram"],["hard","Dunga","dunga"],["hard","Ronald Koeman","ronald-koeman"],["hard","Shinji Kagawa","shinji-kagawa"]];
const players=raw.map(([level,name,slug])=>({level,name,src:"https://geofootballguessr.com/footballers/"+slug+".webp"}));
const animals=["Lion","Tiger","Leopard","Cheetah","Jaguar","Snow leopard","African elephant","Asian elephant","Giraffe","Zebra","Hippopotamus","Rhinoceros","Gorilla","Chimpanzee","Orangutan","Giant panda","Koala","Kangaroo","Sloth","Meerkat","Hyena","Gray wolf","Red fox","Arctic fox","Brown bear","Polar bear","Moose","Reindeer","Bison","Buffalo","Camel","Llama","Horse","Donkey","Wild boar","Deer","Gazelle","Antelope","Mountain goat","Sheep","Goat","Cow","Dog","Cat","Rabbit","Squirrel","Beaver","Otter","Badger","Hedgehog","Bat","Eagle","Owl","Falcon","Peregrine falcon","Parrot","Macaw","Toucan","Penguin","Ostrich","Emu","Swan","Pelican","Kingfisher","Woodpecker","Hummingbird","Albatross","Crocodile","Alligator","Komodo dragon","Iguana","Chameleon","Gecko","Python","King cobra","Turtle","Sea turtle","Frog","Tree frog","Salamander","Shark","Great white shark","Dolphin","Blue whale","Orca","Octopus","Sea horse","Jellyfish","Butterfly","Monarch butterfly","Honey bee","Ladybird","Praying mantis","Dragonfly","Scorpion","Tarantula","Ant","Grasshopper","Flamingo","Peacock"];
const managers=["Pep Guardiola","Mikel Arteta","Carlo Ancelotti","José Mourinho","Jürgen Klopp","Sir Alex Ferguson","Arsène Wenger","Diego Simeone","Luis Enrique","Xabi Alonso","Unai Emery","Thomas Tuchel","Antonio Conte","Massimiliano Allegri","Roberto Mancini","Didier Deschamps","Gareth Southgate","Julian Nagelsmann","Hansi Flick","Vincent Kompany","Ruben Amorim","Erik ten Hag","Eddie Howe","Ange Postecoglou","Mauricio Pochettino","Brendan Rodgers","Rafael Benítez","Fabio Capello","Marcello Lippi","Arrigo Sacchi","José Villalonga","Ottmar Hitzfeld","Jupp Heynckes","Louis van Gaal","Guus Hiddink","Sven-Göran Eriksson","Bobby Robson","Carlo Mazzone","Claudio Ranieri","Roberto De Zerbi","Graham Potter","Frank Rijkaard","Ronald Koeman","Frank de Boer","Laurent Blanc","Zlatko Dalić","Herbert Chapman","Brian Clough","Mircea Lucescu","Vahid Halilhodžić"];
const animalEntries=animals.map((name,i)=>({category:"animal",level:i<30?"easy":i<65?"medium":"hard",name,wiki:name}));
const managerEntries=managers.map((name,i)=>({category:"manager",level:i<15?"easy":i<35?"medium":"hard",name,wiki:name}));
const playerEntries=players.map(p=>({...p,category:"player",wiki:p.name}));
const stages=[playerEntries,animalEntries,managerEntries];
const stageNames=["اللاعبين","الحيوانات","المدربين"];
let stageIndex=0,stageSeen=new Set(),photoCache=new Map();
async function photoFor(entry){
 if(entry.src)return entry.src;
 if(photoCache.has(entry.name))return photoCache.get(entry.name);
 const task=(async()=>{
  const title=entry.wiki.replace(/ /g,"_");
  try{
   const response=await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(title),{headers:{"Accept":"application/json"}});
   if(response.ok){const data=await response.json();const url=data.thumbnail?.source||data.originalimage?.source;if(url)return url;}
  }catch(e){}
  try{
   const q=encodeURIComponent(entry.name+" "+(entry.category==="animal"?"animal":"football manager"));
   const response=await fetch("https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch="+q+"&gsrnamespace=0&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=640&format=json&origin=*");
   if(response.ok){const data=await response.json();const page=Object.values(data.query?.pages||{})[0];if(page?.thumbnail?.source)return page.thumbnail.source;}
  }catch(e){}
  return "https://placehold.co/640x640/102a36/ffffff?text="+encodeURIComponent(entry.name);
 })();
 photoCache.set(entry.name,task);return task;
}

let score=0,number=0,locked=false,current=null,deck=[],lastCorrectIndex=-1;
const shuffle=a=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x};
function level(){return score<10?"easy":score<30?"medium":"hard"}
function nextEntry(){
 let remaining=stages[stageIndex].filter(p=>!stageSeen.has(p.name));
 if(!remaining.length){
  stageIndex++;
  if(stageIndex>=stages.length){stageIndex=0;stageSeen.clear();}
  deck=[];
  remaining=stages[stageIndex].filter(p=>!stageSeen.has(p.name));
 }
 let pool=remaining.filter(p=>p.level==="easy"||(level()!=="easy"&&p.level==="medium")||level()==="hard");
 if(!pool.length)pool=remaining;
 const available=new Set(pool.map(p=>p.name));
 deck=deck.filter(p=>available.has(p.name));
 if(!deck.length)deck=shuffle(pool);
 const next=deck.pop();stageSeen.add(next.name);return next;
}
function optionsFor(p){
 const pool=stages[stageIndex].filter(x=>x!==p);
 const choices=shuffle([p,...shuffle(pool).slice(0,3)]);
 let correct=choices.findIndex(x=>x===p);
 if(choices.length>1&&correct===lastCorrectIndex){const swap=(correct+1+Math.floor(Math.random()*(choices.length-1)))%choices.length;[choices[correct],choices[swap]]=[choices[swap],choices[correct]];correct=swap;}
 lastCorrectIndex=correct;return choices;
}
onSnapshot(query(collection(db,"gameScores","players","entries"),orderBy("score","desc"),limit(10)),snap=>{const list=$("top10");list.replaceChildren();snap.docs.forEach((doc,i)=>{const d=doc.data(),li=document.createElement("li"),rank=document.createElement("span"),name=document.createElement("span"),points=document.createElement("b");rank.textContent=["🥇","🥈","🥉"][i]||String(i+1);name.textContent=d.name||"لاعب";points.textContent=(d.score||0)+" نقطة";li.append(rank,name,points);list.append(li)})},console.warn);
async function render(){
 locked=false;current=nextEntry();number++;
 $("quizFinish").classList.add("hidden");
 $("questionNo").textContent=number;$("currentScore").textContent=score;$("correctCount").textContent=score;
 $("progressBar").style.width=((score%20)/20*100)+"%";
 $("playerPhoto").src="https://placehold.co/640x640/102a36/ffffff?text="+encodeURIComponent("Loading...");
 $("playerPhoto").alt="صورة "+current.name;
 $("quizFeedback").textContent=(current.category==="player"?"من هو هذا اللاعب؟":current.category==="animal"?"ما اسم هذا الحيوان؟":"من هو هذا المدرب؟")+" — "+stageNames[stageIndex]+" | مستوى: "+(current.level==="easy"?"سهل":current.level==="medium"?"متوسط":"صعب");
 $("quizFeedback").className="players-feedback";
 const box=$("playerOptions");box.replaceChildren();
 optionsFor(current).forEach(opt=>{const b=document.createElement("button");b.className="player-option";b.type="button";b.textContent=opt.name;b.addEventListener("click",()=>answer(b,opt===current));box.append(b)});
 const entry=current;const src=await photoFor(entry);if(current===entry)$("playerPhoto").src=src;
}
function answer(button,correct){if(locked)return;locked=true;const buttons=[...$("playerOptions").querySelectorAll("button")];buttons.forEach(b=>{b.disabled=true;if(b.textContent===current.name)b.classList.add("correct")});if(correct){score++;$("quizFeedback").textContent="إجابة صحيحة! +1 ⚽";$("quizFeedback").classList.add("good");$("currentScore").textContent=score;$("correctCount").textContent=score;setTimeout(render,850)}else{button.classList.add("wrong");$("quizFeedback").textContent="إجابة خاطئة! انتهت اللعبة."; $("quizFeedback").classList.add("bad");$("finalScore").textContent="نتيجتك: "+score+" نقطة بعد "+number+" سؤالاً. اكتب اسمك لدخول أفضل 10.";$("saveStatus").textContent="";$("playerName").value="";$("saveScore").disabled=false;$("saveScore").textContent="سجّل نتيجتي";setTimeout(()=>{$("quizFinish").classList.remove("hidden");$("quizFinish").classList.add("is-open");$("playerName").focus({preventScroll:true})},550)}}
let scoreSaved=false;$("saveScore").addEventListener("click",async()=>{if(scoreSaved)return;const name=$("playerName").value.trim().replace(/\s+/g," ");if(name.length<2||name.length>24){$("saveStatus").textContent="اكتب اسماً صحيحاً من حرفين إلى 24 حرفاً.";return}const btn=$("saveScore");btn.disabled=true;try{await addDoc(collection(db,"gameScores","players","entries"),{name,score,createdAt:serverTimestamp()});scoreSaved=true;$("saveStatus").textContent="تم تسجيل نتيجتك في أفضل 10! اضغط «العب من جديد» للمحاولة مرة أخرى.";$("saveScore").textContent="تم حفظ النتيجة";}catch(e){$("saveStatus").textContent="تعذر الحفظ. تحقق من الاتصال وحاول مجدداً.";$("saveScore").disabled=false}});
$("playAgain").addEventListener("click",()=>{score=0;number=0;deck=[];stageIndex=0;stageSeen.clear();lastCorrectIndex=-1;scoreSaved=false;$("saveStatus").textContent="";$("playerName").value="";$("saveScore").disabled=false;$("saveScore").textContent="سجّل نتيجتي";$("quizFinish").classList.add("hidden");$("quizFinish").classList.remove("is-open");render();window.scrollTo({top:0,behavior:"smooth"})});
$("finalScore").textContent="احفظ نتيجتك في أي وقت، والعب بلا نهاية!";
$("quizFinish").classList.add("hidden");$("playAgain").textContent="إعادة الرقم إلى الصفر";render();
