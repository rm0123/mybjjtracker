const DB_NAME='mybjj-db-staging', STORE='sessions', META='meta';
let db, sessions=[], seed;
let displayMonth=new Date(), calendarMonth=new Date(), selectedDay=null;
let sessionFilter='all', techCategoryFilter='all', previousView='dashboard';

const $=s=>document.querySelector(s);
const fmtH=n=>`${Number(Number(n||0).toFixed(2))} h`;
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parseDate=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d)};
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

function isPlanned(s){return s.status==='planned'}
function isCompleted(s){return !isPlanned(s)}
function completed(){return sessions.filter(isCompleted)}
function planned(){return sessions.filter(isPlanned)}
function inMonth(s,d){const x=parseDate(s.date);return x.getFullYear()===d.getFullYear()&&x.getMonth()===d.getMonth()}
function sum(arr){return arr.reduce((a,s)=>a+Number(s.duration||0),0)}
function sumSparring(arr){return arr.reduce((a,s)=>a+Number(s.sparringDuration||0),0)}
function group(arr,key){return arr.reduce((o,s)=>{const k=s[key]||'Non renseigné';o[k]??={hours:0,count:0};o[k].hours+=Number(s.duration||0);o[k].count++;return o},{})}
function pct(value,target){return target>0?Math.min(100,Math.round(value/target*100)):0}
function rows(obj){return Object.entries(obj).sort((a,b)=>b[1].hours-a[1].hours).map(([k,v])=>`<div class="statrow"><span>${esc(k)}</span><b>${fmtH(v.hours)}</b><small>${v.count} séance${v.count>1?'s':''}</small></div>`).join('')||'<p class="muted">Aucune donnée.</p>'}

async function ensureMeta(){
 if((await metaGet('monthlyGoal'))==null) await metaPut('monthlyGoal',15);
 if((await metaGet('techniqueProgress'))==null) await metaPut('techniqueProgress',{});
 const presetVersion=Number(await metaGet('roadTargetsPresetVersion')||0);
 if(presetVersion!==ROAD_TARGET_PRESET_VERSION){
   await metaPut('roadTargets',[...DEFAULT_ROAD_TARGETS]);
   await metaPut('roadTargetsPresetVersion',ROAD_TARGET_PRESET_VERSION);
 }
 if((await metaGet('roadmap'))==null) await metaPut('roadmap',{
   targetBelt:'Ceinture bleue',
   tatamiTarget:200,
   sparringTarget:60,
   tatamiBaseline:0,
   sparringBaseline:0
 });
}

async function init(){
 seed=await fetch('./data/initial-data.json').then(r=>r.json());
 await openDB();
 if(!(await metaGet('seeded'))){
   for(const s of seed.sessions) await putSession({...s,status:s.status||'completed',sparringDuration:Number(s.sparringDuration||0)});
   await metaPut('seeded',true);
 }
 await ensureMeta();
 sessions=await getAll();
 displayMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
 calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
 await fillRefs();bind();await renderAll();
 if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js?v=4');
}

async function fillRefs(){
 const customProfessors=await metaGet('customProfessors')||[];
 const customAcademies=await metaGet('customAcademies')||[];
 const refs={...seed.references,
   types:[...new Set([...(seed.references.types||[]),'Stage'])],
   professors:[...new Set([...(seed.references.professors||[]),...customProfessors])],
   academies:[...new Set([...(seed.references.academies||[]),...customAcademies])]
 };
 const map={fType:'types',fProfessor:'professors',fAcademy:'academies',fGi:'gis',fIntensity:'intensities',fSlot:'slots'};
 Object.entries(map).forEach(([id,key])=>{$('#'+id).innerHTML=(refs[key]||[]).map(v=>`<option>${esc(v)}</option>`).join('')});
}

async function renderDashboard(){
 const goal=Number(await metaGet('monthlyGoal')||15);
 const doneMonth=completed().filter(s=>inMonth(s,displayMonth));
 const planMonth=planned().filter(s=>inMonth(s,displayMonth));
 const actual=sum(doneMonth), potential=sum(planMonth), remaining=Math.max(0,goal-actual);
 $('#monthTitle').textContent=monthName(displayMonth);
 $('#monthHours').textContent=fmtH(actual);
 $('#monthSessions').textContent=doneMonth.length;
 $('#remaining').textContent=fmtH(remaining);
 $('#monthPotential').textContent=fmtH(potential);
 $('#allHours').textContent=fmtH(sum(completed()));
 const actualPct=Math.min(100,(actual/goal)*100||0);
 $('#goalActualBar').style.width=actualPct+'%';
 $('#progressLabel').textContent=`${Math.round(actual/goal*100||0)}%`;
 $('#goalText').textContent=`${fmtH(actual)} / ${fmtH(goal)} · reste ${fmtH(remaining)}`;
 $('#typeStats').innerHTML=rows(group(completed(),'type'));
 $('#academyStats').innerHTML=rows(group(completed(),'academy'));

 const year=displayMonth.getFullYear(), vals=[];
 for(let m=0;m<12;m++){
   const d=new Date(year,m,1);
   vals.push({actual:sum(completed().filter(s=>inMonth(s,d))),planned:sum(planned().filter(s=>inMonth(s,d)))});
 }
 const max=Math.max(...vals.map(v=>v.actual+v.planned),1);
 $('#monthlyChart').innerHTML=vals.map((v,i)=>{
   const actualH=v.actual/max*126, plannedH=v.planned/max*126;
   return `<div class="barwrap"><div class="stackedbar" title="${fmtH(v.actual)} réalisées + ${fmtH(v.planned)} potentielles"><div class="baractual" style="height:${actualH}px"></div><div class="barplanned" style="height:${plannedH}px"></div></div>${shortMonth(new Date(year,i,1))}</div>`
 }).join('');
}

function renderSessions(){
 const q=$('#search').value.toLowerCase().trim();
 let arr=[...sessions].sort((a,b)=>b.date.localeCompare(a.date));
 if(sessionFilter==='completed')arr=arr.filter(isCompleted);
 if(sessionFilter==='planned')arr=arr.filter(isPlanned);
 arr=arr.filter(s=>!q||JSON.stringify(s).toLowerCase().includes(q));
 $('#sessionCount').textContent=`${completed().length} réalisées · ${planned().length} planifiées`;
 $('#sessionList').innerHTML=arr.map(s=>{
   const plannedState=isPlanned(s);
   const status=plannedState?'Planifiée':'Réalisée';
   const extra=Number(s.sparringDuration||0)>0?` · sparring ${fmtH(Number(s.sparringDuration))}`:'';
   return `<article class="session ${plannedState?'planned':'completed'}" data-id="${esc(s.id)}"><div class="sessiontop"><div><h3>${parseDate(s.date).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</h3><p>${esc(s.type)} · ${esc(s.professor)} · ${esc(s.academy)}</p></div><b class="pill ${plannedState?'planned':'completed'}">${status} · ${fmtH(Number(s.duration))}</b></div><p>${extra?extra.slice(3):''}</p>${s.techniques?`<p>🥋 ${esc(s.techniques)}</p>`:''}${s.notes?`<p>${esc(s.notes)}</p>`:''}</article>`
 }).join('')||'<div class="emptychart">Aucune séance dans ce filtre.</div>';
 document.querySelectorAll('.session[data-id]').forEach(el=>el.onclick=()=>editSession(el.dataset.id));
}

function setCalendarPeriodStyle(){
 const bar=$('#calendarMonthBar'),now=new Date(),viewed=calendarMonth.getFullYear()*12+calendarMonth.getMonth(),current=now.getFullYear()*12+now.getMonth();
 bar.classList.remove('period-past','period-current','period-future');
 bar.classList.add(viewed<current?'period-past':viewed>current?'period-future':'period-current');
}

function renderCalendar(){
 $('#calTitle').textContent=monthName(calendarMonth);setCalendarPeriodStyle();
 const y=calendarMonth.getFullYear(),m=calendarMonth.getMonth(),today=ymd(new Date());
 const first=new Date(y,m,1),offset=(first.getDay()+6)%7,start=new Date(y,m,1-offset);
 let html='';
 for(let i=0;i<42;i++){
   const date=new Date(start);date.setDate(start.getDate()+i);
   const ds=ymd(date),all=sessions.filter(s=>s.date===ds);
   const done=all.filter(isCompleted),plan=all.filter(isPlanned);
   const actual=sum(done),plannedHours=sum(plan);
   const other=date.getMonth()!==m;
   const level=actual>=2?3:actual>=1?2:actual>0?1:0;
   const classes=['day'];
   if(other)classes.push('other-month');
   if(ds<today)classes.push('past-day');else if(ds>today)classes.push('future-day');
   if(level)classes.push('activity-'+level);
   if(plannedHours>0)classes.push('planned-day');
   if(actual>0&&plannedHours>0)classes.push('mixed-day');
   if(ds===today)classes.push('today');
   if(ds===selectedDay)classes.push('selected');
   const meta=[actual>0?`<span>🥋 ${fmtH(actual)}</span>`:'',plannedHours>0?`<span>🗓 ${fmtH(plannedHours)}</span>`:''].join('');
   html+=`<button class="${classes.join(' ')}" data-date="${ds}" data-other="${other?'1':'0'}"><span class="daynum">${date.getDate()}</span><div class="daymeta">${meta}</div></button>`;
 }
 $('#calendarGrid').innerHTML=html;
 document.querySelectorAll('.day[data-date]').forEach(b=>b.onclick=()=>{
   selectedDay=b.dataset.date;
   const d=parseDate(selectedDay);
   if(b.dataset.other==='1')calendarMonth=new Date(d.getFullYear(),d.getMonth(),1);
   renderCalendar();renderDay();
 });
 renderDay();
}

function renderDay(){
 if(!selectedDay){$('#daySessions').innerHTML='';return}
 const arr=sessions.filter(s=>s.date===selectedDay);
 const title=parseDate(selectedDay).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 $('#daySessions').innerHTML=arr.length?`<article class="panel"><h3>${title}</h3>${arr.map(s=>`<div class="statrow"><span>${isPlanned(s)?'🗓':'🥋'} ${esc(s.type)} · ${esc(s.professor)}</span><b>${fmtH(Number(s.duration))}</b><small>${isPlanned(s)?'Planifiée':esc(s.academy)}</small></div>`).join('')}</article>`:`<article class="panel"><h3>${title}</h3><p class="muted">Aucune séance ce jour.</p></article>`;
}

function donutHTML(obj,maxSlices=5){
 let entries=Object.entries(obj).filter(([,v])=>v.hours>0).sort((a,b)=>b[1].hours-a[1].hours);
 if(!entries.length)return '<div class="emptychart">Aucune donnée pour le moment.</div>';
 if(entries.length>maxSlices){
   const keep=entries.slice(0,maxSlices-1),rest=entries.slice(maxSlices-1).reduce((a,[,v])=>({hours:a.hours+v.hours,count:a.count+v.count}),{hours:0,count:0});
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
 const now=new Date(),out=[];
 for(let i=11;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);out.push({date:d,label:shortMonth(d),hours:sum(completed().filter(s=>inMonth(s,d)))})}
 return out;
}

function trendHTML(data){
 if(!data.length)return '<div class="emptychart">Aucune donnée pour le moment.</div>';
 const W=700,H=230,L=34,R=14,T=22,B=38,innerW=W-L-R,innerH=H-T-B,max=Math.max(...data.map(x=>x.hours),1);
 const x=i=>L+(data.length===1?innerW/2:i*innerW/(data.length-1)),y=v=>T+innerH-(v/max*innerH);
 const coords=data.map((d,i)=>`${x(i).toFixed(1)},${y(d.hours).toFixed(1)}`),points=coords.join(' ');
 const area=`M ${x(0).toFixed(1)} ${T+innerH} L ${coords.join(' L ')} L ${x(data.length-1).toFixed(1)} ${T+innerH} Z`;
 let grid='',labels='',dots='';
 for(let i=0;i<4;i++){const gy=T+(innerH*i/3),val=max*(1-i/3);grid+=`<line class="chart-gridline" x1="${L}" y1="${gy}" x2="${W-R}" y2="${gy}"/><text class="chart-axis-label" x="0" y="${gy+4}">${Number(val.toFixed(1))}</text>`}
 data.forEach((d,i)=>{labels+=`<text class="chart-axis-label" text-anchor="middle" x="${x(i)}" y="${H-12}">${d.label}</text>`;dots+=`<circle class="chart-point ${i===data.length-1?'current':''}" cx="${x(i)}" cy="${y(d.hours)}" r="5"><title>${monthName(d.date)} : ${fmtH(d.hours)}</title></circle>`});
 return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution des heures sur 12 mois"><defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#60a5fa" stop-opacity=".35"/><stop offset="100%" stop-color="#60a5fa" stop-opacity=".04"/></linearGradient></defs>${grid}<path class="chart-area" d="${area}"/><polyline class="chart-line" points="${points}"/>${dots}${labels}</svg>`;
}

function bestMonth(){
 const months={};completed().forEach(s=>{const k=s.date.slice(0,7);months[k]=(months[k]||0)+Number(s.duration||0)});
 const best=Object.entries(months).sort((a,b)=>b[1]-a[1])[0];
 if(!best)return {label:'—',hours:0};
 const [y,m]=best[0].split('-').map(Number);return {label:new Date(y,m-1,1).toLocaleDateString('fr-FR',{month:'short',year:'2-digit'}).replace('.',''),hours:best[1]};
}

function renderStats(){
 const done=completed(),totalHours=sum(done),best=bestMonth();
 $('#statsHours').textContent=fmtH(totalHours);$('#statsSessions').textContent=done.length;$('#statsAverage').textContent=done.length?fmtH(totalHours/done.length):'0 h';
 $('#statsBestMonth').innerHTML=best.hours?`${esc(best.label)}<span class="muted" style="display:block;margin-top:3px">${fmtH(best.hours)}</span>`:'—';
 $('#statsTrend').innerHTML=trendHTML(trendData());$('#typeDonut').innerHTML=donutHTML(group(done,'type'),6);$('#academyDonut').innerHTML=donutHTML(group(done,'academy'),6);$('#profChart').innerHTML=rankChartHTML(group(done,'professor'));
 const cross={};done.forEach(s=>{const k=`${s.academy||'Non renseigné'} — ${s.professor||'Non renseigné'}`;cross[k]??={hours:0,count:0};cross[k].hours+=Number(s.duration||0);cross[k].count++});$('#crossStats').innerHTML=rows(cross);
}

function techKey(categoryId,name){return `${categoryId}::${name}`}
async function getTechniqueProgress(){return (await metaGet('techniqueProgress'))||{}}
function techniqueStats(progress){
 let known=0,mastered=0,total=0;
 TECHNIQUE_BANK.forEach(c=>c.techniques.forEach(t=>{
   total++;
   const state=Number(progress[techKey(c.id,t)]||0);
   if(state===1)known++;
   if(state===2)mastered++;
 }));
 return {total,known,mastered,todo:total-known-mastered};
}
function techStateLabel(state){return state===2?'Fiable':state===1?'Connue':'À travailler'}

async function renderTechniques(){
 const progress=await getTechniqueProgress(),roadTargets=await metaGet('roadTargets')||[],targetSet=new Set(roadTargets),stats=techniqueStats(progress),q=$('#techSearch').value.toLowerCase().trim();
 $('#techniqueTotal').textContent=`${stats.total} techniques`;$('#techTodo').textContent=stats.todo;$('#techKnown').textContent=stats.known;$('#techMastered').textContent=stats.mastered;$('#techPercent').textContent=`${Math.round((stats.known+2*stats.mastered)/(stats.total*2)*100||0)}%`;
 $('#techCategoryFilters').innerHTML=[['all','Toutes'],...TECHNIQUE_BANK.map(c=>[c.id,c.label])].map(([id,label])=>`<button class="chip ${techCategoryFilter===id?'active':''}" data-tech-filter="${id}">${esc(label)}</button>`).join('');
 document.querySelectorAll('[data-tech-filter]').forEach(b=>b.onclick=()=>{techCategoryFilter=b.dataset.techFilter;renderTechniques()});
 const categories=TECHNIQUE_BANK.filter(c=>techCategoryFilter==='all'||c.id===techCategoryFilter).map((cat,index)=>{
   const techniques=cat.techniques.filter(t=>!q||t.toLowerCase().includes(q)||cat.label.toLowerCase().includes(q));
   if(!techniques.length)return '';
   const mastered=techniques.filter(t=>Number(progress[techKey(cat.id,t)]||0)===2).length;
   return `<details class="tech-category" ${index<2?'open':''}><summary>${esc(cat.label)}<span>${mastered}/${techniques.length} fiables</span></summary><div class="tech-list">${techniques.map(t=>{
     const key=techKey(cat.id,t),state=Number(progress[key]||0),targeted=targetSet.has(key);
     return `<div class="tech-row"><span class="tech-name">${esc(t)}</span><div class="tech-actions"><button class="target-btn ${targeted?'active':''}" data-road-target="${esc(key)}" title="Inclure dans le parcours">🎯</button><button class="state-btn state-${state}" data-tech-key="${esc(key)}" data-state="${state}">${techStateLabel(state)}</button></div></div>`
   }).join('')}</div></details>`;
 }).join('');
 $('#techniqueBank').innerHTML=categories||'<div class="emptychart">Aucune technique trouvée.</div>';
 document.querySelectorAll('[data-tech-key]').forEach(b=>b.onclick=async()=>{
   const p=await getTechniqueProgress(),next=(Number(b.dataset.state)+1)%3;p[b.dataset.techKey]=next;await metaPut('techniqueProgress',p);await renderTechniques();await renderRoadmap();
 });
 document.querySelectorAll('[data-road-target]').forEach(b=>b.onclick=async()=>{
   const targets=await metaGet('roadTargets')||[],key=b.dataset.roadTarget,next=targets.includes(key)?targets.filter(x=>x!==key):[...targets,key];
   await metaPut('roadTargets',next);await renderTechniques();await renderRoadmap();
 });
}

async function renderRoadmap(){
 const settings=await metaGet('roadmap'),progress=await getTechniqueProgress(),roadTargets=await metaGet('roadTargets')||[];
 const targetSet=new Set(roadTargets),targetStates=roadTargets.map(k=>Number(progress[k]||0)),targetMastered=targetStates.filter(x=>x===2).length,targetKnown=targetStates.filter(x=>x===1).length;
 const tatami=Number(settings.tatamiBaseline||0)+sum(completed());
 const sparring=Number(settings.sparringBaseline||0)+sumSparring(completed());
 const tatamiPct=pct(tatami,Number(settings.tatamiTarget||0)),sparringPct=pct(sparring,Number(settings.sparringTarget||0)),techPct=pct(targetMastered,roadTargets.length);
 const overall=Math.round((tatamiPct+sparringPct+techPct)/3);
 $('#roadGoalTitle').textContent=settings.targetBelt||'Objectif';$('#roadGoalSubtitle').textContent=`${targetKnown} connues · ${targetMastered} fiables · ${roadTargets.length} fondamentaux`;$('#roadOverallBar').style.width=overall+'%';$('#roadOverallPct').textContent=overall+'%';
 $('#roadTatamiLabel').textContent=`${fmtH(tatami)} / ${fmtH(Number(settings.tatamiTarget||0))}`;$('#roadTatamiBar').style.width=tatamiPct+'%';$('#roadTatamiRemaining').textContent=`${fmtH(Math.max(0,Number(settings.tatamiTarget||0)-tatami))} restantes`;
 $('#roadSparringLabel').textContent=`${fmtH(sparring)} / ${fmtH(Number(settings.sparringTarget||0))}`;$('#roadSparringBar').style.width=sparringPct+'%';$('#roadSparringRemaining').textContent=`${fmtH(Math.max(0,Number(settings.sparringTarget||0)-sparring))} restantes`;
 $('#roadTechLabel').textContent=`${targetMastered} / ${roadTargets.length}`;$('#roadTechBar').style.width=techPct+'%';$('#roadTechRemaining').textContent=`${Math.max(0,roadTargets.length-targetMastered)} fondamentaux à rendre fiables`;
 $('#roadCategoryProgress').innerHTML=TECHNIQUE_BANK.map(cat=>{
   const categoryTargets=cat.techniques.map(t=>techKey(cat.id,t)).filter(k=>targetSet.has(k));
   if(!categoryTargets.length)return '';
   const mastered=categoryTargets.filter(k=>Number(progress[k]||0)===2).length,percent=Math.round(mastered/categoryTargets.length*100||0);
   return `<div class="category-line"><span>${esc(cat.label)}</span><div class="ranktrack"><div class="rankfill" style="width:${percent}%"></div></div><b>${mastered}/${categoryTargets.length}</b></div>`
 }).join('');

 const remaining=TECHNIQUE_BANK.map(cat=>{
   const items=cat.techniques.map(t=>({key:techKey(cat.id,t),name:t,state:Number(progress[techKey(cat.id,t)]||0)})).filter(x=>targetSet.has(x.key)&&x.state<2);
   if(!items.length)return '';
   return `<details class="remaining-group"><summary>${esc(cat.label)} <span>${items.length}</span></summary><div>${items.map(x=>`<div class="remaining-tech"><span>${esc(x.name)}</span><small class="state-${x.state}">${x.state===1?'Connue':'À travailler'}</small></div>`).join('')}</div></details>`
 }).join('');
 $('#roadRemainingTechniques').innerHTML=remaining||'<p class="muted">Tous les fondamentaux ciblés sont fiables.</p>';
}

async function renderSettings(){
 const goal=Number(await metaGet('monthlyGoal')||15);$('#settingsMonthlyGoal').value=goal;
 $('#storageInfo').textContent=`${sessions.length} séances locales · ${TECHNIQUE_COUNT} techniques dans la banque`;
}

async function renderAll(){
 await renderDashboard();renderSessions();renderCalendar();renderStats();await renderTechniques();await renderRoadmap();await renderSettings();
}

function showView(id){
 document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
 if(id!=='settings')previousView=id;
 window.scrollTo(0,0);
}

function resetForm(plannedDefault=false){
 $('#sessionForm').reset();$('#editId').value='';$('#formTitle').textContent=plannedDefault?'Planifier une séance':'Nouvelle séance';$('#deleteBtn').classList.add('hidden');
 $('#fDate').value=ymd(new Date());$('#fDuration').value=1.5;$('#fSparring').value=0;$('#fStatus').value=plannedDefault?'planned':'completed';
}
function openSessionDialog(plannedDefault=false){resetForm(plannedDefault);$('#sessionDialog').showModal()}
function editSession(id){
 const s=sessions.find(x=>x.id===id);if(!s)return;
 $('#editId').value=s.id;$('#formTitle').textContent='Modifier la séance';$('#deleteBtn').classList.remove('hidden');$('#fDate').value=s.date;$('#fStatus').value=isPlanned(s)?'planned':'completed';$('#fDuration').value=s.duration;$('#fSparring').value=Number(s.sparringDuration||0);$('#fType').value=s.type;$('#fProfessor').value=s.professor;$('#fAcademy').value=s.academy;$('#fGi').value=s.gi;$('#fIntensity').value=s.intensity;$('#fSlot').value=s.slot;$('#fTechniques').value=s.techniques;$('#fNotes').value=s.notes;$('#sessionDialog').showModal();
}

async function openGoalDialog(){
 $('#goalInput').value=Number(await metaGet('monthlyGoal')||15);$('#goalDialog').showModal();
}
async function openRoadmapDialog(){
 const r=await metaGet('roadmap');$('#roadTargetBelt').value=r.targetBelt;$('#roadTatamiTarget').value=r.tatamiTarget;$('#roadSparringTarget').value=r.sparringTarget;$('#roadTatamiBaseline').value=r.tatamiBaseline||0;$('#roadSparringBaseline').value=r.sparringBaseline||0;$('#roadmapDialog').showModal();
}

function bind(){
 document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>showView(b.dataset.view));
 $('#settingsBtn').onclick=()=>showView('settings');$('#closeSettingsBtn').onclick=()=>showView(previousView);
 $('#addBtn').onclick=()=>openSessionDialog(false);$('#calendarPlanBtn').onclick=()=>{openSessionDialog(true);if(selectedDay)$('#fDate').value=selectedDay};$('#closeDialog').onclick=()=>$('#sessionDialog').close();
 $('#goalBtn').onclick=openGoalDialog;$('#closeGoalDialog').onclick=()=>$('#goalDialog').close();
 $('#roadmapEditBtn').onclick=openRoadmapDialog;$('#closeRoadmapDialog').onclick=()=>$('#roadmapDialog').close();$('#openTechniquesFromRoad').onclick=()=>showView('techniques');

 $('#prevMonth').onclick=()=>{displayMonth=new Date(displayMonth.getFullYear(),displayMonth.getMonth()-1,1);renderDashboard()};
 $('#nextMonth').onclick=()=>{displayMonth=new Date(displayMonth.getFullYear(),displayMonth.getMonth()+1,1);renderDashboard()};
 $('#calPrev').onclick=()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()-1,1);selectedDay=null;renderCalendar()};
 $('#calNext').onclick=()=>{calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,1);selectedDay=null;renderCalendar()};

 $('#search').oninput=renderSessions;$('#techSearch').oninput=renderTechniques;
 document.querySelectorAll('#sessionFilters button').forEach(b=>b.onclick=()=>{sessionFilter=b.dataset.filter;document.querySelectorAll('#sessionFilters button').forEach(x=>x.classList.toggle('active',x===b));renderSessions()});

 $('#fDate').onchange=()=>{if(!$('#editId').value&&$('#fDate').value>ymd(new Date()))$('#fStatus').value='planned'};
 $('#addProfessorBtn').onclick=async()=>{
   const v=$('#newProfessor').value.trim();if(!v)return;
   const vals=await metaGet('customProfessors')||[];if(!vals.some(x=>x.toLowerCase()===v.toLowerCase())){vals.push(v);await metaPut('customProfessors',vals)}
   await fillRefs();$('#fProfessor').value=v;$('#newProfessor').value='';
 };
 $('#addAcademyBtn').onclick=async()=>{
   const v=$('#newAcademy').value.trim();if(!v)return;
   const vals=await metaGet('customAcademies')||[];if(!vals.some(x=>x.toLowerCase()===v.toLowerCase())){vals.push(v);await metaPut('customAcademies',vals)}
   await fillRefs();$('#fAcademy').value=v;$('#newAcademy').value='';
 };

 $('#sessionForm').onsubmit=async e=>{
   e.preventDefault();
   const id=$('#editId').value||crypto.randomUUID();
   const s={id,date:$('#fDate').value,status:$('#fStatus').value,duration:Number($('#fDuration').value),sparringDuration:Math.min(Number($('#fSparring').value||0),Number($('#fDuration').value||0)),type:$('#fType').value,professor:$('#fProfessor').value,academy:$('#fAcademy').value,gi:$('#fGi').value,intensity:$('#fIntensity').value,slot:$('#fSlot').value,techniques:$('#fTechniques').value.trim(),notes:$('#fNotes').value.trim(),title:''};
   await putSession(s);sessions=await getAll();$('#sessionDialog').close();await renderAll();
 };
 $('#deleteBtn').onclick=async()=>{const id=$('#editId').value;if(id&&confirm('Supprimer cette séance ?')){await delSession(id);sessions=await getAll();$('#sessionDialog').close();await renderAll()}};

 $('#goalForm').onsubmit=async e=>{e.preventDefault();await metaPut('monthlyGoal',Number($('#goalInput').value));$('#goalDialog').close();await renderDashboard();await renderSettings()};
 $('#saveMonthlyGoalBtn').onclick=async()=>{const v=Number($('#settingsMonthlyGoal').value);if(v>0){await metaPut('monthlyGoal',v);await renderDashboard();alert('Objectif mensuel mis à jour.')}};
 $('#roadmapForm').onsubmit=async e=>{e.preventDefault();await metaPut('roadmap',{targetBelt:$('#roadTargetBelt').value,tatamiTarget:Number($('#roadTatamiTarget').value),sparringTarget:Number($('#roadSparringTarget').value),tatamiBaseline:Number($('#roadTatamiBaseline').value||0),sparringBaseline:Number($('#roadSparringBaseline').value||0)});$('#roadmapDialog').close();await renderRoadmap()};

 $('#exportBtn').onclick=async()=>{
   const payload={app:'MyBJJ Tracker',version:4,exportedAt:new Date().toISOString(),monthlyGoal:await metaGet('monthlyGoal'),roadmap:await metaGet('roadmap'),roadTargets:await metaGet('roadTargets'),techniqueProgress:await metaGet('techniqueProgress'),sessions};
   const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`MyBJJ_backup_${ymd(new Date())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
 };
 $('#importInput').onchange=async e=>{
   const f=e.target.files[0];if(!f)return;
   try{
     const raw=await new Promise((resolve,reject)=>{
       const reader=new FileReader();
       reader.onload=()=>resolve(String(reader.result||'').replace(/^\\uFEFF/,''));
       reader.onerror=()=>reject(reader.error||new Error('Lecture du fichier impossible'));
       reader.readAsText(f,'UTF-8');
     });
     const data=JSON.parse(raw);if(!Array.isArray(data.sessions))throw Error('Format invalide : la liste sessions est absente');
     if(!confirm(`Importer ${data.sessions.length} séances ? Les séances locales actuelles seront remplacées.`))return;
     await new Promise((res,rej)=>{const r=tx(STORE,'readwrite').clear();r.onsuccess=res;r.onerror=rej});
     for(const s of data.sessions)await putSession({...s,status:s.status||'completed',sparringDuration:Number(s.sparringDuration||0)});
     if(data.monthlyGoal)await metaPut('monthlyGoal',Number(data.monthlyGoal));
     if(data.roadmap)await metaPut('roadmap',data.roadmap);
     if(data.roadTargets)await metaPut('roadTargets',data.roadTargets);
     if(data.techniqueProgress)await metaPut('techniqueProgress',data.techniqueProgress);
     sessions=await getAll();await renderAll();alert('Import terminé.');
   }catch(err){console.error('Import JSON:',err);alert('Impossible d’importer ce fichier JSON. '+(err?.message||'Erreur inconnue.'))}
   finally{e.target.value=''}
 };
}

init();