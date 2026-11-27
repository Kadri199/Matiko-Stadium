import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { db } from "./firebase.js";
import { addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
const game=document.body.dataset.game,isPenalty=game==="penalty",$=id=>document.getElementById(id);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x8ab6d0);scene.fog=new THREE.Fog(0x8ab6d0,35,100);
const camera=new THREE.PerspectiveCamera(53,1,.1,150);camera.position.set(0,2.7,11);camera.lookAt(0,1.1,-13);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;$("game3d").appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe6f4ff,0x29462c,2));const sun=new THREE.DirectionalLight(0xfff0d5,2.2);sun.position.set(-8,16,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
const M=(c,r=.8)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
const green=M(0x287b42),green2=M(0x32894c),line=M(0xffffff),blue=M(0x1765bb),navy=M(0x1b2d48),skin=M(0xb87952),black=M(0x18222a),gold=M(0xe5a52e);
function mesh(geo,mat,x,y,z,parent=scene){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function bar(a,b,r,material,parent){const d=new THREE.Vector3().subVectors(b,a),o=mesh(new THREE.CylinderGeometry(r,r,d.length(),10),material,0,0,0,parent);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o}
mesh(new THREE.BoxGeometry(25,.12,52),green,0,-.12,-10);
for(let i=0;i<9;i++)mesh(new THREE.BoxGeometry(25,.012,5.8),i%2?green:green2,0,-.052,-32+i*5.8);
for(const x of [-12.4,12.4])mesh(new THREE.BoxGeometry(.06,.02,44),line,x,-.045,-10);
for(const z of [12,-32])mesh(new THREE.BoxGeometry(25,.02,.06),line,0,-.045,z);
mesh(new THREE.BoxGeometry(16,.02,.06),line,0,-.04,-23);for(const x of [-8,8])mesh(new THREE.BoxGeometry(.06,.02,12),line,x,-.04,-17);
const circle=mesh(new THREE.RingGeometry(3.95,4,.04,80),line,0,-.04,-10);circle.rotation.x=-Math.PI/2;
const gz=-19,gw=7.32,gh=2.44;
for(const x of [-gw/2,gw/2])mesh(new THREE.CylinderGeometry(.07,.07,gh,16),line,x,gh/2,gz);
mesh(new THREE.CylinderGeometry(.07,.07,gw,16),line,0,gh,gz).rotation.z=Math.PI/2;
const netMat=new THREE.MeshBasicMaterial({color:0xf1f6f7,wireframe:true,transparent:true,opacity:.42});
mesh(new THREE.BoxGeometry(gw,gh,2.2,8,5,3),netMat,0,gh/2,gz-1.05);
for(let side=0;side<2;side++){const z=-29;mesh(new THREE.BoxGeometry(25,.7,1.1),M(0x263b4b),0,2.4,z);for(let row=0;row<3;row++)for(let i=0;i<24;i++)mesh(new THREE.SphereGeometry(.13,8,8),M([0xd64c43,0xe8c04b,0xe7edf3,0x438bc2][(i+row)%4]),-11.5+i,2.9+row*.34,z-.2)}
function person(x,z,keeper=false){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);const jersey=keeper?gold:blue;
mesh(new THREE.CapsuleGeometry(.34,.62,5,10),jersey,0,1.38,0,g);mesh(new THREE.SphereGeometry(.22,16,12),skin,0,2.05,0,g);mesh(new THREE.SphereGeometry(.225,16,12),black,0,2.17,0,g).scale.set(1,.45,1);
for(const s of [-1,1]){bar(new THREE.Vector3(s*.3,1.62,0),new THREE.Vector3(s*.48,1.12,.04),.105,jersey,g);mesh(new THREE.SphereGeometry(.1,10,8),skin,s*.48,1.1,.04,g);bar(new THREE.Vector3(s*.17,1.05,0),new THREE.Vector3(s*.2,.53,.02),.13,navy,g);bar(new THREE.Vector3(s*.2,.53,.02),new THREE.Vector3(s*.2,.12,-.04),.09,black,g);mesh(new THREE.BoxGeometry(.32,.14,.48),black,s*.2,.08,-.13,g)}
return g}
const shooter=person(0,6),keeper=person(0,gz+.4,true);const ball=mesh(new THREE.SphereGeometry(.22,24,18),M(0xf8f8f4,.3),0,.23,5.15);
const seams=M(0x18232a);for(let i=0;i<3;i++){const t=mesh(new THREE.TorusGeometry(.14,.009,5,24),seams,0,0,0,ball);t.rotation.set(i*.9,i*.7,i*.4)}
const groundShadow=mesh(new THREE.CircleGeometry(.35,24),new THREE.MeshBasicMaterial({color:0x07160b,transparent:true,opacity:.3}),0,-.045,5.15);groundShadow.rotation.x=-Math.PI/2;
const state={aim:0,power:72,shots:0,score:0,flight:null};
const list=$("top10");onSnapshot(query(collection(db,"gameScores",game,"entries"),orderBy("score","desc"),limit(10)),snap=>{list.replaceChildren();snap.docs.forEach((doc,i)=>{const d=doc.data(),li=document.createElement("li");for(const [cls,val] of [["rank",["🥇","🥈","🥉"][i]||String(i+1)],["player",d.name||"لاعب"],["points",d.score+"/5"]]){const el=document.createElement(cls==="points"?"b":"span");el.className=cls;el.textContent=val;li.append(el)}list.append(li)})},console.warn);
function resize(){const w=$("game3d").clientWidth,h=$("game3d").clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}new ResizeObserver(resize).observe($("game3d"));resize();
function update(){requestAnimationFrame(update);if(state.flight){const f=state.flight;f.t=Math.min(1,f.t+.014);const t=f.t;ball.position.set(f.from.x+(f.to.x-f.from.x)*t,f.from.y+(f.to.y-f.from.y)*t+Math.sin(Math.PI*t)*f.arc,f.from.z+(f.to.z-f.from.z)*t);groundShadow.position.x=ball.position.x;groundShadow.position.z=ball.position.z;groundShadow.scale.setScalar(1-t*.6);if(t===1){state.flight=null;land(f)}}renderer.render(scene,camera)}update();
function land(f){if(f.saved){$("feedback").textContent="🧤 تصدٍ رائع من الحارس!";$("feedback").className="feedback miss"}else if(f.crossbar){$("feedback").textContent="🎯 اصطدمت الكرة بالعارضة!";$("feedback").className="feedback success"}else if(f.goal){$("feedback").textContent="⚽ هدف! تسديدة رائعة!";$("feedback").className="feedback success"}else{$("feedback").textContent="خارج المرمى! حاول مجدداً."; $("feedback").className="feedback miss"}state.shots++;$("score").textContent=state.score;$("attempts").textContent=state.shots+"/5";if(state.shots===5){$("shoot").disabled=true;finish()}else{$("hint").textContent="غيّر الاتجاه والقوة للمحاولة التالية.";}setTimeout(()=>{ball.position.set(0,.23,5.15);groundShadow.position.set(0,-.045,5.15);groundShadow.scale.setScalar(1);keeper.position.x=0;keeper.rotation.set(0,0,0);if(state.shots<5)$("shoot").disabled=false},650)}
function shoot(){if(state.flight||state.shots>=5||$("shoot").disabled)return;const x=state.aim*4.3,p=state.power/100;let y=isPenalty ? .35+p*1.15 : .25+p*2.15;let inside=Math.abs(x)<3.66&&y<2.44,saved=false,crossbar=false,goal=inside;
if(isPenalty){const keeperX=THREE.MathUtils.clamp(x+(Math.random()-.5)*2.5,-3.15,3.15);keeper.position.x=keeperX;keeper.rotation.z=x===0?0:(keeperX>x?-.42:.42);saved=inside&&Math.abs(keeperX-x)<.72&&y<2.15;if(saved)goal=false}else{crossbar=inside&&Math.abs(y-2.44)<.48;goal=crossbar}
if(goal)state.score++;$("shoot").disabled=true;$("feedback").textContent="الكرة في طريقها إلى المرمى...";$("feedback").className="feedback";
state.flight={t:0,from:ball.position.clone(),to:new THREE.Vector3(x,Math.max(.22,y),gz),arc:2.8+p*1.4,goal,saved,crossbar};shooter.rotation.x=-.18;setTimeout(()=>shooter.rotation.x=0,380)}
function finish(){$("hint").textContent="انتهى التحدي! نتيجتك "+state.score+" من 5. سجّل اسمك."; $("register").classList.remove("hidden");$("shoot").disabled=true}
$("shoot").addEventListener("click",shoot);$("aim").addEventListener("input",e=>{state.aim=(Number(e.target.value)-50)/50;$("aimValue").textContent=state.aim<-.12?"يسار":state.aim>.12?"يمين":"الوسط"});$("power").addEventListener("input",e=>{state.power=+e.target.value;$("powerValue").textContent=state.power+"%"});
$("restart").addEventListener("click",()=>{state.shots=0;state.score=0;state.aim=0;state.power=72;keeper.position.x=0;keeper.rotation.set(0,0,0);ball.position.set(0,.23,5.15);$("score").textContent="0";$("attempts").textContent="0/5";$("aim").value=50;$("power").value=72;$("register").classList.add("hidden");$("shoot").disabled=false;$("feedback").textContent="جاهز للتسديد؟";$("hint").textContent="اضبط اتجاه وقوة التسديدة ثم اضغط سدد."});
$("save").addEventListener("click",async()=>{const name=$("playerName").value.trim().replace(/\s+/g," ");if(name.length<2||name.length>24){$("saveStatus").textContent="اكتب اسماً صحيحاً من حرفين إلى 24 حرفاً.";return} $("save").disabled=true;try{await addDoc(collection(db,"gameScores",game,"entries"),{name,score:state.score,createdAt:serverTimestamp()});$("saveStatus").textContent="تم تسجيل نتيجتك في أفضل 10!";$("register").classList.add("hidden")}catch(e){$("saveStatus").textContent="تعذر الحفظ. حاول مجدداً.";$("save").disabled=false}});
