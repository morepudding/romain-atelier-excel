import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'output');
fs.mkdirSync(OUT, { recursive: true });
for (const [file, family] of [['segoeui.ttf', 'Segoe'], ['segoeuil.ttf', 'Segoe Light'], ['segoeuib.ttf', 'Segoe Bold'], ['georgia.ttf', 'Georgia']]) {
  GlobalFonts.registerFromPath(`C:/Windows/Fonts/${file}`, family);
}
const W = 1440, H = 810, FPS = 30;
const canvas = createCanvas(1920, 1080);
const ctx = canvas.getContext('2d');
const C = { paper: '#fafcf8', ink: '#203b2e', green: '#217346', sage: '#e7efdf', muted: '#6b8065', cream: '#f5f7ed', amber: '#8b612c', amberBg: '#fff0d7', line: '#d5e0ca' };
const images = await Promise.all(['chantier-01.png','chantier-02.png'].map(f => loadImage(path.join(ROOT, 'assets', f))));
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp(x); return x*x*x*(x*(x*6-15)+10); };
const prog = (t,a,b) => smooth((t-a)/(b-a));
const mix = (a,b,p) => a+(b-a)*p;
const gate = (t,a,b,c,d) => prog(t,a,b)*(1-prog(t,c,d));
const tween = (a,b,p) => a.map((v,i) => mix(v,b[i],p));
const at = (t, keys) => {
  if(t<=keys[0][0]) return keys[0].slice(1);
  for(let i=1;i<keys.length;i++) if(t<=keys[i][0]) return tween(keys[i-1].slice(1),keys[i].slice(1),prog(t,keys[i-1][0],keys[i][0]));
  return keys.at(-1).slice(1);
};
function group(alpha, fn) { if(alpha < .001) return; ctx.save(); ctx.globalAlpha *= alpha; fn(); ctx.restore(); }
function pose(x,y,s,r,alpha,fn) { group(alpha,()=>{ctx.translate(x,y);ctx.scale(s,s);ctx.rotate(r*Math.PI/180);fn();}); }
function rr(x,y,w,h,r=10,fill=C.paper,stroke=null) { ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();} }
function line(x,y,x2,y2,color=C.line,width=1) {ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
function text(str,x,y,size=22,color=C.ink,font='Segoe',align='left') {ctx.font=`${size}px "${font}"`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='top';ctx.fillText(str,x,y);}
function lines(str,x,y,size,color,font='Segoe',leading=1.28,align='left'){str.split('\n').forEach((s,i)=>text(s,x,y+i*size*leading,size,color,font,align));}
function label(str,x,y,color=C.muted,size=12){text(str,x,y,size,color,'Segoe Bold');}
function shadow(fn, strength=.24) {ctx.save();ctx.shadowColor=`rgba(4,30,21,${strength})`;ctx.shadowBlur=32;ctx.shadowOffsetY=16;fn();ctx.restore();}
function card(x,y,w,h,fill=C.paper){shadow(()=>rr(x,y,w,h,11,fill,'#f2f7ed'));}
function badge(str,x,y,w,fill=C.sage,color=C.green,size=13){rr(x,y,w,28,14,fill);text(str,x+w/2,y+5,size,color,'Segoe', 'center');}
function icon(kind,x,y,color=C.green,s=1){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.7;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  if(kind==='voice'){ctx.roundRect(8,1,8,15,4);ctx.stroke();ctx.beginPath();ctx.moveTo(4,10);ctx.lineTo(4,13);ctx.bezierCurveTo(4,25,20,25,20,13);ctx.lineTo(20,10);ctx.moveTo(12,23);ctx.lineTo(12,28);ctx.moveTo(7,28);ctx.lineTo(17,28);}
  if(kind==='mail'){ctx.roundRect(1,5,24,18,3);ctx.moveTo(2,7);ctx.lineTo(13,15);ctx.lineTo(24,7);}
  if(kind==='photo'){ctx.roundRect(1,4,25,21,3);ctx.moveTo(3,23);ctx.lineTo(11,14);ctx.lineTo(16,19);ctx.lineTo(20,14);ctx.lineTo(25,21);ctx.moveTo(19,10);ctx.arc(17,10,2,0,Math.PI*2);}
  if(kind==='check'){ctx.moveTo(3,13);ctx.lineTo(9,19);ctx.lineTo(22,5);}
  if(kind==='doc'){ctx.moveTo(5,1);ctx.lineTo(18,1);ctx.lineTo(25,8);ctx.lineTo(25,29);ctx.lineTo(5,29);ctx.closePath();ctx.moveTo(17,1);ctx.lineTo(17,9);ctx.lineTo(25,9);ctx.moveTo(10,15);ctx.lineTo(20,15);ctx.moveTo(10,21);ctx.lineTo(20,21);}
  ctx.stroke();ctx.restore();
}
function photo(i,x,y,w,h,r=6){ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip();const im=images[i];const z=Math.max(w/im.width,h/im.height);ctx.drawImage(im,x+(w-im.width*z)/2,y+(h-im.height*z)/2,im.width*z,im.height*z);ctx.restore();}
function waveform(x,y,w,h,t,active=false){
  for(let i=0;i<49;i++){const a=.2+.8*Math.abs(Math.sin(i*1.67)*Math.sin(i*.46+.9));const pulse=active?(.7+.3*Math.sin(t*4-i*.22)):1;const bh=h*a*pulse;rr(x+i*w/49,y+(h-bh)/2,3,bh,2,active&&i<((t*12)%49)?'#78a486':C.green);}
}

// Fond repris de la démo des bougies, avec un déplacement très lent.
const wallpaper=createCanvas(1720,1050);const bg=wallpaper.getContext('2d');
let g=bg.createLinearGradient(0,0,1720,1050);g.addColorStop(0,'#102b28');g.addColorStop(.55,'#426b55');g.addColorStop(1,'#9da68a');bg.fillStyle=g;bg.fillRect(0,0,1720,1050);
function glow(x,y,rx,ry,color){bg.save();bg.translate(x,y);bg.scale(rx,ry);const z=bg.createRadialGradient(0,0,0,0,0,1);z.addColorStop(0,color);z.addColorStop(1,'transparent');bg.fillStyle=z;bg.fillRect(-1,-1,2,2);bg.restore();}
glow(340,1120,1050,900,'#dccaa7');glow(1370,0,920,810,'#449474');glow(80,210,740,730,'#1a6354');
function background(t){const u=Math.min(t,56);ctx.drawImage(wallpaper,-138+8*Math.sin(u/18),-118+7*Math.cos(u/22));ctx.save();ctx.strokeStyle='#effff01c';ctx.lineWidth=1;ctx.translate(990,-50);ctx.rotate(-.48);ctx.beginPath();ctx.ellipse(0,0,580,540,0,0,2*Math.PI);ctx.stroke();ctx.restore();}

function source(i,x,y,w,h,r,alpha,t,mode='compact'){
 pose(x,y,1,r,alpha,()=>{
  card(0,0,w,h);
  rr(0,0,w,45,10,i===2?'#eef2e7':'#f0f5eb');rr(0,25,w,20,0,i===2?'#eef2e7':'#f0f5eb');
  icon(['voice','photo','mail'][i],18,11,C.green,.72);text(['Message vocal · Équipe','Photos du chantier','Mail fournisseur'][i],46,13,15,C.ink,'Segoe');
  if(mode==='opening'){
   if(i===0){text('Maison Martin',22,70,26);waveform(24,116,w-48,48,t);text('Retour de chantier',23,188,17,C.muted);text('0:38',w-62,189,15,C.muted);}
   if(i===1){photo(0,17,62,(w-44)/2,151);photo(1,27+(w-44)/2,62,(w-44)/2,151);text('Entrée · 2 photos',20,228,16,C.muted);}
   if(i===2){text('Porte d’entrée',22,74,26);text('Suivi de livraison',22,118,18,C.muted);line(22,163,w-22,163);text('Un message à rapprocher',22,184,17,C.ink);text('du retour de l’équipe.',22,210,17,C.ink);}
  }else{
   if(i===0){waveform(21,60,w-95,34,t,t>10.8&&t<30);text('0:38',w-58,71,14,C.muted);text('Maison Martin · Retour du jour',20,111,17,C.ink);}
   if(i===1){photo(0,16,57,(w-43)/2,h-77);photo(1,27+(w-43)/2,57,(w-43)/2,h-77);}
   if(i===2){text('Porte d’entrée',21,62,21);text('Suivi de livraison',21,94,16,C.muted);}
  }
 });
}

const DEST={work:[796,326,516,49],issue:[796,396,516,46],action:[796,465,516,62],photo0:[796,552,249,102],photo1:[1063,552,249,102]};
function fieldGhost(x,y,w){rr(x,y,w,6,3,'#e4ebdf');rr(x,y+16,w*.58,6,3,'#edf1e9');}
function report(t,x=760,y=150,s=1,alpha=1){
 pose(x,y,s,0,alpha,()=>{
  card(0,0,590,620);rr(0,0,590,7,3,C.green);
  label('COMPTE RENDU DE CHANTIER',36,27);text('Maison Martin',36,49,34);
  const draft=t>=40.35?1:0;
  group(1-draft,()=>text(t<11?'Modèle de l’entreprise':'Préparation en cours',36,99,15,C.muted));
  group(draft,()=>badge('Brouillon · À relire',36,95,171,'#edf2e7',C.ink,14));
  text('MM / 01',551,41,11,C.muted,'Segoe Bold','right');line(36,135,554,135);
  label('TRAVAUX RÉALISÉS',36,152);
  const work=t>=18.05?1:0;group(1-work,()=>fieldGhost(36,185,320));
  group(work,()=>{text('Cloisons de l’entrée posées',36,180,22);});
  label('POINTS À SUIVRE',36,221);
  const issue=t>=26.65?1:0;group(1-issue,()=>fieldGhost(36,255,280));group(issue,()=>text('Porte d’entrée non reçue',36,250,22));
  label('ACTIONS',36,290);
  const action=t>=29.15?1:0;group(1-action,()=>fieldGhost(36,326,355));group(action,()=>lines('Confirmer la livraison avant\nde programmer la pose',36,319,22,C.ink,'Segoe',1.22));
  label('PHOTOS DU CHANTIER',36,379);
  for(let i=0;i<2;i++){
   const a=prog(t,20.3+i*1.45,20.75+i*1.45);const px=36+i*267;
   group(1-a,()=>{rr(px,402,249,102,6,'#eef2e9',C.line);icon('photo',px+109,435,'#a0b196',1);});
   group(a,()=>{photo(i,px,402,249,102);text(i?'02 · Cloisons de l’entrée':'01 · Vue de l’entrée',px,512,12,C.muted);});
  }
  const confirm=t>=41.6?1:0;
  group(confirm,()=>{
   rr(25,545,540,57,7,C.amberBg,'#e3cb9e');rr(25,545,4,57,2,'#bd9255');
   text('1 point à confirmer : la date de livraison',42,552,15,C.amber);
   text('Livraison : à confirmer',42,575,20,C.amber,'Segoe Bold');
  });
  const btn=gate(t,7.5,8.2,11.1,11.65);
  group(btn,()=>{rr(25,545,540,57,7,C.green);icon('doc',49,561,'#fff',.75);text('Préparer le compte rendu',301,559,23,'#fff','Segoe','center');});
 });
}

function flyToken(t,start,end,from,to,sourceLines,resultLines,{size=26,fill=C.sage,color=C.ink}={}){
 if(t<start||t>end)return;
 const p=prog(t,start,end),curve=Math.sin(Math.PI*p)*-45;
 const [x,y,w,h]=tween(from,to,p);shadow(()=>rr(x,y+curve,w,h,8,fill,'#b4cba4'),.16);
 ctx.save();ctx.beginPath();ctx.roundRect(x,y+curve,w,h,8);ctx.clip();
 group(1-prog(p,.22,.35),()=>lines(sourceLines,x+16,y+curve+12,mix(size,22,p),color,'Segoe',1.2));
 group(prog(p,.36,.48),()=>lines(resultLines,x+mix(16,0,p),y+curve+mix(12,4,p),mix(size,22,p),color,'Segoe',1.22));
 ctx.restore();
}
function quote(t,which,alpha){
 group(alpha,()=>{
  card(105,258,530,which===1?270:224);icon('voice',126,280,C.green,.8);label('MESSAGE VOCAL · ÉQUIPE',160,284);
  waveform(129,319,475,25,t,true);
  const moving=which===0?prog(t,15.2,15.7):prog(t,25.05,25.45);
  group(1-moving*.8,()=>{
   if(which===0){rr(124,362,492,99,7,C.sage);lines('Les cloisons de l’entrée\nsont posées.',140,378,29,C.ink,'Segoe',1.27);}
   else {lines('La porte n’est pas arrivée.',129,364,26,C.ink);lines('Il faut confirmer la livraison\navant de caler la pose.',129,407,26,C.ink,'Segoe',1.24);}
  });
 });
}

function cursor(t){
 const a=gate(t,9.4,9.65,11.15,11.4);if(!a)return;
 const p=prog(t,9.45,10.45),x=mix(1405,1137,p),y=mix(818,727,p),click=prog(t,10.65,10.82)*(1-prog(t,10.82,11));
 group(a,()=>{ctx.save();ctx.translate(x,y);ctx.scale(1-click*.17,1-click*.17);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(6,29);ctx.lineTo(13,22);ctx.lineTo(19,32);ctx.lineTo(24,29);ctx.lineTo(18,19);ctx.lineTo(28,18);ctx.closePath();ctx.fillStyle='#183629';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.restore();});
 group(gate(t,10.7,10.74,11.1,11.35),()=>{ctx.strokeStyle='#eaf7dc';ctx.lineWidth=2*(1-prog(t,10.7,11.35));ctx.beginPath();ctx.arc(x+3,y+3,8+39*prog(t,10.7,11.35),0,Math.PI*2);ctx.stroke();});
}

function openingAndTransform(t){
 const settle=prog(t,5.7,8.0);
 const cam=at(t,[[0,1,0,0],[11.8,1,0,0],[13,1.23,-90,-78],[15.2,1.23,-90,-78],[18.1,1.26,-485,-73],[18.6,1.26,-485,-73],[19.45,1,0,0],[22.6,1,0,0],[23.65,1.18,-70,-80],[25.25,1.18,-70,-80],[29.15,1.22,-410,-94],[29.7,1.22,-410,-94],[30.9,1,0,0]]);
 pose(cam[1],cam[2],cam[0],0,1,()=>{
  const focus0=gate(t,11.9,12.6,17.55,18.5),focus1=gate(t,22.65,23.45,28.6,29.8);
  const heading=1-prog(t,5.6,6.6);
  group(heading,()=>{label('MAISON MARTIN · RETOUR DE CHANTIER',105,132,'#d5e6d1',13);lines('La journée se termine.\nLe compte rendu commence.',105,168,51,C.cream,'Segoe Light',1.08);});
  group(gate(t,6.4,7.2,11.5,12.1),()=>{label('VOTRE FAÇON DE TRAVAILLER',105,145,'#d5e6d1',12);lines('Votre modèle.\nVos rubriques.',105,178,41,C.cream,'Segoe Light',1.12);});
  group(gate(t,12,12.7,15.1,15.65),()=>label('DU VOCAL AU COMPTE RENDU',105,200,'#e4edd9',13));
  group(gate(t,19,19.5,22.2,22.8),()=>{label('LES MÊMES PHOTOS',105,154,'#d5e6d1',13);text('Au bon endroit.',105,184,42,C.cream,'Segoe Light');});
  group(gate(t,23,23.5,25.2,25.8),()=>label('LE POINT À SUIVRE. PUIS L’ACTION.',105,196,'#e4edd9',13));
  // Les cartes d’ouverture deviennent le rail de sources, sans coupe.
  const positions=[[105,354,355,267,-2],[549,378,355,280,1.5],[990,348,355,267,-1.3]];
  const targets=[[105,288,405,152,0],[105,460,405,165,0],[105,648,405,126,0]];
  for(let i=0;i<3;i++){
   const p=tween(positions[i],targets[i],settle),arrive=prog(t,.4+i*.58,1.8+i*.58);
   const dim=i===0?1-Math.max(focus0,focus1):1-.68*Math.max(focus0,focus1);
   pose(p[0],p[1]+(1-arrive)*75,1,p[4]*(1-settle),arrive*dim,()=>{
    source(i,0,0,p[2],p[3],0,1,t,settle<.55?'opening':'compact');
   });
  }
  report(t,mix(1550,760,settle),150,1,settle);
  quote(t,0,focus0);quote(t,1,focus1);
  // Une seule information reste au premier plan pendant son transfert.
  flyToken(t,15.25,18.05,[124,362,492,99],DEST.work,'Les cloisons de l’entrée\nsont posées.','Cloisons de l’entrée posées',{size:29});
  for(let i=0;i<2;i++){
   const a=19.4+i*1.45,b=20.75+i*1.45;
   if(t>=a&&t<=b){const p=prog(t,a,b);const start=[121+i*191,517,181,88],end=DEST['photo'+i];const q=tween(start,end,p);q[1]-=Math.sin(p*Math.PI)*68;
    shadow(()=>rr(q[0]-4,q[1]-4,q[2]+8,q[3]+8,8,C.paper),.22);photo(i,...q);
   }
  }
  flyToken(t,25.1,26.65,[129,360,480,54],DEST.issue,'La porte n’est pas arrivée.','Porte d’entrée non reçue',{size:26,fill:'#fff0d7'});
  flyToken(t,27.05,29.15,[129,406,480,82],DEST.action,'Il faut confirmer la livraison\navant de caler la pose.','Confirmer la livraison avant\nde programmer la pose',{size:26});
  cursor(t);
 });
}

function dateChip(word,source,x,y,w=350,h=80,alpha=1){group(alpha,()=>{rr(x,y,w,h,8,C.amberBg,'#e3cb9e');label(source,x+17,y+10,C.amber,11);text(word,x+17,y+30,35,C.amber,'Segoe Bold');});}
function conflict(t){
 const enter=prog(t,29.7,31.15),leave=prog(t,39.55,40.5);
 const voice=tween([-281.9,257.36,494.1,185.44],[185,235,495,239],enter);
 const mail=tween([-281.9,696.56,494.1,153.72],[760,235,495,239],enter);
 if(t<31.15){
  report(t,mix(517.2,1560,enter),mix(89,150,enter),mix(1.22,.94,enter),1);
  source(1,mix(-281.9,-720,enter),467.2,494.1,201.3,0,1,t);
 }
 const q1=tween(voice,[-560,235,495,239],leave),q2=tween(mail,[1510,235,495,239],leave);
 group(1,()=>{
  group(prog(t,30.75,31.35)*(1-prog(t,39.15,39.65)),()=>{label('PORTE D’ENTRÉE · LIVRAISON',185,133,'#e5ddc3',13);text('Une contradiction à garder visible.',185,167,40,C.cream,'Segoe Light');});
  for(const [i,p] of [[0,q1],[2,q2]]){
   card(...p);icon(i===0?'voice':'mail',p[0]+24,p[1]+24,C.green,.85);label(i===0?'MESSAGE VOCAL · ÉQUIPE':'MAIL FOURNISSEUR',p[0]+61,p[1]+32,C.muted,13);
   const a=prog(t,30.75,31.4);
   group(a,()=>{text(i===0?'« La livraison est prévue jeudi. »':'« Livraison prévue vendredi. »',p[0]+24,p[1]+80,23);});
   const datesOut=prog(t,34.8,36.7);
   dateChip(i===0?'JEUDI':'VENDREDI',i===0?'ANNONCÉ PAR L’ÉQUIPE':'ANNONCÉ PAR LE FOURNISSEUR',p[0]+24,p[1]+128,p[2]-48,84,a*(1-datesOut));
  }
  const panel=prog(t,34.35,35.2),transfer=prog(t,39.9,41.6);
  const z=tween([370,515,700,162],[505.5,666.9,550.8,58.14],transfer);
  group(panel,()=>{shadow(()=>rr(...z,11,'#fffaf0','#e8d2a4'));});
  group(panel*(1-prog(t,39.35,39.9)),()=>text('Date de livraison à confirmer',401,532,28,C.amber,'Segoe'));
  for(let i=0;i<2;i++){
   const p=prog(t,34.8,36.7),from=[i?784:209,363,447,84],to=[401+i*333,580,302,70];
   const z=tween(from,to,p);z[1]-=Math.sin(p*Math.PI)*38;
   if(t>=34.8)group(panel*(1-prog(t,39.35,39.9)),()=>{rr(z[0],z[1],z[2],z[3],7,C.amberBg,'#e3cb9e');label(i?'MAIL FOURNISSEUR':'VOCAL ÉQUIPE',z[0]+16,z[1]+9,C.amber,11);text(i?'VENDREDI':'JEUDI',z[0]+16,z[1]+27,mix(35,28,p),C.amber,'Segoe Bold');});
  }
  group(gate(t,32.0,32.6,39.2,39.7),()=>{
   text('Deux dates différentes.',720,701,25,C.cream,'Segoe','center');
   text('Aucune n’est choisie à votre place.',720,737,27,C.cream,'Segoe','center');
  });
  group(prog(t,39.95,40.2),()=>{
   text('Livraison : à confirmer',z[0]+26,z[1]+mix(60,27,transfer),mix(32,20.4,transfer),C.amber,'Segoe Bold');
   group(prog(t,41.1,41.6),()=>text('1 point à confirmer : la date de livraison',z[0]+17,z[1]+7,15.3,C.amber));
  });
 });
}

function result(t){
 const appear=1;
 const pos=at(t,[[40.35,1460,111,1.02],[41.6,480,111,1.02],[43.4,480,111,1.02],[44.8,698,117,1.02],[48.3,698,117,1.02],[51.2,780,174,.94],[53,780,174,.94],[54,858,190,.85]]);
 report(t,pos[0],pos[1],pos[2],appear);
 group(gate(t,43.5,44.6,48.7,49.5),()=>{
  label('PRÊT À RELIRE',105,247,'#d5e6d1',13);
  lines('Un document\npréparé.',105,287,46,C.cream,'Segoe Light',1.12);
  lines('Vous gardez\nla main.',105,430,46,C.cream,'Segoe Light',1.12);
 });
 const overview=prog(t,49,51);
 group(overview,()=>{
  label('VOS SOURCES',105,159,'#e1ebd6',13);label('VOTRE COMPTE RENDU',780,134,'#e1ebd6',13);
  source(0,105,200,405,152,0,1,t);source(1,105,373,405,165,0,1,t);source(2,105,559,405,126,0,1,t);
  line(555,445,708,445,'#d7e6c580',1.5);ctx.strokeStyle='#d7e6c580';ctx.beginPath();ctx.moveTo(697,438);ctx.lineTo(708,445);ctx.lineTo(697,452);ctx.stroke();
  text('Préparé pour votre relecture.',105,724,26,C.cream,'Segoe Light');
 });
}

function closing(t){
 const a=prog(t,52.65,53.7),p=prog(t,54.5,55.95);
 group(a,()=>{
  const y=mix(257,173,p),size=mix(55,51,p);
  text('VOTRE MODÈLE. VOTRE MÉTIER.',720,y-48,13,'#d5e6d1','Segoe Bold','center');
  lines('Votre modèle est déjà prêt.\nLa préparation aussi.',720,y,size,C.cream,'Segoe Light',1.14,'center');
  group(p,()=>{
   line(572,370,868,370,'#d4e5c845');
   text('r.',512,420,82,C.cream,'Georgia');
   text('Romain',603,431,34,C.cream,'Segoe');
   text('Automatisations sur mesure',604,477,22,'#d2e3c4');
   text('Montrez-moi votre façon de travailler.',720,585,32,C.cream,'Segoe','center');
  });
 });
}

function frame(time){
 const t=Math.min(time,56);
 ctx.resetTransform();ctx.clearRect(0,0,1920,1080);ctx.scale(4/3,4/3);background(t);
 if(t<29.7)openingAndTransform(t);
 if(t>=40.35&&t<54)group(1-prog(t,52.7,54),()=>result(t));
 if(t>=29.7&&t<41.6)conflict(t);
 if(t>=52.65)closing(t);
 // Le marquage reste à l’écran, y compris pendant la signature fixe.
 const top=1-prog(t,53.6,55.0);
 group(top,()=>{text('r.',38,27,32,C.cream,'Georgia');label('VOS FICHIERS. VOS RÈGLES.',86,40,C.cream,12);});
 group(top,()=>{const chapter=t<6?'01 / LE RETOUR DE CHANTIER':t<12?'02 / VOTRE MODÈLE':t<23?'03 / LES INFORMATIONS SE RANGENT':t<30?'04 / LA SUITE SE PRÉPARE':t<41?'05 / LA DATE À CONFIRMER':'06 / PRÊT À RELIRE';text(chapter,1398,42,10,'#e0ebd4aa','Segoe','right');});
 const footer=ctx.createLinearGradient(0,770,0,810);footer.addColorStop(0,'#203b2e00');footer.addColorStop(1,'#203b2eaa');ctx.fillStyle=footer;ctx.fillRect(0,770,1440,40);
 text('Démonstration simulée · Données et règles fictives',34,786,11,'#f3f7e7cc');
}

const args=process.argv.slice(2);
if(args[0]==='stills'){
 const times=args.length>1?args.slice(1).map(Number):[0,3.5,8.7,10.8,13.8,16.7,18.2,20,21.6,24.5,26.2,28.3,31.8,34,36.8,40.7,42.5,46,51.8,54,56,59.9];
 for(const t of times){frame(t);fs.writeFileSync(path.join(OUT,`frame-${t.toFixed(2)}.png`),canvas.toBuffer('image/png'));}
 console.log(`Images rendues : ${times.join(', ')}`);
}else{
 const ffmpeg=process.env.FFMPEG_PATH || 'ffmpeg';
 const dest=path.join(OUT,'Maison-Martin_60s_Full-HD.mp4');
 const start=args[0]==='preview'?Number(args[1]||0):0;
 const duration=args[0]==='preview'?Number(args[2]||6):60;
 const name=args[0]==='preview'?path.join(OUT,`preview-${start}.mp4`):dest;
 const sound=path.join(ROOT,'sound.wav');
 const enc=spawn(ffmpeg,['-y','-hide_banner','-loglevel','warning','-f','rawvideo','-pixel_format','rgba','-video_size','1920x1080','-framerate',String(FPS),'-i','pipe:0','-ss',String(start),'-i',sound,'-map','0:v','-map','1:a','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-r',String(FPS),'-af','volume=14dB','-c:a','aac','-b:a','192k','-t',String(duration),'-movflags','+faststart','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-metadata','title=Maison Martin — Du chantier au compte rendu','-metadata','comment=Démonstration simulée · Données et règles fictives',name],{windowsHide:true,stdio:['pipe','ignore','pipe']});
 let errors='';enc.stderr.on('data',c=>errors+=c.toString());enc.stdin.on('error',e=>console.error('Encodeur:',e.message));
 const done=once(enc,'close');
 for(let n=0;n<duration*FPS;n++){
  frame(start+n/FPS);const data=ctx.getImageData(0,0,1920,1080).data;
  if(!enc.stdin.write(data))await once(enc.stdin,'drain');
  if(n%150===0)console.log(`Rendu ${n/FPS} / ${duration} s`);
 }
 enc.stdin.end();const [code]=await done;if(code)throw new Error(errors);console.log(`MP4 terminé : ${name}`);
}
