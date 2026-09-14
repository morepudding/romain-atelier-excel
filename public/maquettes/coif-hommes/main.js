const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const range = (p, from, to) => smooth(clamp((p - from) / (to - from)));
const motionMedia = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = motionMedia.matches;
let introActive = false;
let loaded = false;
let rafPending = false;
const entrance = $('#entrance');
const canvas = $('#hair');
const ctx = canvas.getContext('2d');
const cursor = $('#scissor-cursor');
const main = $('main');
const header = $('#header');
const footer = $('.site-footer');
const styleSection = $('#styles');
const mirrorSection = $('#salon');
const mirror = $('#mirror-frame');
const trace = $('#trace-path');
const traceLength = trace.getTotalLength();
trace.style.strokeDasharray = `${traceLength}`;
trace.style.strokeDashoffset = `${traceLength}`;
const cards = $$('.style-card');
let strands = [];
let fragments = [];
let width = innerWidth;
let height = innerHeight;
let hairFrame = 0;
let lastHairTime = 0;
let snipTimer;
let departTimer;
let cutCount = 0;
let lastPointer = null;
let touchDown = false;
let activeFocus = null;

function setMotion(value) {
  reduced = value;
  document.body.classList.toggle('motion-reduced', reduced);
  $('#motion-toggle').setAttribute('aria-pressed', String(reduced));
  $('#motion-toggle').textContent = reduced ? 'Activer les animations' : 'Réduire les animations';
  if (reduced && introActive) finishIntro();
  scheduleScroll();
}
$('#motion-toggle').addEventListener('click', () => setMotion(!reduced));
motionMedia.addEventListener('change', (event) => setMotion(event.matches));
setMotion(reduced);

function scrollProgress(section) {
  const rect = section.getBoundingClientRect();
  return clamp(-rect.top / Math.max(1, section.offsetHeight - innerHeight));
}
function renderScroll() {
  rafPending = false;
  header.classList.toggle('is-scrolled', scrollY > innerHeight * .72);
  if (reduced) return;
  const p = scrollProgress(styleSection);
  const narrow = innerWidth <= 700;
  const enter2 = range(p, .17, .49);
  const enter3 = range(p, .49, .83);
  cards[0].style.transform = `translate(${-p * (narrow ? 8 : 12)}vw,${p * 2}vh) rotate(${-8 - 5 * p}deg) scale(${1 - p * .04})`;
  cards[1].style.transform = `translate(${mix(38, -2, enter2)}vw,${mix(115, 1, enter2)}vh) rotate(${mix(32, 3, enter2)}deg)`;
  cards[2].style.transform = `translate(${mix(-28, narrow ? 2 : 5, enter3)}vw,${mix(115, 3, enter3)}vh) rotate(${mix(-30, 10, enter3)}deg)`;
  cards[1].style.opacity = String(clamp(enter2 * 5));
  cards[2].style.opacity = String(clamp(enter3 * 5));
  const selected = p < .36 ? 0 : p < .68 ? 1 : 2;
  $$('[data-go-card]').forEach((el, i) => el.setAttribute('aria-pressed', String(i === selected)));

  const q = scrollProgress(mirrorSection);
  const drawing = range(q, 0, .60);
  const expansion = range(q, .54, .94);
  trace.style.strokeDashoffset = String(traceLength * (1 - drawing));
  trace.style.opacity = String(1 - range(q, .60, .83));
  const start = narrow ? {x:38,y:43,w:54,h:45} : innerWidth <= 1050 ? {x:60,y:29,w:32,h:55} : {x:60,y:23,w:27,h:62};
  mirror.style.left = `${mix(start.x, 3, expansion)}%`;
  mirror.style.top = `${mix(start.y, narrow ? 12 : 13, expansion)}%`;
  mirror.style.width = `${mix(start.w, 94, expansion)}%`;
  mirror.style.height = `${mix(start.h, narrow ? 82 : 81, expansion)}%`;
  const radius = mix(48, 1.5, expansion);
  mirror.style.borderRadius = `${radius}% ${radius}% 4px 4px`;
  $('.mirror-heading').style.opacity = String(1 - range(q, .51, .72));
  $('.mirror-heading').style.transform = `translateY(${-expansion * 60}px)`;
  $('.mirror-overlay').style.opacity = String(range(q, .72, .93));
  $('.mirror-light').style.transform = `translateX(${mix(-85, 85, range(q, .05, .68))}%)`;
}
function scheduleScroll() {
  if (!rafPending) { rafPending = true; requestAnimationFrame(renderScroll); }
}
addEventListener('scroll', scheduleScroll, {passive:true});
addEventListener('resize', () => { scheduleScroll(); if(introActive) prepareHair(); });
$$('[data-go-card]').forEach((button) => button.addEventListener('click', () => {
  const index = Number(button.dataset.goCard);
  if (reduced) { cards[index].scrollIntoView({block:'center'}); return; }
  const top = styleSection.getBoundingClientRect().top + scrollY;
  const run = styleSection.offsetHeight - innerHeight;
  scrollTo({top: top + run * [0, .49, .84][index], behavior:'smooth'});
}));

function bezier(t, a, b, c, d) {
  const k = 1 - t;
  return k*k*k*a + 3*k*k*t*b + 3*k*t*t*c + t*t*t*d;
}
function prepareHair() {
  width = innerWidth; height = innerHeight;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = width*dpr; canvas.height = height*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  strands=[]; fragments=[]; cutCount=0;
  const narrow = width <= 700;
  const count = narrow ? 52 : 76;
  for (let i=0;i<count;i++) {
    const t = i/(count-1);
    const originX = width * (narrow ? .08 + .87*t : .52 + .44*t);
    const originY = height * (narrow ? .55 : .12) + Math.sin(t*3.14)*height*.04;
    const endX = originX + Math.sin(t*7)*width*(narrow?.13:.075);
    const endY = height*(narrow?.87:.78) - Math.sin(t*3.14)*height*.13;
    const points=[];
    for(let j=0;j<=28;j++) {
      const a=j/28;
      points.push({x:bezier(a,originX,originX-width*.08,endX+width*.075,endX),y:bezier(a,originY,originY+height*.18,endY-height*.06,endY)});
    }
    strands.push({points,cut:29,tone:i%6===0?'#f2f0e8':i%3===0?'#94a936':'#d8f24b',line: .8+(i%4)*.35,phase:i*.37});
  }
}
function drawLine(points,color,line,offsetX=0,offsetY=0) {
  if(points.length<2) return;
  ctx.beginPath();ctx.moveTo(points[0].x+offsetX,points[0].y+offsetY);
  for(let i=1;i<points.length;i++) ctx.lineTo(points[i].x+offsetX,points[i].y+offsetY);
  ctx.strokeStyle=color;ctx.lineWidth=line;ctx.lineCap='round';ctx.stroke();
}
function paintHair(time) {
  if (!introActive) return;
  const dt=Math.min((time-lastHairTime)/1000 || .016,.035); lastHairTime=time;
  ctx.clearRect(0,0,width,height);
  for(const s of strands) drawLine(s.points.slice(0,s.cut),s.tone,s.line,Math.sin(time*.0007+s.phase)*1.5,0);
  fragments=fragments.filter(f=>f.y<height+200);
  for(const f of fragments) {
    f.vy += dt*720; f.y += f.vy*dt; f.x += f.vx*dt; f.rotation += f.spin*dt;
    ctx.save();ctx.translate(f.origin.x+f.x,f.origin.y+f.y);ctx.rotate(f.rotation);
    ctx.globalAlpha=clamp(1-f.y/(height*.8));
    drawLine(f.points.map(pt=>({x:pt.x-f.origin.x,y:pt.y-f.origin.y})),f.tone,f.line);
    ctx.restore();
  }
  hairFrame=requestAnimationFrame(paintHair);
}
function pointDistance(px,py,ax,ay,bx,by) {
  const dx=bx-ax,dy=by-ay;
  const t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1));
  return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));
}
function cutAt(x,y) {
  if(!loaded || !introActive || entrance.classList.contains('departing'))return;
  let cut=false;
  const previous=lastPointer || {x,y};
  for(const s of strands) {
    if(s.cut<29)continue;
    for(let j=3;j<27;j++) {
      const pt=s.points[j];
      if(pointDistance(pt.x,pt.y,previous.x,previous.y,x,y) < 12) {
        const tail=s.points.slice(j);s.cut=j+1;cutCount++;cut=true;
        fragments.push({points:tail,origin:tail[0],tone:s.tone,line:s.line,x:0,y:0,vy:35,vx:(Math.random()-.5)*130,spin:(Math.random()-.5)*3,rotation:0});
        break;
      }
    }
  }
  lastPointer={x,y};
  if(cut) {
    cursor.classList.add('snip');clearTimeout(snipTimer);snipTimer=setTimeout(()=>cursor.classList.remove('snip'),100);
    const n=Math.min(cutCount,16);$('#load-number').textContent=String(n).padStart(2,'0');
    $('#load-fill').style.width=`${n/16*100}%`;$('.load-line svg').style.left=`${n/16*100}%`;
    $('#cut-feedback').textContent=cutCount>=16?'BIEN JOUÉ.':`${n} / 16 MÈCHES`;
    if(cutCount>=16 && !departTimer)departTimer=setTimeout(finishIntro,420);
  }
}
canvas.addEventListener('pointermove',(event)=>{
  cursor.style.transform=`translate(${event.clientX-17}px,${event.clientY-30}px)`;
  cursor.style.opacity=loaded?'1':'0';
  if(event.pointerType==='mouse'||touchDown)cutAt(event.clientX,event.clientY);
});
canvas.addEventListener('pointerdown',(event)=>{
  touchDown=true;lastPointer={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);
  cursor.style.transform=`translate(${event.clientX-17}px,${event.clientY-30}px)`;cursor.style.opacity='1';
  cutAt(event.clientX,event.clientY);
});
canvas.addEventListener('pointerup',()=>{touchDown=false;lastPointer=null;});
canvas.addEventListener('pointercancel',()=>{touchDown=false;lastPointer=null;cursor.style.opacity='0';});
canvas.addEventListener('pointerleave',()=>{lastPointer=null;cursor.style.opacity='0';});
function showIntro() {
  if(reduced)return;
  activeFocus=document.activeElement;departTimer=null;lastPointer=null;
  scrollTo({top:0,behavior:'instant'});
  introActive=true;entrance.hidden=false;entrance.classList.remove('departing');
  document.body.classList.add('intro-open');
  main.inert=true;header.inert=true;footer.inert=true;
  prepareHair();cancelAnimationFrame(hairFrame);lastHairTime=performance.now();hairFrame=requestAnimationFrame(paintHair);
  entrance.focus({preventScroll:true});
  if(loaded)readyToCut();
}
function readyToCut() {
  loaded=true;
  $('#intro-status').textContent='LE PREMIER COUP DE CISEAUX EST POUR VOUS.';
  $('#intro-instruction').textContent=matchMedia('(pointer:coarse)').matches?'Glissez le doigt dans les mèches pour entrer.':'Passez les ciseaux dans les mèches pour entrer.';
  $('#load-number').textContent='00';$('#load-label').textContent='MÈCHES';
  $('#load-fill').style.width='0%';$('.load-line svg').style.left='0%';$('#cut-feedback').textContent='';
}
function finishIntro() {
  if(!introActive)return;
  clearTimeout(departTimer);departTimer=null;
  entrance.classList.add('departing');cursor.style.opacity='0';
  main.inert=false;header.inert=false;footer.inert=false;
  document.body.classList.remove('intro-open');
  if(activeFocus && activeFocus!==document.body && activeFocus.isConnected)activeFocus.focus({preventScroll:true});
  else {main.focus({preventScroll:true});}
  setTimeout(()=>{entrance.hidden=true;introActive=false;cancelAnimationFrame(hairFrame);},reduced?0:1100);
  scheduleScroll();
}
$('#skip-intro').addEventListener('click',finishIntro);
$('#intro-brand').addEventListener('click',(e)=>{e.preventDefault();finishIntro();});
$('#replay-cut').addEventListener('click',()=>{if(reduced)setMotion(false);showIntro();});
entrance.addEventListener('keydown',(event)=>{
  if(event.key==='Escape'){event.preventDefault();finishIntro();}
  if(event.key==='Tab'){
    const first=$('#intro-brand'),last=$('#skip-intro');
    if(event.shiftKey && (document.activeElement===first || document.activeElement===entrance)){event.preventDefault();last.focus();}
    else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
  }
});
async function loadAssets() {
  let complete=0;
  const images=['./assets/hero.webp','./assets/beard.webp','./assets/kid.webp','./assets/salon.jpg'];
  const tasks=images.map(src=>new Promise(resolve=>{
    const img=new Image();img.onload=img.onerror=()=>{complete++;if(!loaded){const pct=Math.round(complete/5*100);$('#load-number').textContent=String(pct).padStart(2,'0');$('#load-fill').style.width=`${pct}%`;$('.load-line svg').style.left=`${pct}%`;}resolve();};img.src=src;
  }));
  tasks.push(document.fonts.ready.then(()=>{complete++;}));
  await Promise.all(tasks);
  readyToCut();scheduleScroll();
}
if(!reduced && !location.hash)showIntro();
void loadAssets();
renderScroll();
