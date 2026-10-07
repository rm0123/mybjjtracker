const DB_NAME='mybjj-db', STORE='sessions', META='meta';
let db, sessions=[], seed, displayMonth=new Date(), calendarMonth=new Date(), selectedDay=null;

const $=s=>document.querySelector(s);
const fmtH=n=>`${Number(Number(n||0).toFixed(2))} h`;
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parseDate=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const monthName=d=>d.toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
const shortMonth=d=>d.toLocaleDateString('fr-FR',{month:'short'}).replace('.','');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const palette=['#2563eb','#059669','#7c3aed','#d97706','#db2777','#0891b2','#4f46e5','#65a30d'];

function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=e=>{const d=e.target.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:'id'});if(!d.objectStoreNames.contains(META))d.createObjectStore(META,{keyPath:'key'})};req.onsuccess=e=>{db=e.target.result;resolve(db)};req.onerror=reject})}
function tx(store,mode='readonly'){return db.transaction(store,mode).objectStore(store)}
function getAll(){return new Promise((res,rej)=>{const r=tx(STORE).getAll();r.onsuccess=()=>res(r.result);r.onerror=rej})}
function putSession(s){return new Promise((res,rej)=>{const r=tx(STORE,'readwrite').put(s);r.onsuccess=res;r.onerror=rej})}
function delSession(id){return new Promise((res,rej)=>{const r=tx(STORE,'readwrite').delete(id);r.onsuccess=res;r.onerror=rej})}
function metaGet(key){return new Promise((res,rej)=>{const r=tx(META).get(key);r.onsuccess=()=>res(r.result?.value);r.onerror=rej})}
function metaPut(key,value){return new Promise((res,rej)=>{const r=tx(META,'readwrite').put({key,value});r.onsuccess=res;r.onerror=rej})}

async function init(){
 seed=await fetch('./data/initial-data.json').then(r=>r.json());
 await openDB();
 if(!(await metaGet('seeded'))){for(const s of seed.sessions)await putSession(s);await metaPut('monthlyGoal',seed.monthlyGoal||15);await metaPut('seeded',true)}
 sessions=await getAll();
 const latest=sessions.map(s=>s.date).sort().at(-1); if(latest){displayMonth=parseDate(latest);calendarMonth=parseDate(latest)}
 fillRefs(); bind(); renderAll();
 if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
}
function fillRefs(){
 const map={fType:'types',fProfessor:'professors',fAcademy:'academies',fGi:'gis',fIntensity:'intensities',fSlot:'slots'};
 Object.entries(map).forEach(([id,key])=>{$('#'+id).innerHTML=(seed.references[key]||[]).map(v=>`<option>${esc(v)}</option>`).join('')});
}
function inMonth(s,d){const x=parseDate(s.date);return x.getFullYear()===d.getFullYear()&&x.getMonth()===d.getMonth()}
function sum(arr){return arr.reduce((a,s)=>a+Number(s.duration||0),0)}
function group(arr,key){return arr.reduce((o,s)=>{const k=s[key]||'Non renseigné';o[k]??={hours:0,count:0};o[k].hours+=Number(s.duration||0);o[k].count++;return o},{})}
function rows(obj){return Object.entries(obj).sort((a,b)=>b[1].hours-a[1].hours).map(([k,v])=>`<div class="statrow"><span>${esc(k)}</span><b>${fmtH(v.hours)}</b><small>${v.count} séance${v.count>1?'s':''}</small></div>`).join('')||'<p class="muted">Aucune donnée.</p>'}

async function renderDashboard(){
 const ms=sessions.filter(s=>inMonth(s,displayMonth)), hours=sum(ms), goal=Number(await metaGet('monthlyGoal')||15);
 $('#monthTitle').textContent=monthName(displayMonth);$('#monthHours').textContent=fmtH(hours);$('#monthSessions').textContent=ms.length;$('#remaining').textContent=fmtH(Math.max(0,goal-hours));$('#allHours').textContent=fmtH(sum(sessions));
 const pct=goal?Math.round(hours/goal*100):0;$('#progressLabel').textContent=pct+' %';$('#progressBar').style.width=Math.min(pct,100)+'%';$('#goalText').textContent=`${fmtH(hours)} / ${fmtH(goal)}`;
 $('#typeStats').innerHTML=rows(group(sessions,'type'));$('#academyStats').innerHTML=rows(group(sessions,'academy'));
 const year=displayMonth.getFullYear(), vals=[];
 for(let m=0;m<12;m++){const d=new Date(year,m,1), a=sessions.filter(s=>inMonth(s,d));vals.push(sum(a))}
 const max=Math.max(...vals,1);$('#monthlyChart').innerHTML=vals.map((v,i)=>`<div class="barwrap"><div class="bar" style="height:${Math.max(2,v/max*120)}px" title="${v} h"></div>${shortMonth(new Date(year,i,1))}</div>`).join('');
}

function renderSessions(){
 const q=$('#search').value.toLowerCase().trim();const arr=[...sessions].sort((a,b)=>b.date.localeCompare(a.date)).filter(s=>!q||JSON.stringify(s).toLowerCase().includes(q));
 $('#sessionCount').textContent=`${sessions.length} séances · ${fmtH(sum(sessions))}`;
 $('#sessionList').innerHTML=arr.map(s=>`<article class="session" data-id="${esc(s.id)}"><div class="sessiontop"><div><h3>${parseDate(s.date).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</h3><p>${esc(s.type)} · ${esc(s.professor)} · ${esc(s.academy)}</p></div><b class="pill">${fmtH(Number(s.duration))}</b></div>${s.techniques?`<p>🥋 ${esc(s.techniques)}</p>`:''}${s.notes?`<p>${esc(s.notes)}</p>`:''}</article>`).join('');
 document.querySelectorAll('.session[data-id]').forEach(el=>el.onclick=()=>editSession(el.dataset.id));
}

function setCalendarPeriodStyle(){
 const bar=$('#calendarMonthBar'), now=new Date(), viewed=calendarMonth.getFullYear()*12+calendarMonth.getMonth(), current=now.getFullYear()*12+now.getMonth();
 bar.classList.remove('period-past','period-current','period-future');
 bar.classList.add(viewed<current?'period-past':viewed>current?'period-future':'period-current');
}
function renderCalendar(){
 $('#calTitle').textContent=monthName(calendarMonth);
 setCalendarPeriodStyle();
 const y=calendarMonth.getFullYear(),m=calendarMonth.getMonth(),today=ymd(new Date());
 const first=new Date(y,m,1),offset=(first.getDay()+6)%7,start=new Date(y,m,1-offset);
 let html='';
 for(let i=0;i<42;i++){
   const date=new Date(start);date.setDate(start.getDate()+i);
   const ds=ymd(date), daySessions=sessions.filter(s=>s.date===ds), hours=sum(daySessions);
   const other=date.getMonth()!==m, level=hours>2.25?3:hours>1.25?2:hours>0?1:0;
   const classes=['day'];
   if(other)classes.push('other-month');
   if(ds<today)classes.push('past-day'); else if(ds>today)classes.push('future-day');
   if(level)classes.push('activity-'+level);
   if(ds===today)classes.push('today');
   if(ds===selectedDay)classes.push('selected');
   html+=`<button class="${classes.join(' ')}" data-date="${ds}" data-other="${other?'1':'0'}"><span class="daynum">${date.getDate()}</span>${hours>0?`<div class="daymeta">🥋 ${fmtH(hours)}</div>`:''}</button>`;
 }
 $('#calendarGrid').innerHTML=html;
 document.querySelectorAll('.day[data-date]').forEach(b=>b.onclick=()=>{
   selectedDay=b.dataset.date;
   const d=parseDate(selectedDay);
   if(b.dataset.other==='1')calendarMonth=new Date(d.getFullYear(),d.getMonth(),1);
   renderCalendar();
   renderDay();
 });
 renderDay();
}
function renderDay(){
 if(!selectedDay){$('#daySessions').innerHTML='';return}
 const a=sessions.filter(s=>s.date===selectedDay);
 const title=parseDate(selectedDay).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 $('#daySessions').innerHTML=a.length?`<article class="panel"><h3>${title}</h3>${a.map(s=>`<div class="statrow"><span>${esc(s.type)} · ${esc(s.professor)}</span><b>${fmtH(Number(s.duration))}</b><small>${esc(s.academy)}</small></div>`).join('')}</article>`:`<article class="panel"><h3>${title}</h3><p class="muted">Aucune séance ce jour.</p></article>`;
}

function donutHTML(obj,maxSlices=5){
 let entries=Object.entries(obj).filter(([,v])=>v.hours>0).sort((a,b)=>b[1].hours-a[1].hours);
 if(!entries.length)return '<div class="emptychart">Aucune donnée pour le moment.</div>';
 if(entries.length>maxSlices){
   const keep=entries.slice(0,maxSlices-1), rest=entries.slice(maxSlices-1).reduce((a,[,v])=>({hours:a.hours+v.hours,count:a.count+v.count}),{hours:0,count:0});
   entries=[...keep,['Autres',rest]];
 }
 const total=entries.reduce((a,[,v])=>a+v.hours,0);let cursor=0;
 const stops=entries.map(([,v],i)=>{const start=cursor,end=cursor+(v.hours/total*100);cursor=end;return `${palette[i%palette.length]} ${start.toFixed(2)}% ${end.toFixed(2)}%`});
 const legend=entries.map(([k,v],i)=>`<div class="chartlegend-row"><i style="background:${palette[i%palette.length]}"></i><span>${esc(k)}</span><b>${Math.round(v.hours/total*100)}%</b></div>`).join('');
 return `<div class="donut-layout"><div class="donut" style="background:conic-gradient(${stops.join(',')})"><div class="donut-hole"><strong>${fmtH(total)}</strong><span>volume total</span></div></div><div class="chartlegend">${legend}</div></div>`;
}
function rankChartHTML(obj){
 const entries=Object.entries(obj).filter(([,v])=>v.hours>0).sort((a,b)=>b[1].hours-a[1].hours);
 if(!entries.length)return '<div class="emptychart">Aucune donnée pour le moment.</div>';
 const max=Math.max(...entries.map(([,v])=>v.hours),1);
 return entries.map(([k,v])=>`<div class="rankitem"><div class="rankhead"><span>${esc(k)}</span><b>${fmtH(v.hours)}</b></div><div class="ranktrack"><div class="rankfill" style="width:${Math.max(2,v.hours/max*100)}%"></div></div></div>`).join('');
}
function trendData(){
 const now=new Date(), out=[];
 for(let i=11;i>=0;i--){
   const d=new Date(now.getFullYear(),now.getMonth()-i,1);
   out.push({date:d,label:shortMonth(d),hours:sum(sessions.filter(s=>inMonth(s,d)))});
 }
 return out;
}
function trendHTML(data){
 if(!data.length)return '<div class="emptychart">Aucune donnée pour le moment.</div>';
 const W=700,H=230,L=34,R=14,T=22,B=38,innerW=W-L-R,innerH=H-T-B,max=Math.max(...data.map(x=>x.hours),1);
 const x=i=>L+(data.length===1?innerW/2:i*innerW/(data.length-1)), y=v=>T+innerH-(v/max*innerH);
 const coords=data.map((d,i)=>`${x(i).toFixed(1)},${y(d.hours).toFixed(1)}`);
 const points=coords.join(' ');
 const area=`M ${x(0).toFixed(1)} ${T+innerH} L ${coords.join(' L ')} L ${x(data.length-1).toFixed(1)} ${T+innerH} Z`;
 let grid='',labels='',dots='';
 for(let i=0;i<4;i++){const gy=T+(innerH*i/3),val=max*(1-i/3);grid+=`<line class="chart-gridline" x1="${L}" y1="${gy}" x2="${W-R}" y2="${gy}"/><text class="chart-axis-label" x="0" y="${gy+4}">${Number(val.toFixed(1))}</text>`}
 data.forEach((d,i)=>{labels+=`<text class="chart-axis-label" text-anchor="middle" x="${x(i)}" y="${H-12}">${d.label}</text>`;dots+=`<circle class="chart-point ${i===data.length-1?'current':''}" cx="${x(i)}" cy="${y(d.hours)}" r="5"><title>${monthName(d.date)} : ${fmtH(d.hours)}</title></circle>`});
 return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution des heures sur 12 mois"><defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#60a5fa" stop-opacity=".35"/><stop offset="100%" stop-color="#60a5fa" stop-opacity=".04"/></linearGradient></defs>${grid}<path class="chart-area" d="${area}"/><polyline class="chart-line" points="${points}"/>${dots}${labels}</svg>`;
}
function bestMonth(){
 const months={};
 sessions.forEach(s=>{const k=s.date.slice(0,7);months[k]=(months[k]||0)+Number(s.duration||0)});
 const best=Object.entries(months).sort((a,b)=>b[1]-a[1])[0];
 if(!best)return {label:'—',hours:0};
 const [y,m]=best[0].split('-').map(Number);
 return {label:new Date(y,m-1,1).toLocaleDateString('fr-FR',{month:'short',year:'2-digit'}).replace('.',''),hours:best[1]};
}
function renderStats(){
 const totalHours=sum(sessions), best=bestMonth();
 $('#statsHours').textContent=fmtH(totalHours);
 $('#statsSessions').textContent=sessions.length;
 $('#statsAverage').textContent=sessions.length?fmtH(totalHours/sessions.length):'0 h';
 $('#statsBestMonth').innerHTML=best.hours?`${esc(best.label)}<span class="muted" style="display:block;margin-top:3px">${fmtH(best.hours)}</span>`:'—';
 $('#statsTrend').innerHTML=trendHTML(trendData());
 $('#typeDonut').innerHTML=donutHTML(group(sessions,'type'),6);
 $('#academyDonut').innerHTML=donutHTML(group(sessions,'academy'),6);
 $('#profChart').innerHTML=rankChartHTML(group(sessions,'professor'));
 const cross={};sessions.forEach(s=>{const k=`${s.academy||'Non renseigné'} — ${s.professor||'Non renseigné'}`;cross[k]??={hours:0,count:0};cross[k].hours+=Number(s.duration||0);cross[k].count++});$('#crossStats').innerHTML=rows(cross);
}

function renderAll(){renderDashboard();renderSessions();renderCalendar();renderStats();$('#storageInfo').textContent=`${sessions.length} séances stockées localement · ${fmtH(sum(sessions))}`}
function showView(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id))}
function resetForm(){ $('#sessionForm').reset();$('#editId').value='';$('#formTitle').textContent='Nouvelle séance';$('#deleteBtn').classList.add('hidden');$('#fDate').value=ymd(new Date());$('#fDuration').value=1.5}
function editSession(id){const s=sessions.find(x=>x.id===id);if(!s)return;$('#editId').value=s.id;$('#formTitle').textContent='Modifier la séance';$('#deleteBtn').classList.remove('hidden');$('#fDate').value=s.date;$('#fDuration').value=s.duration;$('#fType').value=s.type;$('#fProfessor').value=s.professor;$('#fAcademy').value=s.academy;$('#fGi').value=s.gi;$('#fIntensity').value=s.intensity;$('#fSlot').value=s.slot;$('#fTechniques').value=s.techniques;$('#fNotes').value=s.notes;$('#sessionDialog').showModal()}
function bind(){
 document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>showView(b.dataset.view));
 $('#addBtn').onclick=()=>{resetForm();$('#sessionDialog').showModal()};$('#closeDialog').onclick=()=>$('#sessionDialog').close();
 $('#prevMonth').onclick=()=>{displayMonth=new Date(displayMonth.getFullYear(),displayMonth.getMonth()-1,1);renderDashboard()};$('#nextMonth').onclick=()=>{displayMonth=new Date(displayMonth.getFullYear(),displayMonth.getMonth()+1,1);renderDashboard()};
 $('#calPrev').onclick=()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);selectedDay=null;renderCalendar()};$('#calNext').onclick=()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);selectedDay=null;renderCalendar()};
 $('#search').oninput=renderSessions;
 $('#goalBtn').onclick=async()=>{const old=await metaGet('monthlyGoal')||15,n=prompt('Objectif mensuel en heures',old);if(n!==null&&!isNaN(Number(n))&&Number(n)>0){await metaPut('monthlyGoal',Number(n));renderDashboard()}};
 $('#sessionForm').onsubmit=async e=>{e.preventDefault();const id=$('#editId').value||crypto.randomUUID();const s={id,date:$('#fDate').value,duration:Number($('#fDuration').value),type:$('#fType').value,professor:$('#fProfessor').value,academy:$('#fAcademy').value,gi:$('#fGi').value,intensity:$('#fIntensity').value,slot:$('#fSlot').value,techniques:$('#fTechniques').value.trim(),notes:$('#fNotes').value.trim(),title:''};await putSession(s);sessions=await getAll();$('#sessionDialog').close();renderAll()};
 $('#deleteBtn').onclick=async()=>{const id=$('#editId').value;if(id&&confirm('Supprimer cette séance ?')){await delSession(id);sessions=await getAll();$('#sessionDialog').close();renderAll()}};
 $('#exportBtn').onclick=async()=>{const payload={app:'MyBJJ Tracker',version:1,exportedAt:new Date().toISOString(),monthlyGoal:await metaGet('monthlyGoal'),sessions};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`MyBJJ_backup_${ymd(new Date())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
 $('#importInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(!Array.isArray(data.sessions))throw Error('Format invalide');if(!confirm(`Importer ${data.sessions.length} séances ? Les données locales actuelles seront remplacées.`))return;await new Promise((res,rej)=>{const r=tx(STORE,'readwrite').clear();r.onsuccess=res;r.onerror=rej});for(const s of data.sessions)await putSession(s);if(data.monthlyGoal)await metaPut('monthlyGoal',data.monthlyGoal);sessions=await getAll();renderAll();alert('Import terminé.')}catch(err){alert('Impossible d’importer ce fichier JSON.')}finally{e.target.value=''}};
}
init();