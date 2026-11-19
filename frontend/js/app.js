
// Diisi dari backend (API.getCategories) di init(). Fallback junior/senior jika gagal.
const CATEGORIES = {};
function ensureCategories(){
  if (!CATEGORIES.junior) {
    CATEGORIES.junior = {label:"JUNIOR", count:44, teams:[], schema:"double_elimination", sort_order:1};
    CATEGORIES.senior = {label:"SENIOR", count:16, teams:[], schema:"knockout", sort_order:2};
  }
}
function buildTeams(){ for(const key of Object.keys(CATEGORIES)) CATEGORIES[key].teams=[]; }
buildTeams();
const state={category:"junior", results:{}, teams:null, categories:null};
let currentCategory="junior";
let AUTH_USER=null;
function isAdmin(){return !!(AUTH_USER && AUTH_USER.role === 'admin');}
function isViewer(){return !!(AUTH_USER && AUTH_USER.role === 'viewer');}
function isUser(){return !!(AUTH_USER && AUTH_USER.role === 'user');}
function canEdit(){return isAdmin() || isUser();}
function canView(){return isAdmin() || isUser() || isViewer();}
function applyAuthUI(){
  const isAd=isAdmin();
  document.body.classList.toggle('is-admin', isAd);
  const userEl=document.getElementById('authUser');
  if(userEl) userEl.textContent = AUTH_USER ? `${AUTH_USER.username} (${AUTH_USER.role})` : 'Guest';
  const loginBtn=document.getElementById('loginBtn');
  const logoutBtn=document.getElementById('logoutBtn');
  if(loginBtn) loginBtn.style.display = AUTH_USER ? 'none' : '';
  if(logoutBtn) logoutBtn.style.display = AUTH_USER ? '' : 'none';
}
function applyTheme(){
  const stored = (localStorage.getItem('lb_theme')||'dark');
  document.documentElement.setAttribute('data-bs-theme', stored);
}
applyTheme();
document.getElementById('darkToggle')?.addEventListener('click', ()=>{
  const next = document.documentElement.getAttribute('data-bs-theme')==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-bs-theme', next);
  localStorage.setItem('lb_theme', next);
});
let saveTimer=null;
function schemaFor(key){ return (CATEGORIES[key]||{}).schema || "knockout"; }
function isDoubleElimination(key){ return schemaFor(key) === "double_elimination"; }
function isKnockout(key){ return schemaFor(key) === "knockout"; }
function roundNo(r){
  if(!r) return 0;
  if(r === "r44") return 0;
  if(r === "r3rd") return 999;
  const m = String(r).match(/^r(\\d+)/);
  return m ? Number(m[1]) : 0;
}
function teamCount(key){ return (CATEGORIES[key]||{}).count || 0; }
function catLabel(key){ return (CATEGORIES[key]||{}).label || key.toUpperCase(); }
function catGroup(key){ return (CATEGORIES[key]||{}).group || catLabel(key); }


function generateDefaultTeams(count, groupName) {
  return Array.from({length: count}, (_, i) => ({
    id: i + 1,
    name: `Tim ${i + 1}`,
    p1: "",
    p2: "",
    photo: "",
    group: groupName
  }));
}

function saveState(){
  state.category=currentCategory;
  const prevResults=state.results||{};
  state.teams={};
  state.results={};
  Object.keys(CATEGORIES).forEach(k=>{
    state.teams[k]=CATEGORIES[k].teams;
    state.results[k]=prevResults[k]||{};
  });
  if(saveTimer)clearTimeout(saveTimer);
  saveTimer=setTimeout(async()=>{
    try{
      await Promise.all(Object.keys(CATEGORIES).map(k=>API.saveTeams(k, CATEGORIES[k].teams)));
      await Promise.all(Object.keys(CATEGORIES).map(k=>API.saveResults(k, state.results[k])));
      await API.saveSettings({category:currentCategory});
    }catch(e){console.error('Gagal menyimpan state:', e);}
  },300);
}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}
function team(n){const teams=CATEGORIES[currentCategory]?.teams;return n && teams ? teams[n-1] : null}
function tname(n){const t=team(n);return t?esc(t.name):":"}
function members(n){const t=team(n);return t?`${esc(t.p1)} &amp; ${esc(t.p2)}`:"Belum ditentukan"}
function setCategory(cat){currentCategory=cat;saveState();renderAll()}
function categoryButtons(target){
  const el=document.getElementById(target);if(!el)return;
  const keys=Object.keys(CATEGORIES).sort((a,b)=>(CATEGORIES[a].sort_order||0)-(CATEGORIES[b].sort_order)||0);
  el.innerHTML=keys.map(cat=>`<button type="button" class="nav-link ${currentCategory===cat?"active":""}" onclick="setCategory('${cat}')">🏆 ${esc(CATEGORIES[cat].label)} <span class="badge text-bg-secondary ms-1">${CATEGORIES[cat].count} slot</span></button>`).join("");
}
function label(r){
  const key=currentCategory;
  const n=teamCount(key);
  const totalRounds=Math.ceil(Math.log2(Math.max(n,2)));
  const labels={};
  if(isDoubleElimination(key)){
    labels.r44=`${n} Peserta • ${Math.floor(n/2)} Match`;
    labels.rank="Leaderboard • TOP 16";
    labels.r1="16 Besar";
    labels.r2="8 Besar";
    labels.r3="Semifinal";
    labels.r3rd="Perebutan Juara 3";
    labels.r4="Final";
  } else {
    for(let i=1;i<=totalRounds;i++){
      const remaining=Math.pow(2,totalRounds-i+1);
      labels["r"+i]=remaining===2?"Final":remaining===4?"Semifinal":remaining===8?"8 Besar":remaining===16?"16 Besar":remaining===32?"32 Besar":remaining===64?"64 Besar":`Babak ${i}`;
    }
    labels.r3rd="Perebutan Juara 3";
  }
  return labels[r]||r;
}
function getRec(id){const recs=state.results && state.results[currentCategory];return (recs && recs[id]) || {}}
function makeMatch(id,a,b,r){
  const rec=getRec(id);
  const aa=rec.a!==undefined?rec.a:a,bb=rec.b!==undefined?rec.b:b;
  const winner = rec.winner !== undefined ? rec.winner : (aa && !bb ? aa : (!aa && bb ? bb : null));
  return {id,a:aa,b:bb,sa:rec.sa??"",sb:rec.sb??"",winner,round:r};
}
function advanceWinner(m){
  if(!m)return null;
  if(m.winner)return m.winner;
  if(m.a&&!m.b)return m.a;
  if(m.b&&!m.a)return m.b;
  return null;
}
/* 
  Poin seleksi TOP 16 berasal dari skor SEMUA 44 tim pada 22 pertandingan awal.
  Tim yang kalah tetap mendapatkan poin dari skor yang mereka cetak dan tetap
  berpeluang masuk TOP 16. Setelah seluruh 22 match selesai, ranking 1-16
  masuk ke babak 16 Besar.
*/
function doubleEliminationSelectionStats(){
  const key=currentCategory;
  const n=teamCount(key), m=Math.floor(n/2), stats={};
  for(let i=1;i<=n;i++)stats[i]={id:i,played:false,wins:0,points:0,against:0,diff:0,matchIndex:0};
  const results = (state.results && state.results[key]) || {};
  for(let i=1;i<=m;i++){
    const id="r44m"+i,rec=results[id];
    if(!rec||!rec.a||!rec.b||rec.sa===""||rec.sb==="")continue;
    const a=Number(rec.sa),b=Number(rec.sb),A=stats[rec.a],B=stats[rec.b];
    A.played=B.played=true;
    A.points=a;B.points=b;
    A.against=b;B.against=a;
    A.diff=a-b;B.diff=b-a;
    A.matchIndex=B.matchIndex=i;
    if(rec.winner===rec.a)A.wins=1;
    if(rec.winner===rec.b)B.wins=1;
  }
  return stats;
}
// New functions for double elimination (renamed from junior versions)
function doubleEliminationSelectionStats(){
  const key=currentCategory;
  const n=teamCount(key), m=Math.floor(n/2), stats={};
  for(let i=1;i<=n;i++)stats[i]={id:i,played:false,wins:0,points:0,against:0,diff:0,matchIndex:0};
  const results = (state.results && state.results[key]) || {};
  for(let i=1;i<=m;i++){
    const id="r44m"+i,rec=results[id];
    if(!rec||!rec.a||!rec.b||rec.sa===""||rec.sb==="")continue;
    const a=Number(rec.sa),b=Number(rec.sb),A=stats[rec.a],B=stats[rec.b];
    A.played=B.played=true;
    A.points=a;B.points=b;
    A.against=b;B.against=a;
    A.diff=a-b;B.diff=b-a;
    A.matchIndex=B.matchIndex=i;
    if(rec.winner===rec.a)A.wins=1;
    if(rec.winner===rec.b)B.wins=1;
  }
  return stats;
}
function doubleEliminationOpeningComplete(){
  const key=currentCategory;
  const m=Math.floor(teamCount(key)/2);
  const results = (state.results && state.results[key]) || {};
  let done=0;
  for(let i=1;i<=m;i++){
    const rec=results["r44m"+i];
    if(rec?.a&&rec?.b&&rec.sa!==""&&rec.sb!==""&&rec.winner)done++;
  }
  return done===m;
}
function doubleEliminationLeaderboardIds(){
  const key=currentCategory;
  const stats=doubleEliminationSelectionStats();
  const n=teamCount(key);
  const results=(state.results && state.results[key]) || {};
  const directWin=new Map();
  const m=Math.floor(n/2);
  for(let i=1;i<=m;i++){
    const rec=results['r44m'+i];
    if(rec && rec.a && rec.b && rec.winner){ directWin.set(rec.winner, rec.winner===rec.a?rec.b:rec.a); }
  }
  return Array.from({length:n},(_,i)=>i+1).sort((a,b)=>{
    const A=stats[a],B=stats[b];
    const base=(B.points-A.points)||(B.diff-A.diff)||(B.wins-A.wins);
    if(base!==0)return base;
    if(directWin.get(a)===b)return -1;
    if(directWin.get(b)===a)return 1;
    return (A.matchIndex-B.matchIndex)||(a-b);
  });
}
function doubleEliminationRankMap(){
  const ids=doubleEliminationLeaderboardIds(),map={};
  const top16=16;
  if(!doubleEliminationOpeningComplete())return map;
  ids.slice(0,top16).forEach((n,i)=>map[i+1]=n);
  return map;
}
function getMatches(){
  const out={};
  const key=currentCategory;
  const n=teamCount(key);
  if(isDoubleElimination(key)){
    const m=Math.floor(n/2);
    for(let i=1;i<=m;i++){
      const a=(i-1)*2+1,b=a+1;
      out["r44m"+i]=makeMatch("r44m"+i,a,b,"r44");
    }
    const rank=doubleEliminationRankMap();
    for(let i=1;i<=8;i++){
      const a=rank[i]||null,b=rank[17-i]||null;
      out["r1m"+i]=makeMatch("r1m"+i,a,b,"r1");
    }
    for(let i=1;i<=4;i++)out["r2m"+i]=makeMatch("r2m"+i,advanceWinner(out["r1m"+(i*2-1)])||null,advanceWinner(out["r1m"+(i*2)])||null,"r2");
    for(let i=1;i<=2;i++)out["r3m"+i]=makeMatch("r3m"+i,advanceWinner(out["r2m"+(i*2-1)])||null,advanceWinner(out["r2m"+(i*2)])||null,"r3");
    const s1=out.r3m1,s2=out.r3m2;
    out.r4m1=makeMatch("r4m1",advanceWinner(s1)||null,advanceWinner(s2)||null,"r4");
    out.r3rd=makeMatch("r3rd",s1.winner?(s1.a===s1.winner?s1.b:s1.a):null,s2.winner?(s2.a===s2.winner?s2.b:s2.a):null,"r3rd");
    return out;
  }
  // KNOCKOUT dinamis: N tim -> babak pertama ceil(N/2) match (bye jika ganjil), lalu hingga final.
  let r1=Math.ceil(n/2);
  let round=1;
  let prevIds=Array.from({length:r1},(_,i)=>"r"+round+"m"+(i+1));
  for(let i=1;i<=r1;i++){
    const a=(i-1)*2+1,b=a+1<=n?a+1:null;
    out[prevIds[i-1]]=makeMatch(prevIds[i-1],a,b,"r"+round);
  }
  while(prevIds.length>1){
    round++;
    const nextIds=[];
    for(let i=0;i<prevIds.length;i+=2){
      const id="r"+round+"m"+(nextIds.length+1);
      out[id]=makeMatch(id,advanceWinner(out[prevIds[i]])||null,advanceWinner(out[prevIds[i+1]])||null,"r"+round);
      nextIds.push(id);
    }
    prevIds=nextIds;
  }
  // Perebutan juara 3 jika ada babak semifinal (round sebelum final)
  if(round>=2){
    const semiRound=round-1;
    const s1=out[`r${semiRound}m1`],s2=out[`r${semiRound}m2`];
    if(s1&&s2){
      out.r3rd=makeMatch("r3rd",s1.winner?(s1.a===s1.winner?s1.b:s1.a):null,s2.winner?(s2.a===s2.winner?s2.b:s2.a):null,"r3rd");
    }
  }
  return out;
}
function playable(m){return !!(m&&m.a&&m.b)}
function saveResult(id,sa,sb){
  const m=getMatches()[id];if(!m||!m.a||!m.b)return;
  if(sa===""||sb===""){alert("Masukkan kedua skor terlebih dahulu.");return}
  sa=Number(sa);sb=Number(sb);
  if(!Number.isFinite(sa)||!Number.isFinite(sb)||sa<0||sb<0){alert("Skor tidak valid.");return}
  if(!state.results[currentCategory]) state.results[currentCategory]={};
  const patch={a:m.a,b:m.b,sa,sb};
  if(sa===sb){
    alert("Skor seri. Gunakan tombol sudden death +1 setelah hasil disimpan.");
    state.results[currentCategory][id]={...getRec(id),...patch,winner:null};
    saveState();
    renderAll();
    return;
  }
  const winner=sa>sb?m.a:m.b;
  state.results[currentCategory][id]={...getRec(id),...patch,winner};saveState();renderAll();
}
function addPoint(id,side){
  const m=getMatches()[id],rec=getRec(id);if(!m||!m.a||!m.b)return;
  if(!state.results[currentCategory]) state.results[currentCategory]={};
  let sa=Number(rec.sa||0),sb=Number(rec.sb||0);side==="a"?sa++:sb++;
  const winner=sa>sb?m.a:sb>sa?m.b:null;
  state.results[currentCategory][id]={...getRec(id),a:m.a,b:m.b,sa,sb,winner};saveState();renderAll();
}
const MATCH_STATUS={belum:"Belum",berlangsung:"Berlangsung",selesai:"Selesai"};
const MATCH_STATUS_BADGE={belum:"text-bg-secondary",berlangsung:"text-bg-warning",selesai:"text-bg-success"};
function toLocalInput(v){
  if(!v)return "";
  const s=String(v);
  return s.length>=16?s.slice(0,16):s;
}
function setMatchMeta(id,field,value){
  const m=getMatches()[id];if(!m)return;
  if(!state.results[currentCategory]) state.results[currentCategory]={};
  const prev=state.results[currentCategory][id]||{a:m.a,b:m.b,sa:"",sb:"",winner:null};
  state.results[currentCategory][id]={...prev,[field]:value||null};
  saveState();
  renderInput();
}
async function showResultHistory(id){
  document.getElementById("historyTitle").textContent=`Riwayat • ${id.toUpperCase()}`;
  const body=document.getElementById("historyBody");
  body.innerHTML='<div class="text-secondary">Memuat…</div>';
  showModal("historyModal");
  try{
    const rows=await API.getResultHistory(currentCategory,id);
    body.innerHTML=rows.length
      ?`<table class="table table-sm align-middle mb-0"><thead><tr><th>Waktu</th><th>Skor</th><th>Status</th><th>Jadwal</th><th>Oleh</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.changed_at)}</td><td>${esc(r.sa??"-")} – ${esc(r.sb??"-")}</td><td>${esc(r.status||"-")}</td><td>${esc(r.scheduled_at||"-")}</td><td>${esc(r.changed_by||"-")}</td></tr>`).join("")}</tbody></table>`
      :'<div class="text-secondary">Belum ada riwayat perubahan.</div>';
  }catch(e){
    body.innerHTML=`<div class="text-danger">Gagal memuat riwayat: ${esc(e.message)}</div>`;
  }
}
function exportResultsJSON(){
  const cat=currentCategory;
  const data=JSON.stringify({category:cat,results:state.results[cat]||{}},null,2);
  const blob=new Blob([data],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=`results_${cat}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
function importResultsJSON(){
  const cat=currentCategory;
  const input=document.createElement("input");
  input.type="file";
  input.accept="application/json";
  input.onchange=e=>{
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const json=JSON.parse(ev.target.result);
        const results=json.results||json;
        if(!results||typeof results!=="object"||Array.isArray(results))throw new Error("Format tidak valid");
        if(!confirm(`Impor ${Object.keys(results).length} hasil pertandingan ke kategori ${catLabel(cat)}?\n\nHasil kategori ini akan diganti.`))return;
        state.results[cat]=results;
        saveState();
        renderAll();
        alert("Hasil pertandingan berhasil diimpor.");
      }catch(err){alert("Gagal mengimpor JSON: "+err.message);}
    };
    reader.readAsText(file);
  };
  input.click();
}
function slotHTML(m,n){
  if(!n)return `<div class="slot empty"><span class="seed">–</span><span class="slot-name">Menunggu</span></div>`;
  const win=m.winner===n,loss=m.winner&&m.winner!==n,score=n===m.a?m.sa:m.sb;
  return `<div class="slot ${win?"win":""} ${loss?"loss":""}"><span class="seed">${n}</span><button class="team-click" type="button" title="Klik untuk melihat data lengkap" onclick="showTeamDetail(${n})"><span class="slot-name">${tname(n)}</span></button><span class="slot-score">${score!==""?score:""}</span></div>`;
}
function matchHTML(id,extra=""){
  const m=getMatches()[id];if(!m)return "";
  const bye=(m.a&&!m.b)||(m.b&&!m.a);
  return `<div class="match ${extra}" data-match-id="${id}">${slotHTML(m,m.a)}${slotHTML(m,m.b)}${bye?'<div style="padding:4px 9px"><span class="bye">AUTO BYE</span></div>':""}</div>`;
}
function renderRound(ids,r){return `<div class="round"><div class="round-title">${label(r)}</div><div class="round-body">${ids.map(id=>matchHTML(id)).join("")}</div></div>`}
function rankPanelHTML(){
  const key=currentCategory;
  const ids=doubleEliminationLeaderboardIds(),stats=doubleEliminationSelectionStats(),rows=[],complete=doubleEliminationOpeningComplete(),n=teamCount(key);
  for(let i=1;i<=n;i++){
    const id=ids[i-1],st=stats[id],qualified=complete&&i<=16;
    const status=complete?(qualified?"LOLOS 16 BESAR":"TIDAK LOLOS"):"MASIH BERPELUANG";
    rows.push(`<div class="rank-row ${qualified?"top-five":i>16?"playoff-rank":""}">
      <span class="rank-no">${i}</span>
      <span class="rank-team"><button class="team-click" type="button" title="Klik untuk melihat data lengkap" onclick="showTeamDetail(${id},${i})">${tname(id)}</button></span>
      <span class="rank-tag">PTS ${st.points} • SELISIH ${st.diff>=0?"+":""}${st.diff} • ${status}</span>
    </div>`);
  }
  return `<div class="rank-panel"><div class="rank-panel-head"><b>LEADERBOARD POIN • ${n} TIM</b><span>TOP 16</span></div>${rows.join("")}</div>`;
}
function renderBracket(){
  const ms=getMatches();let h="";
  const key=currentCategory;
  const n=teamCount(key);
  // Kumpulkan match per round
  const rounds={};
  Object.values(ms).forEach(m=>{ if(m.round) (rounds[m.round]=rounds[m.round]||[]).push(m.id); });
  const roundKeys=Object.keys(rounds).sort((a,b)=>roundNo(a)-roundNo(b));
  roundKeys.forEach(rk=>{
    const ids=rounds[rk].sort((x,y)=>{
      const mx=x.match(/m(\d+)$/),my=y.match(/m(\d+)$/);
      return parseInt(mx&&mx[1]||0,10)-parseInt(my&&my[1]||0,10);
    });
    if(rk==="r44"){
      h+=renderRound(ids,"r44");
    } else if(rk==="r3rd"){
      // r3rd ditangani di center-result, bukan round
    } else {
      h+=renderRound(ids,rk);
    }
  });
  if(isDoubleElimination(key)){
    h+=`<div class="round leaderboard-round" data-flow-node="leaderboard"><div class="round-title">Leaderboard • TOP 16</div><div class="round-body">${rankPanelHTML()}</div></div>`;
  }
  const finalKey = roundKeys.filter(k=>k!=="r3rd").reduce((best,k)=> (best===null || roundNo(k)>roundNo(best)) ? k : best, null);
  const finalId=finalKey? (rounds[finalKey]||[])[0] : null;
  const finalMatch=finalId?ms[finalId]:null;
  const finalRound=finalMatch?finalMatch.round:"r4";
  h+=`<div class="center-result"><div class="champion-box"><div class="champion-label">🏆 JUARA 1</div><div class="champion-name">${finalMatch&&finalMatch.winner?tname(finalMatch.winner):"Belum ditentukan"}</div></div>${finalMatch?matchHTML(finalMatch.id,"final"):''}${ms.r3rd?matchHTML("r3rd","bronze"):''}</div>`;
  document.getElementById("bracketEl").innerHTML=`<div class="bracket-flow"><svg class="flow-svg" aria-hidden="true"><defs><marker id="arrowNormal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker><marker id="arrowActive" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs></svg>${h}</div>`;
  requestAnimationFrame(drawBracketConnectors);
  document.getElementById("bracketTitle").textContent=`Bagan ${catLabel(key)} : ${n} Peserta`;
  document.getElementById("bracketSubtitle").textContent=isDoubleElimination(key)
    ?`${n} peserta → ${Math.floor(n/2)} pertandingan → leaderboard ${n} tim berdasarkan poin → TOP 16 → 16 Besar → 8 Besar → Semifinal → Juara 1`
    :`${n} tim • ${Math.ceil(n/2)} match awal • Knockout menuju Juara 1`;
  const total=n,done=Object.values((state.results && state.results[key]) || {}).filter(x=>x&&x.winner).length;
  document.getElementById("stats").innerHTML=isDoubleElimination(key)
    ?`<div class="col-6 col-lg-3"><div class="small-box text-bg-primary"><div class="inner"><h3>${n}</h3><p>Total Peserta</p></div><i class="small-box-icon bi bi-people-fill"></i></div></div><div class="col-6 col-lg-3"><div class="small-box text-bg-info"><div class="inner"><h3>${Math.floor(n/2)}</h3><p>Pertandingan Awal</p></div><i class="small-box-icon bi bi-diagram-3"></i></div></div><div class="col-6 col-lg-3"><div class="small-box text-bg-success"><div class="inner"><h3>16</h3><p>Top 16 Berdasarkan Poin</p></div><i class="small-box-icon bi bi-trophy-fill"></i></div></div><div class="col-6 col-lg-3"><div class="small-box text-bg-warning"><div class="inner"><h3>${done}</h3><p>Pertandingan Selesai</p></div><i class="small-box-icon bi bi-check2-circle"></i></div></div>`
    :`<div class="col-6 col-lg-3"><div class="small-box text-bg-primary"><div class="inner"><h3>${total}</h3><p>Total Tim</p></div><i class="small-box-icon bi bi-people-fill"></i></div></div><div class="col-6 col-lg-3"><div class="small-box text-bg-success"><div class="inner"><h3>${done}</h3><p>Pertandingan Selesai</p></div><i class="small-box-icon bi bi-check2-circle"></i></div></div><div class="col-6 col-lg-3"><div class="small-box text-bg-info"><div class="inner"><h3>${total-1}</h3><p>Kemenangan Menuju Juara</p></div><i class="small-box-icon bi bi-trophy-fill"></i></div></div><div class="col-6 col-lg-3"><div class="small-box text-bg-warning"><div class="inner"><h3>${Math.ceil(n/2)}</h3><p>Match Awal</p></div><i class="small-box-icon bi bi-diagram-3"></i></div></div>`;
}
function drawOneConnector(svg,flow,fromEl,toEl,matches,fr,ns,activeOverride){
  const ar=fromEl.getBoundingClientRect(),br=toEl.getBoundingClientRect(),x1=ar.right-fr.left,x2=br.left-fr.left,y1=ar.top+ar.height/2-fr.top,y2=br.top+br.height/2-fr.top,mid=x1+(x2-x1)*.5,active=activeOverride===undefined?false:activeOverride;
  const path=document.createElementNS(ns,"path");path.setAttribute("class","generated-flow flow-line"+(active?" flow-active":""));path.setAttribute("marker-end",active?"url(#arrowActive)":"url(#arrowNormal)");path.setAttribute("d",`M ${x1} ${y1} H ${mid} V ${y2} H ${Math.max(x2-5,x1+2)}`);svg.appendChild(path);
  const dot=document.createElementNS(ns,"circle");dot.setAttribute("class","generated-flow flow-dot"+(active?" active":""));dot.setAttribute("cx",mid);dot.setAttribute("cy",y2);dot.setAttribute("r",active?3.8:3);svg.appendChild(dot);
}
function drawBracketConnectors(){
  const flow=document.querySelector(".bracket-flow"),svg=flow?.querySelector(".flow-svg");if(!flow||!svg)return;
  const matches=getMatches(),ns="http://www.w3.org/2000/svg",fr=flow.getBoundingClientRect();
  svg.setAttribute("viewBox",`0 0 ${Math.max(flow.scrollWidth,fr.width)} ${Math.max(flow.scrollHeight,fr.height)}`);svg.setAttribute("width",Math.max(flow.scrollWidth,fr.width));svg.setAttribute("height",Math.max(flow.scrollHeight,fr.height));svg.querySelectorAll(".generated-flow,.flow-stage-label").forEach(e=>e.remove());
  const key=currentCategory;
  const isJ=isDoubleElimination(key);
  // Kumpulkan match per round number
  const byRound={};
  Object.values(matches).forEach(m=>{
    if(!m.round || m.round === "r3rd") return;
    const rn = m.round === "r44" ? 0 : (parseInt(m.round.replace("r",""),10) || 0);
    (byRound[rn]=byRound[rn]||[]).push(m.id);
  });
  const roundNums=Object.keys(byRound).map(Number).sort((a,b)=>a-b);
  const el=id=>flow.querySelector(`[data-match-id="${id}"]`);
  // Junior44: r44 -> leaderboard -> r1 -> r2 -> r3 -> final
  if(isJ){
    const r44Nodes=(byRound[0]||[]).map(el).filter(Boolean);
    const lb=flow.querySelector('[data-flow-node="leaderboard"]');
    if(r44Nodes.length&&lb){
      const first=r44Nodes[0].getBoundingClientRect(),last=r44Nodes[r44Nodes.length-1].getBoundingClientRect(),lbr=lb.getBoundingClientRect();
      const xStart=first.right-fr.left,xBus=xStart+(lbr.left-fr.left-xStart)*.42,yTop=first.top+first.height/2-fr.top,yBottom=last.top+last.height/2-fr.top,yTarget=lbr.top+lbr.height/2-fr.top;
      const bus=document.createElementNS(ns,"path");bus.setAttribute("class","generated-flow flow-line");bus.setAttribute("d",`M ${xBus} ${yTop} V ${yBottom}`);svg.appendChild(bus);
      r44Nodes.forEach(e=>{const r=e.getBoundingClientRect(),y=r.top+r.height/2-fr.top,p=document.createElementNS(ns,"path"),rec=matches[e.dataset.matchId];p.setAttribute("class","generated-flow flow-line"+(rec?.winner?" flow-active":""));p.setAttribute("d",`M ${r.right-fr.left} ${y} H ${xBus}`);svg.appendChild(p)});
      const p2=document.createElementNS(ns,"path");p2.setAttribute("class","generated-flow flow-line");p2.setAttribute("marker-end","url(#arrowNormal)");p2.setAttribute("d",`M ${xBus} ${yTarget} H ${lbr.left-fr.left-5}`);svg.appendChild(p2);
    }
    const lb2=flow.querySelector('[data-flow-node="leaderboard"]');
    if(lb2){
      const r1nodes=(byRound[1]||[]).map(el).filter(Boolean);
      if(r1nodes.length){
        const lr=lb2.getBoundingClientRect(),startX=lr.right-fr.left,endX=r1nodes[0].getBoundingClientRect().left-fr.left,bus2=startX+(endX-startX)*.5,pTop=r1nodes[0].getBoundingClientRect().top+r1nodes[0].getBoundingClientRect().height/2-fr.top,pBottom=r1nodes[r1nodes.length-1].getBoundingClientRect().top+r1nodes[r1nodes.length-1].getBoundingClientRect().height/2-fr.top,pMid=(pTop+pBottom)/2;
        const p=document.createElementNS(ns,"path");p.setAttribute("class","generated-flow flow-line");p.setAttribute("d",`M ${startX} ${lr.top+lr.height/2-fr.top} H ${bus2} V ${pMid}`);svg.appendChild(p);
        r1nodes.forEach(e=>{const r=e.getBoundingClientRect(),y=r.top+r.height/2-fr.top,q=document.createElementNS(ns,"path");q.setAttribute("class","generated-flow flow-line");q.setAttribute("marker-end","url(#arrowNormal)");q.setAttribute("d",`M ${bus2} ${pMid} V ${y} H ${r.left-fr.left-5}`);svg.appendChild(q)});
      }
    }
  }
  // Round -> next round connectors (both schemas)
  for(let ri=0;ri<roundNums.length-1;ri++){
    if(roundNums[ri] === 0) continue;
    const cur=byRound[roundNums[ri]]||[], nxt=byRound[roundNums[ri+1]]||[];
    cur.forEach((id,idx)=>{
      const toId=nxt[Math.floor(idx/2)];
      if(!toId) return;
      const from=el(id),to=el(toId);
      if(from&&to) drawOneConnector(svg,flow,from,to,matches,fr,ns,!!matches[id]?.winner);
    });
  }
}
window.addEventListener("resize",()=>{clearTimeout(window.__bracketResize);window.__bracketResize=setTimeout(drawBracketConnectors,80)});
function inputMatch(id){
  const m=getMatches()[id],rec=getRec(id),has=playable(m),bye=(m.a&&!m.b)||(m.b&&!m.a),submitted=has&&rec.sa!==undefined&&rec.sa!==""&&rec.sb!=="",tie=submitted&&Number(rec.sa)===Number(rec.sb);
  const st=rec.status||"belum";
  const stBadge=MATCH_STATUS_BADGE[st]||"text-bg-secondary";
  const ro=isAdmin()?"":"disabled";
  return `<div class="card mb-3 ${m.winner?"border-success":""}"><div class="card-header d-flex justify-content-between align-items-center"><span class="text-info fw-bold">${label(m.round)}</span><span class="d-flex align-items-center gap-2"><span class="badge ${stBadge}">${MATCH_STATUS[st]||st}</span><span class="text-secondary small">${id.toUpperCase()}</span></span></div><div class="card-body"><div class="row g-2 align-items-center"><div class="col"><div class="border rounded p-2 h-100 ${m.winner===m.a?"border-success bg-success-subtle":""}"><b>${tname(m.a)}</b><div class="small text-secondary">${m.a?members(m.a):"Menunggu tim"}</div><input id="${id}a" type="number" min="0" class="form-control text-center fw-bold mt-2" value="${rec.sa??""}" ${has&&!isAdmin()?"disabled":has?"":"disabled"}></div></div><div class="col-auto fw-bold text-secondary">VS</div><div class="col"><div class="border rounded p-2 h-100 ${m.winner===m.b?"border-success bg-success-subtle":""}"><b>${tname(m.b)}</b><div class="small text-secondary">${m.b?members(m.b):"Menunggu tim"}</div><input id="${id}b" type="number" min="0" class="form-control text-center fw-bold mt-2" value="${rec.sb??""}" ${has&&!isAdmin()?"disabled":has?"":"disabled"}></div></div></div><div class="mt-2 d-flex gap-2 flex-wrap align-items-center"><span class="small text-secondary">Status</span><select class="form-select form-select-sm w-auto" ${ro} onchange="setMatchMeta('${id}','status',this.value)">${Object.keys(MATCH_STATUS).map(v=>`<option value="${v}" ${st===v?"selected":""}>${MATCH_STATUS[v]}</option>`).join("")}</select><span class="small text-secondary">Jadwal</span><input type="datetime-local" class="form-control form-control-sm w-auto" value="${toLocalInput(rec.scheduled_at)}" ${ro} onchange="setMatchMeta('${id}','scheduled_at',this.value)"><button class="btn btn-sm btn-outline-secondary admin-only" type="button" onclick="showResultHistory('${id}')">Riwayat</button></div><div class="mt-3 d-flex gap-2 flex-wrap align-items-center">${has&&isAdmin()?`<button class="btn btn-primary admin-only" onclick="saveResult('${id}',document.getElementById('${id}a').value,document.getElementById('${id}b').value)">Simpan Hasil</button>`:has?'<span class="text-secondary small">Hanya admin yang dapat menginput hasil</span>':bye?'<span class="badge text-bg-success">AUTO BYE</span>':'<span class="text-secondary small">Menunggu tim / pemenang babak sebelumnya</span>'}${m.winner?`<span class="badge text-bg-success">🏆 ${tname(m.winner)}</span>`:""}</div>${tie?`<div class="alert alert-warning mb-0 mt-3 d-flex gap-2 align-items-center flex-wrap">⚡ Seri. Sudden death: <button class="btn btn-sm btn-secondary" onclick="addPoint('${id}','a')">+1 ${tname(m.a)}</button> <button class="btn btn-sm btn-secondary" onclick="addPoint('${id}','b')">+1 ${tname(m.b)}</button></div>`:""}</div></div>`;
}
function renderInput(){
  const ids=Object.keys(getMatches());
  document.getElementById("inputEl").innerHTML=ids.map(inputMatch).join("");
}
function statusOf(n){
  const ms=getMatches();
  const finalRounds=Object.values(ms).filter(m=>m.round && m.round!=="r3rd" && m.round!=="r44").map(m=>parseInt(m.round.replace("r",""),10)||0).filter(x=>x>0);
  const maxRound=Math.max(...finalRounds,0);
  const finalMatch=Object.values(ms).find(m=>m.round && m.round!=="r3rd" && m.round!=="r44" && (parseInt(m.round.replace("r",""),10)||0)===maxRound);
  const r3=ms.r3rd;
  if(finalMatch&&finalMatch.winner===n)return"JUARA1";
  if(finalMatch&&finalMatch.winner&&(finalMatch.a===n||finalMatch.b===n))return"JUARA2";
  if(r3&&r3.winner===n)return"JUARA3";
  if(isDoubleElimination(currentCategory)){
    const rank=doubleEliminationLeaderboardIds(),pos=rank.indexOf(n)+1;
    if(!doubleEliminationOpeningComplete())return"MASIH BERPELUANG";
    if(pos>0&&pos<=16&&!Object.values(ms).some(m=>(m.a===n||m.b===n)&&m.winner))return"LOLOS 16 BESAR";
    if(pos>16)return"TIDAK LOLOS";
  }
  for(const m of Object.values(ms))if((m.a===n||m.b===n)&&m.winner)return m.winner===n?"LOLOS":"GAGAL";
  return"MENUNGGU";
}
function renderLeaderboard(){
  const key=currentCategory;
  const totals={};
  CATEGORIES[key].teams.forEach((_,i)=>totals[i+1]=0);
  if(isDoubleElimination(key)){
    const stats=doubleEliminationSelectionStats(),arr=doubleEliminationLeaderboardIds(),complete=doubleEliminationOpeningComplete();
    document.getElementById("leaderEl").innerHTML=arr.map((n,i)=>{
      const st=statusOf(n),qualified=complete&&i<16;
      const cls=qualified?"text-bg-success":complete?"text-bg-danger":"text-bg-secondary";
      const t=team(n),d=stats[n];
      const status=complete?(qualified?"LOLOS 16 BESAR":"TIDAK LOLOS"):"MASIH BERPELUANG";
      return `<tr><td><b style="color:${qualified?"var(--accent)":"var(--muted)"}">${i+1}</b></td><td><button class="team-click leader-team-btn" type="button" title="Klik untuk melihat data lengkap" onclick="showTeamDetail(${n},${i+1})">${tname(n)}</button><br><span style="color:var(--muted2);font-size:10px">${esc(t.group)}</span></td><td>${members(n)}</td><td><b>${d.points}</b><div style="font-size:9px;color:var(--muted2)">Selisih ${d.diff>=0?"+":""}${d.diff}</div></td><td><span class="badge ${cls}">${status}</span></td></tr>`;
    }).join("");
    return;
  }
  Object.values((state.results && state.results[key]) || {}).forEach(m=>{if(m.a&&m.sa!=="")totals[m.a]+=Number(m.sa||0);if(m.b&&m.sb!=="")totals[m.b]+=Number(m.sb||0)});
  const arr=Object.keys(totals).map(Number).sort((a,b)=>totals[b]-totals[a]||a-b);
  document.getElementById("leaderEl").innerHTML=arr.map((n,i)=>{const st=statusOf(n),cls={MENUNGGU:"text-bg-secondary",LOLOS:"text-bg-success",GAGAL:"text-bg-danger",JUARA1:"text-bg-warning",JUARA2:"text-bg-light",JUARA3:"text-bg-info"}[st],t=team(n);return `<tr><td><b style="color:var(--accent)">${i+1}</b></td><td><button class="team-click leader-team-btn" type="button" title="Klik untuk melihat data lengkap" onclick="showTeamDetail(${n},${i+1})">${tname(n)}</button><br><span style="color:var(--muted2);font-size:10px">${esc(t.group)}</span></td><td>${members(n)}</td><td><b>${totals[n]}</b></td><td><span class="badge ${cls}">${st==="JUARA1"?"JUARA 1":st==="JUARA2"?"JUARA 2":st==="JUARA3"?"JUARA 3":st}</span></td></tr>`}).join("");
}
function renderChampions(){
  const ms=getMatches();
  const finalRounds=Object.values(ms).filter(m=>m.round && m.round!=="r3rd" && m.round!=="r44").map(m=>parseInt(m.round.replace("r",""),10)||0).filter(x=>x>0);
  const maxRound=Math.max(...finalRounds,0);
  const finalMatch=Object.values(ms).find(m=>m.round && m.round!=="r3rd" && m.round!=="r44" && (parseInt(m.round.replace("r",""),10)||0)===maxRound);
  const c1=finalMatch?finalMatch.winner:null;
  const c2=c1?(finalMatch.a===c1?finalMatch.b:finalMatch.a):null;
  const c3=ms.r3rd?ms.r3rd.winner:null;
  [["champ1","champ1Members",c1],["champ2","champ2Members",c2],["champ3","champ3Members",c3]].forEach(([a,b,n])=>{document.getElementById(a).textContent=n?tname(n):"Belum ditentukan";document.getElementById(b).innerHTML=n?members(n):""});
}
function renderTeams(){
  const el=document.getElementById("teamEditor"),arr=CATEGORIES[currentCategory].teams;
  const cnt=document.getElementById("teamCountLabel"); if(cnt) cnt.textContent=arr.length;
  const inp=document.getElementById("teamCountInput"); if(inp){ inp.value=arr.length; inp.disabled=!isAdmin(); }
  document.getElementById("teamNote").innerHTML=`<b>${catLabel(currentCategory)}:</b> ${arr.length} tim. Data dapat ditambah/dikurangi dan diedit secara dinamis. Hasil pertandingan akan direset jika jumlah tim atau susunan berubah.`;
  const ro = isAdmin() ? '' : 'disabled';
  const q=(document.getElementById("teamSearch")?.value||"").trim().toLowerCase();
  const items=arr.map((t,i)=>({t,i})).filter(({t})=>{
    if(!q)return true;
    return [t.name,t.p1,t.p2].some(v=>String(v||"").toLowerCase().includes(q));
  });
el.innerHTML=items.map(({t,i})=>`<div class="col-12 col-md-6 col-xl-4"><div class="card h-100"><div class="card-header d-flex justify-content-between align-items-center gap-2"><span class="text-info fw-bold">TEAM ${i+1}</span><div class="d-flex align-items-center gap-2"><span class="text-secondary small">${t.name.includes("BELUM")?"TAMBAHAN":"KUSTOM/DEFAULT"}</span><button class="btn btn-danger btn-sm admin-only" onclick="deleteSingleTeam(${i})" title="Hapus tim">🗑</button></div></div><div class="card-body"><div class="row g-2"><div class="col-6"><label class="form-label" for="tn${i+1}">Nama Tim / Sekolah</label><input id="tn${i+1}" class="form-control" value="${esc(t.name)}" ${ro}></div><div class="col-6"><label class="form-label">Kategori</label><input class="form-control" value="${esc(catLabel(currentCategory))}" disabled></div><div class="col-6"><label class="form-label" for="tp1${i+1}">Peserta 1</label><input id="tp1${i+1}" class="form-control" value="${esc(t.p1)}" ${ro}></div><div class="col-6"><label class="form-label" for="tp2${i+1}">Peserta 2</label><input id="tp2${i+1}" class="form-control" value="${esc(t.p2)}" ${ro}></div></div><div class="mt-2 small text-secondary">${esc(t.name)}<br>${esc(t.p1)} &amp; ${esc(t.p2)}</div></div></div></div>`).join("");
  if(!items.length) el.innerHTML=`<div class="col-12"><div class="alert alert-secondary mb-0">Tidak ada tim yang cocok dengan pencarian.</div></div>`;
  enhanceTeamPhotoInputs(items);
}
function enhanceTeamPhotoInputs(items){
  if(!items.length) return;
  const ro = isAdmin() ? '' : 'disabled';
  const rows = document.querySelectorAll('#teamEditor .card-body .row.g-2');
  items.forEach(({t,i}, k)=>{
    const row = rows[k];
    if(!row) return;
    const col = document.createElement('div');
    col.className = 'col-12';
    col.innerHTML = `<label class="form-label" for="tphoto${i+1}">Foto/Logo URL</label><input id="tphoto${i+1}" class="form-control" value="${esc(t.photo||'')}" ${ro}>`;
    row.appendChild(col);
  });
}
function schoolKey(name){
  return String(name||"")
    .toUpperCase()
    .replace(/\s+/g," ")
    .trim();
}
function randomizeTeams(){
  const cat=currentCategory;
  const arr=CATEGORIES[cat].teams.map(t=>({...t}));
  if(arr.length<2)return;

  const hasResults=Object.keys(state.results[cat]||{}).length>0;
  const warning=hasResults
    ? `Hasil pertandingan ${catLabel(cat)} yang sudah ada akan di-reset karena pasangan tim berubah.\n\nLanjutkan random tim?`
    : `Acak seluruh pasangan tim ${catLabel(cat)}?\n\nSistem akan berusaha menghindari tim dari sekolah yang sama bertemu pada pertandingan pertama.`;
  if(!confirm(warning))return;

  /*
    Random pairing:
    - seluruh tim diacak,
    - pasangan babak pertama diusahakan berbeda sekolah,
    - dicoba berkali-kali dan dipilih hasil dengan benturan sekolah paling sedikit.
  */
  let best=null,bestConflicts=Infinity;
  const attempts=Math.min(3000,Math.max(500,arr.length*80));

  for(let attempt=0;attempt<attempts;attempt++){
    const pool=arr.slice();
    for(let i=pool.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [pool[i],pool[j]]=[pool[j],pool[i]];
    }

    let conflicts=0;
    for(let i=0;i<pool.length;i+=2){
      if(schoolKey(pool[i].name)===schoolKey(pool[i+1]?.name))conflicts++;
    }
    if(conflicts<bestConflicts){
      bestConflicts=conflicts;
      best=pool;
      if(conflicts===0)break;
    }
  }

  if(!best)return;

  best.forEach((t,i)=>{t.id=i+1;});
  CATEGORIES[cat].teams=best;

  // Pasangan berubah, jadi hasil lama tidak boleh ikut pindah ke tim baru.
  state.results[cat]={};

  saveState();
  renderAll();

  const pairs=[];
  for(let i=0;i<best.length;i+=2){
    const a=best[i],b=best[i+1];
    pairs.push(`${i/2+1}. ${a.name} 🆚 ${b.name}`);
  }
  alert(
    `🎲 RANDOM TIM SELESAI\\n\\n`+
    `${catLabel(cat)}: ${best.length} tim\\n`+
    `Benturan sekolah di babak pertama: ${bestConflicts}\\n\\n`+
    `Pasangan baru sudah masuk ke Bagan dan Input Hasil.`
  );
}
function applyTeamCount(){
  const cat=currentCategory;
  let n=parseInt(document.getElementById("teamCountInput").value,10);
  if(isNaN(n)||n<1)n=1;
  if(n>128)n=128;
  const arr=CATEGORIES[cat].teams;
  if(n===arr.length){renderTeams();return;}
  if(!confirm(`Ubah jumlah tim ${catLabel(cat)} menjadi ${n}?\n\nHasil pertandingan kategori ini akan direset.`))return;
  while(arr.length<n){
    const idx=arr.length+1;
    arr.push({id:idx,name:`Tim ${idx}`,p1:"",p2:"",photo:"",group:catGroup(cat)});
  }
  arr.length=n;
  arr.forEach((t,i)=>{t.id=i+1; t.group=catGroup(cat);});
  CATEGORIES[cat].count=n;
  state.results[cat]={};
  saveState();
  renderAll();
}

function addTeam(){
  const cat=currentCategory;
  const arr=CATEGORIES[cat].teams;
  if(arr.length>=128)return;
  if(!confirm(`Tambah 1 tim ke ${catLabel(cat)}?\n\nHasil pertandingan kategori ini akan direset.`))return;
  const idx=arr.length+1;
  arr.push({id:idx,name:`Tim ${idx}`,p1:"",p2:"",photo:"",group:catGroup(cat)});
  arr.forEach((t,i)=>{t.id=i+1;});
  CATEGORIES[cat].count=arr.length;
  state.results[cat]={};
  saveState();
  renderAll();
}

function removeTeam(){
  const cat=currentCategory;
  const arr=CATEGORIES[cat].teams;
  if(arr.length<=1)return;
  if(!confirm(`Hapus tim terakhir dari ${catLabel(cat)}?\n\nHasil pertandingan kategori ini akan direset.`))return;
  arr.pop();
  arr.forEach((t,i)=>{t.id=i+1;});
  CATEGORIES[cat].count=arr.length;
  state.results[cat]={};
  saveState();
  renderAll();
}
function deleteSingleTeam(teamIndex) {
  const cat=currentCategory;
  const arr=CATEGORIES[cat].teams;
  if(teamIndex<0||teamIndex>=arr.length)return;
  if(!confirm(`Hapus tim ${arr[teamIndex].name} dari ${catLabel(cat)}?\n\nHasil pertandingan kategori ini akan direset.`))return;
  arr.splice(teamIndex, 1);
  arr.forEach((t,i)=>{t.id=i+1;});
  CATEGORIES[cat].count=arr.length;
  state.results[cat]={};
  saveState();
  renderAll();
}
function exportTeamsJSON(){
  const cat=currentCategory;
  const data=JSON.stringify({category:cat, teams:CATEGORIES[cat].teams},null,2);
  const blob=new Blob([data],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=`teams_${cat}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importTeamsJSON(){
  const cat=currentCategory;
  const input=document.createElement("input");
  input.type="file";
  input.accept="application/json";
  input.onchange=e=>{
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const json=JSON.parse(ev.target.result);
        const teams=json.teams||json;
        if(!Array.isArray(teams))throw new Error("Format tidak valid");
        if(!confirm(`Impor ${teams.length} tim ke kategori ${catLabel(cat)}?\n\nHasil pertandingan kategori ini akan direset.`))return;
        CATEGORIES[cat].teams=teams.map((t,i)=>({id:i+1,name:t.name||`Tim ${i+1}`,p1:t.p1||"",p2:t.p2||"",photo:t.photo||t.photo_url||"",group:catGroup(cat)}));
        CATEGORIES[cat].count=CATEGORIES[cat].teams.length;
        state.results[cat]={};
        saveState();
        renderAll();
        alert("Data tim berhasil diimpor.");
      }catch(err){alert("Gagal mengimpor JSON: "+err.message);}
    };
    reader.readAsText(file);
  };
  input.click();
}
function resetResults(){if(!confirm(`Hapus SEMUA hasil pertandingan kategori ${catLabel(currentCategory)}?\n\nSemua skor dan pemenang akan dikosongkan.`))return;state.results[currentCategory]={};saveState();renderAll()}
function view(id,btn){document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));document.getElementById(id).classList.add("active");document.querySelectorAll(".sidebar-menu .nav-link").forEach(b=>b.classList.remove("active"));if(btn)btn.classList.add("active");renderAll()}
function fullscreen(){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()}
function youtubeId(url){if(!url)return"";const m=String(url).match(/(?:v=|youtu\.be\/|youtube\.com\/live\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);return m?m[1]:""}
function renderLive(){
 let cfg=null; try { cfg=JSON.parse(localStorage.getItem("ugotLive2026")||"null"); } catch(e){ cfg=null; } cfg = cfg || {name:"UGOT COMPETITION 2026",match:"",url:""};document.getElementById("liveName").value=cfg.name;document.getElementById("liveMatch").value=cfg.match;document.getElementById("liveUrl").value=cfg.url;
 const id=youtubeId(cfg.url),p=document.getElementById("youtubePlayer"),st=document.getElementById("liveStatus");
 if(!id){p.innerHTML='<div class="live-safe"><div><div style="font-size:45px">📺</div><h3>Siap Menampilkan Live</h3><p>Masukkan URL YouTube Live di panel kanan.</p></div></div>';st.textContent="Status: belum ada link.";return}
 if(location.protocol==="file:"){p.innerHTML='<div class="live-safe"><div><div style="font-size:45px">🌐</div><h3>Live siap dibuka</h3><p>File HTML lokal dapat membatasi embed YouTube.</p><button class="btn btn-primary" onclick="openLive()">▶️ Buka YouTube</button></div></div>';st.textContent="Status: mode file lokal.";return}
 const src=`https://www.youtube-nocookie.com/embed/${id}?autoplay=0&rel=0&modestbranding=1&playsinline=1`;p.innerHTML=`<iframe src="${src}" title="UGOT Competition Live Stream" allow="autoplay; encrypted-media; picture-in-picture; web-share" allowfullscreen></iframe>`;st.innerHTML='Status: <b class="text-success">LIVE PLAYER AKTIF</b>';
}
function applyLive(){const cfg={name:document.getElementById("liveName").value.trim()||"UGOT COMPETITION 2026",match:document.getElementById("liveMatch").value.trim(),url:document.getElementById("liveUrl").value.trim()};if(cfg.url&&!youtubeId(cfg.url)){alert("Link YouTube tidak dikenali.");return}localStorage.setItem("ugotLive2026",JSON.stringify(cfg));renderLive()}
function openLive(){const u=document.getElementById("liveUrl").value.trim();if(u)window.open(u,"_blank","noopener,noreferrer");else alert("Masukkan link YouTube terlebih dahulu.")}

function showTeamDetail(n,rank=null){
  const t=team(Number(n));
  if(!t)return;
  const cat=CATEGORIES[currentCategory];
  document.getElementById("teamDetailKicker").textContent=`${catLabel(currentCategory)} • ${rank?`RANK ${rank}`:"DATA TIM"}`;
  document.getElementById("teamDetailTitle").textContent=t.name||"Nama Tim";
  document.getElementById("teamDetailNo").textContent=`TEAM ${t.id}`;
  document.getElementById("teamDetailCategory").textContent=catLabel(currentCategory);
  document.getElementById("teamDetailSchool").textContent=t.name||":";
  document.getElementById("teamDetailP1").textContent=t.p1||":";
  document.getElementById("teamDetailP2").textContent=t.p2||":";
  const pw=document.getElementById("teamDetailPhotoWrap"),pi=document.getElementById("teamDetailPhoto");
  if(pw&&pi){ if(t.photo){ pi.src=t.photo; pw.hidden=false; } else { pw.hidden=true; pi.removeAttribute("src"); } }
  showModal("teamDetailBackdrop");
}
function closeTeamDetail(){ hideModal("teamDetailBackdrop"); }
function showModal(id){ const el=document.getElementById(id); if(el) bootstrap.Modal.getOrCreateInstance(el).show(); }
function hideModal(id){ const el=document.getElementById(id); if(el){ const m=bootstrap.Modal.getInstance(el); if(m) m.hide(); } }

function renderAll(){categoryButtons("categoryBar");categoryButtons("inputCategoryBar");categoryButtons("leaderCategoryBar");categoryButtons("champCategoryBar");categoryButtons("teamCategoryBar");categoryButtons("pengaturanCategoryBar");renderBracket();renderInput();renderLeaderboard();renderChampions();renderTeams();renderPengaturan();renderLive();applyAuthUI()}

function openLoginModal(){
  const st=document.getElementById('loginStatus'); if(st) st.textContent='';
  showModal('loginModalBackdrop');
}
function closeLoginModal(){ hideModal('loginModalBackdrop'); }
async function submitLogin(){
  const username=document.getElementById('loginUsername').value.trim();
  const password=document.getElementById('loginPassword').value;
  const st=document.getElementById('loginStatus');
  try{
    const data=await API.login(username,password);
    AUTH_USER=data.user;
    applyAuthUI();
    closeLoginModal();
    renderAll();
    alert(`Login berhasil: ${data.user.username} (${data.user.role})`);
  }catch(e){
    if(st) st.textContent='Gagal login: '+e.message;
  }
}
async function doLogout(){
  await API.logout();
  AUTH_USER=null;
  applyAuthUI();
  renderAll();
}

function openResetPasswordModal(){
  const s1=document.getElementById('resetStep1'), s2=document.getElementById('resetStep2');
  if(s1) s1.style.display='';
  if(s2) s2.style.display='none';
  const b1=document.getElementById('resetStep1Btn'), b2=document.getElementById('resetStep2Btn');
  if(b1) b1.style.display='';
  if(b2) b2.style.display='none';
  ['resetStep1Status','resetStep2Status'].forEach(id=>{const el=document.getElementById(id); if(el) el.textContent='';});
  const u=document.getElementById('resetUsername'); if(u) u.value=document.getElementById('loginUsername')?.value.trim()||'';
  closeLoginModal();
  showModal('resetPasswordBackdrop');
  // Show enhanced password reset info
  setTimeout(() => {
    const infoMsg = document.createElement('div');
    infoMsg.className = 'alert alert-info small mt-2';
    infoMsg.textContent = 'Masukkan username dan kami akan memberikan token reset password yang aman.';
    const container = document.getElementById('resetStep1');
    if (container) container.appendChild(infoMsg);
  }, 100);
}
function closeResetPasswordModal(){ hideModal('resetPasswordBackdrop'); }
async function handleForgotPasswordStep1(){
  const username=document.getElementById('resetUsername').value.trim();
  const st=document.getElementById('resetStep1Status');
  if(!username){ if(st) st.textContent='Username wajib diisi.'; return; }
  if(st) st.textContent='Memproses...';
  try{
    const data=await API.forgotPassword(username);
    document.getElementById('resetToken').value=data.reset_token;
    document.getElementById('resetStep1').style.display='none';
    document.getElementById('resetStep2').style.display='';
    document.getElementById('resetStep1Btn').style.display='none';
    document.getElementById('resetStep2Btn').style.display='';
    if(st) st.textContent='✅ Token reset password berhasil generated!';
    // Show token details
    const tokenInfo = document.createElement('div');
    tokenInfo.className = 'small text-info mt-1';
    tokenInfo.innerHTML = `<strong>Token:</strong> ${data.reset_token}<br><strong>Berlaku:</strong> 1 jam<br><strong>Digunakan:</strong> sekali pakai`;
    const container = document.getElementById('resetStep2');
    if (container) container.appendChild(tokenInfo);
  }catch(e){ if(st) st.textContent='❌ Gagal: '+e.message; }
}
async function handleResetPasswordStep2(){
  const token=document.getElementById('resetToken').value.trim();
  const newPassword=document.getElementById('resetNewPassword').value;
  const st=document.getElementById('resetStep2Status');
  if(!token||!newPassword){ if(st) st.textContent='Token dan password baru wajib diisi.'; return; }
  if(st) st.textContent='Memproses reset password...';
  try{
    await API.resetPassword(token,newPassword);
    closeResetPasswordModal();
    alert('✅ Password berhasil diubah! Silakan login dengan password baru Anda.');
    // Show success message with additional info
    setTimeout(() => {
      const successMsg = document.createElement('div');
      successMsg.className = 'alert alert-success small mt-2';
      successMsg.innerHTML = 'Semua sesi pengguna telah dinonaktifkan untuk keamanan. Login dengan password baru Anda.';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
    }, 100);
  }catch(e){ if(st) st.textContent='❌ Gagal: '+e.message; }
}

async function renderUserManagement(){
  const el=document.getElementById('settingsTableBody'); if(!el)return;
  if(!document.getElementById('pengaturan')||!document.getElementById('pengaturan').classList.contains('active'))return;
  
  // Add user management section to settings
  let userManagementHTML = '';
  if(isAdmin()){
    userManagementHTML = `
      <tr class="table-active">
        <td colspan="3">
          <div class="d-flex justify-content-between align-items-center">
            <strong>👥 Manajemen Pengguna</strong>
            <button class="btn btn-sm btn-primary" onclick="openUserModal()">+ Tambah User</button>
          </div>
        </td>
      </tr>
      <tr id="userListHeader" class="d-none">
        <th>No</th>
        <th>Username</th>
        <th>Role</th>
        <th>Aksi</th>
      </tr>`;
  }
  
  const currentUserManagement = document.getElementById('userManagementSection');
  if (currentUserManagement) {
    currentUserManagement.remove();
  }
  
  if(isAdmin()){
    // Fetch users list
    let usersHTML = '<tr class="text-center text-muted"><td colspan="4">Memuat pengguna...</td></tr>';
    try {
      const users = await API.getUsers ? await API.getUsers() : [];
      if (users.length > 0) {
        usersHTML = users.map((user, index) => `
          <tr>
            <td>${index + 1}</td>
            <td><code>${user.username}</code></td>
            <td><span class="badge ${getRoleBadgeClass(user.role)}">${user.role}</span></td>
            <td>
              <button class="btn btn-sm btn-outline-primary" onclick="editUser('${user.username}')">Edit</button>
              <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user.username}')">Hapus</button>
            </td>
          </tr>
        `).join('');
      } else {
        usersHTML = '<tr class="text-center text-muted"><td colspan="4">Tidak ada pengguna.</td></tr>';
      }
    } catch (e) {
      usersHTML = `<tr class="text-center text-muted"><td colspan="4">Error: ${e.message}</td></tr>`;
    }
    
    el.innerHTML = userManagementHTML + '<tr id="userManagementSection"><th>No</th><th>Username</th><th>Role</th><th>Aksi</th></tr>' + usersHTML;
  }
}

function getRoleBadgeClass(role) {
  const roleClasses = {
    'admin': 'bg-danger',
    'user': 'bg-primary', 
    'viewer': 'bg-info',
    'guest': 'bg-secondary'
  };
  return roleClasses[role] || 'bg-dark';
}

function openUserModal(){
  // Show user modal for creating/editing users
  showModal('userModalBackdrop');
  // Initialize user modal with default values
  document.getElementById('userUsername').value = '';
  document.getElementById('userPassword').value = '';
  document.getElementById('userRole').value = 'user';
  document.getElementById('userStatus').value = 'active';
}

async function saveUser(){
  const username = document.getElementById('userUsername').value.trim();
  const password = document.getElementById('userPassword').value;
  const role = document.getElementById('userRole').value;
  const status = document.getElementById('userStatus').value;
  
  if(!username || !password) {
    alert('Username dan password wajib diisi');
    return;
  }
  
  try {
    await API.createUser(username, password, role);
    closeUserModal();
    alert('User berhasil dibuat/diperbarui');
    renderUserManagement();
  } catch (e) {
    alert('Gagal menyimpan user: ' + e.message);
  }
}

function closeUserModal(){
  hideModal('userModalBackdrop');
}

async function editUser(username) {
  try {
    // Get user details (assuming API.getUser endpoint exists)
    const user = await API.getUser ? await API.getUser(username) : null;
    if (user) {
      document.getElementById('userUsername').value = user.username;
      document.getElementById('userPassword').value = ''; // Don't pre-fill password for security
      document.getElementById('userRole').value = user.role;
      document.getElementById('userStatus').value = user.status || 'active';
      openUserModal();
    }
  } catch (e) {
    alert('Gagal memuat data user: ' + e.message);
  }
}

async function deleteUser(username) {
  if (confirm(`Yakin ingin menghapus user "${username}"?`)) {
    try {
      await API.deleteUser ? await API.deleteUser(username) : await API.revokeSession(username);
      alert('User berhasil dihapus');
      renderUserManagement();
    } catch (e) {
      alert('Gagal menghapus user: ' + e.message);
    }
  }
}

function openChangePasswordModal(){
  if(!AUTH_USER) return;
  
  // Show password change modal for current user
  showModal('changePasswordBackdrop');
  // Clear previous error messages
  ['changePasswordCurrent', 'changePasswordNew', 'changePasswordConfirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

function closeChangePasswordModal(){
  hideModal('changePasswordBackdrop');
}

async function handleChangeCurrentPassword(){
  const currentPass = document.getElementById('changePasswordCurrent').value;
  const newPass = document.getElementById('changePasswordNew').value;
  const confirmPass = document.getElementById('changePasswordConfirm').value;
  const errorEl = document.getElementById('changePasswordError');
  
  if(!currentPass || !newPass || !confirmPass) {
    if(errorEl) errorEl.textContent = 'Semua field password wajib diisi';
    return;
  }
  
  if(newPass !== confirmPass) {
    if(errorEl) errorEl.textContent = 'Password baru dan konfirmasi tidak cocok';
    return;
  }
  
  if(newPass.length < 8) {
    if(errorEl) errorEl.textContent = 'Password baru minimal 8 karakter';
    return;
  }
  
  try {
    await API.changePassword(currentPass, newPass);
    closeChangePasswordModal();
    alert('✅ Password berhasil diubah! Semua sesi telah dinonaktifkan untuk keamanan.');
    // Logout user after password change
    setTimeout(async () => {
      await API.logout();
      AUTH_USER = null;
      applyAuthUI();
      renderAll();
    }, 100);
  } catch (e) {
    if(errorEl) errorEl.textContent = 'Gagal mengubah password: ' + e.message;
  }
}

async function renderUserSessions(){
  const el=document.getElementById('settingsTableBody'); if(!el)return;
  
  if(!isAdmin()) return;
  
  let sessionsHTML = '';
  
  // Add current user session info
  if (AUTH_USER) {
    sessionsHTML += `
      <tr class="table-active">
        <td colspan="4">
          <strong>👤 ${AUTH_USER.username}</strong> (${AUTH_USER.role})
          <span class="badge bg-success">Login Aktif</span>
          <small class="text-muted d-block">Token: ${AUTH_USER.token || 'N/A'}</small>
        </td>
      </tr>`;
  }
  
  try {
    const sessions = await API.getSessions();
    const otherSessions = sessions.filter(s => s.user_id !== AUTH_USER?.id);
    
    if (otherSessions.length > 0) {
      sessionsHTML += `
        <tr class="table-light">
          <td colspan="4">
            <strong>🔒 Sesi Lain</strong>
          </td>
        </tr>
        ${otherSessions.map((session, index) => `
          <tr>
            <td>${index + 1}</td>
            <td><code>${session.username || 'N/A'}</code></td>
            <td><small class="text-muted">${new Date(session.created_at).toLocaleString()}</small></td>
            <td>
              <button class="btn btn-sm btn-outline-danger" onclick="revokeUserSession('${session.token}')">Tarik</button>
            </td>
          </tr>
        `).join('')}
      `;
    }
  } catch (e) {
    // Silent fail for session rendering
  }
  
  if (sessionsHTML) {
    el.innerHTML = el.innerHTML + '<tr id="sessionManagementSection"><th>No</th><th>User</th><th>Waktu</th><th>Aksi</th></tr>' + sessionsHTML;
  }
}

async function revokeUserSession(token) {
  try {
    await API.revokeSession(token);
    alert('Sesi berhasil ditarik');
    renderUserSessions();
  } catch (e) {
    alert('Gagal menarik sesi: ' + e.message);
  }
}

async function init(){
  try{
    const cats = await API.getCategories().catch(()=>[]);
    if(Array.isArray(cats) && cats.length){
      cats.forEach(c=>{
        CATEGORIES[c.key] = {
          key: c.key,
          label: c.label,
          schema: c.schema,
          count: c.team_count,
          sort_order: c.sort_order,
          teams: []
        };
      });
    } else {
      CATEGORIES.junior = {key:"junior",label:"Junior",schema:"double_elimination",count:44,sort_order:1,teams:[]};
      CATEGORIES.senior = {key:"senior",label:"Senior",schema:"knockout",count:16,sort_order:2,teams:[]};
    }
    const keys = Object.keys(CATEGORIES).sort((a,b)=>(CATEGORIES[a].sort_order||0)-(CATEGORIES[b].sort_order||0));
    const teamPromises = keys.map(k=>API.getTeams(k).catch(()=>[]));
    const resultPromises = keys.map(k=>API.getResults(k).catch(()=>({})));
    const [set] = await Promise.all([API.getSettings().catch(()=>({}))]);
    const teamsArr = await Promise.all(teamPromises);
    const resultsArr = await Promise.all(resultPromises);
    keys.forEach((k,i)=>{
      const arr = Array.isArray(teamsArr[i]) && teamsArr[i].length ? teamsArr[i] : generateDefaultTeams(CATEGORIES[k].count, catGroup(k));
      CATEGORIES[k].teams = arr;
      CATEGORIES[k].count = arr.length;
      state.results[k] = resultsArr[i] || {};
    });
    if(set && set.category && CATEGORIES[set.category]) currentCategory = set.category;
    else currentCategory = keys[0] || "junior";
    try { const me = await API.me(); AUTH_USER = me.user; } catch (e) { AUTH_USER = null; API.setToken(''); }
    applyAuthUI();
  }catch(e){
    console.error("Gagal inisialisasi aplikasi:", e);
    if(!CATEGORIES.junior) CATEGORIES.junior = {key:"junior",label:"Junior",schema:"double_elimination",count:44,sort_order:1,teams:generateDefaultTeams(44,"Junior")};
    if(!CATEGORIES.senior) CATEGORIES.senior = {key:"senior",label:"Senior",schema:"knockout",count:16,sort_order:2,teams:generateDefaultTeams(16,"Senior")};
    if(!currentCategory) currentCategory = "junior";
    AUTH_USER=null;
    API.setToken('');
    applyAuthUI();
  }
  renderAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function saveTeams(){
  const cat=currentCategory;
  const arr=CATEGORIES[cat].teams;
  arr.forEach((t,i)=>{
    const tn=document.getElementById("tn"+(i+1));
    const tp1=document.getElementById("tp1"+(i+1));
    const tp2=document.getElementById("tp2"+(i+1));
    const tph=document.getElementById("tphoto"+(i+1));
    if(tn) t.name=tn.value.trim()||`Tim ${i+1}`;
    if(tp1) t.p1=tp1.value.trim();
    if(tp2) t.p2=tp2.value.trim();
    if(tph) t.photo=tph.value.trim();
    t.id=i+1;
    t.group=catGroup(cat);
  });
  CATEGORIES[cat].count=arr.length;
  saveState();
  renderAll();
  alert(`Data ${catLabel(cat)} (${arr.length} tim) aplikasi.`);
}
function resetTeams(){
  if(!confirm("Hapus semua tim kategori ini?\n\nHasil pertandingan kategori ini akan direset."))return;
  CATEGORIES[currentCategory].teams=[];
  CATEGORIES[currentCategory].count=0;
  state.results[currentCategory]={};
  saveState();
  renderAll();
}

function openCategoryModal(key=null){
  const isEdit=!!key;
  const cat=key?CATEGORIES[key]:null;
  document.getElementById("categoryModalMode").textContent=isEdit?"Edit Kategori":"Buat Kategori Baru";
  document.getElementById("catKeyInput").value=key||"";
  document.getElementById("catKeyInput").disabled=isEdit;
  document.getElementById("catLabelInput").value=cat?cat.label:"";
  document.getElementById("catSchemaInput").value=cat?cat.schema:"knockout";
  document.getElementById("catCountInput").value=cat?cat.count:"";
  document.getElementById("catCountInput").disabled=isEdit;
  const emptyBox=document.getElementById("catEmptyInput");
  if(emptyBox){
    emptyBox.checked=false;
    emptyBox.disabled=isEdit;
    emptyBox.parentElement.parentElement.style.display=isEdit?"none":"";
  }
  document.getElementById("catOrderInput").value=cat?((CATEGORIES[key]||{}).sort_order||0):"";
  document.getElementById("categoryArchiveBtn").style.display=isEdit?"":"none";
  window.__editingCategory=key||null;
  showModal("categoryModalBackdrop");
}
async function saveCategory(){
  const key=window.__editingCategory;
  const label=document.getElementById("catLabelInput").value.trim();
  const schema=document.getElementById("catSchemaInput").value;
  const count=parseInt(document.getElementById("catCountInput").value,10);
  const emptyBox=document.getElementById("catEmptyInput");
  const empty=emptyBox?emptyBox.checked:false;
  const order=parseInt(document.getElementById("catOrderInput").value,10)||0;
  if(!label)return alert("Label kategori wajib diisi.");
  if(!key && !document.getElementById("catKeyInput").value.trim())return alert("Key kategori wajib diisi (huruf kecil, angka, underscore).");
  const payload={label,schema,team_count:empty?0:(isNaN(count)?(schema==="double_elimination"?44:16):count),sort_order:order};
  if(!key)payload.empty=empty;
  try{
    if(key){
      await API.updateCategory(key, payload);
    }else{
      payload.key=document.getElementById("catKeyInput").value.trim();
      await API.createCategory(payload);
    }
    closeCategoryModal();
    await reloadCategories();
    alert("Kategori tersimpan.");
  }catch(e){alert("Gagal menyimpan kategori: "+e.message);}
}
async function deleteCategory(){
  const key=window.__editingCategory;
  if(!key)return;
  if(!confirm(`Hapus kategori ${catLabel(key)}?\n\nSemua tim dan hasil pertandingan kategori ini akan hilang.`))return;
  try{
    await API.deleteCategory(key);
    closeCategoryModal();
    await reloadCategories();
    alert("Kategori dihapus.");
  }catch(e){alert("Gagal menghapus kategori: "+e.message);}
}
async function reloadCategories(){
  const cats=await API.getCategories().catch(()=>[]);
  Object.keys(CATEGORIES).forEach(k=>delete CATEGORIES[k]);
  if(Array.isArray(cats) && cats.length){
    cats.forEach(c=>{
      CATEGORIES[c.key]={key:c.key,label:c.label,schema:c.schema,count:c.team_count,teams:[],sort_order:c.sort_order};
    });
  }else{
    CATEGORIES.junior={key:"junior",label:"JUNIOR",schema:"double_elimination",count:44,teams:[],sort_order:1};
    CATEGORIES.senior={key:"senior",label:"SENIOR",schema:"knockout",count:16,teams:[],sort_order:2};
  }
  const keys=Object.keys(CATEGORIES).sort((a,b)=>(CATEGORIES[a].sort_order||0)-(CATEGORIES[b].sort_order||0));
  const teamPromises=keys.map(k=>API.getTeams(k).catch(()=>[]));
  const teamsArr=await Promise.all(teamPromises);
  keys.forEach((k,i)=>{
    const arr=Array.isArray(teamsArr[i])&&teamsArr[i].length?teamsArr[i]:generateDefaultTeams(CATEGORIES[k].count,catGroup(k));
    CATEGORIES[k].teams=arr;
    CATEGORIES[k].count=arr.length;
    state.results[k]=state.results[k]||{};
  });
  if(!CATEGORIES[currentCategory])currentCategory=keys[0]||"junior";
  renderAll();
}
async function renderPengaturan(){
  const el=document.getElementById("pengaturanTableBody");if(!el)return;
  const showArchived=document.getElementById("showArchivedCats")?.checked;
  const activeKeys=Object.keys(CATEGORIES).sort((a,b)=>(CATEGORIES[a].sort_order||0)-(CATEGORIES[b].sort_order)||0);
  let rows=activeKeys.map(k=>{
    const c=CATEGORIES[k];
    return `<tr>
      <td><code>${esc(k)}</code></td>
      <td>${esc(c.label)}</td>
      <td>${esc(c.schema)}</td>
      <td>${c.count}</td>
      <td>${c.sort_order||0}</td>
      <td>
        <button class="btn btn-sm btn-secondary" type="button" onclick="openCategoryModal('${k}')">Edit</button>
        <button class="btn btn-sm btn-warning" type="button" onclick="archiveCategoryKey('${k}',true)">Arsip</button>
        <button class="btn btn-sm btn-danger" type="button" onclick="deleteCategoryByKey('${k}', '${esc(c.label)}')">Hapus</button>
      </td>
    </tr>`;
  });
  if(showArchived){
    try{
      const all=await API.getCategories(true);
      const archived=(Array.isArray(all)?all:[]).filter(c=>c.archived);
      rows=rows.concat(archived.map(c=>`<tr class="table-secondary">
        <td><code>${esc(c.key)}</code></td>
        <td>${esc(c.label)} <span class="badge text-bg-secondary">arsip</span></td>
        <td>${esc(c.schema)}</td>
        <td>${c.team_count}</td>
        <td>${c.sort_order||0}</td>
        <td>
          <button class="btn btn-sm btn-success" type="button" onclick="archiveCategoryKey('${c.key}',false)">Pulihkan</button>
        </td>
      </tr>`));
    }catch(e){}
  }
  el.innerHTML=rows.join("");
  renderSettings();
  renderSessions();
}

function settingValueText(v){
  if(v===null||v===undefined)return"";
  return typeof v==="object" ? JSON.stringify(v) : String(v);
}
async function renderSettings(){
  const el=document.getElementById("settingsTableBody"); if(!el)return;
  if(!document.getElementById("pengaturan")?.classList.contains("active"))return;
  let set={};
  try{ set=await API.getSettings(); }catch(e){}
  const admin=isAdmin();
  el.innerHTML=Object.keys(set).sort().map(k=>`<tr data-key="${esc(k)}">
    <td><code>${esc(k)}</code></td>
    <td><input class="form-control form-control-sm settings-value" value="${esc(settingValueText(set[k]))}" ${admin?"":"readonly"}></td>
    <td>${admin?`<button class="btn btn-sm btn-danger" type="button" onclick="deleteSettingKey('${esc(k)}')">Hapus</button>`:""}</td>
  </tr>`).join("") || `<tr><td colspan="3" class="text-secondary">Belum ada setting.</td></tr>`;
}
function addSettingRow(){
  const el=document.getElementById("settingsTableBody"); if(!el)return;
  const placeholder=el.querySelector("td[colspan]");
  if(placeholder) placeholder.closest("tr").remove();
  const tr=document.createElement("tr");
  tr.innerHTML=`<td><input class="form-control form-control-sm settings-key" placeholder="key baru"></td>
    <td><input class="form-control form-control-sm settings-value" placeholder="value"></td>
    <td><button class="btn btn-sm btn-secondary" type="button" onclick="this.closest('tr').remove()">Batal</button></td>`;
  el.appendChild(tr);
  tr.querySelector(".settings-key").focus();
}
async function saveSettingsTable(){
  const rows=[...document.querySelectorAll("#settingsTableBody tr")];
  const body={};
  rows.forEach(tr=>{
    const key=tr.dataset.key || tr.querySelector(".settings-key")?.value.trim();
    if(!key)return;
    const raw=tr.querySelector(".settings-value")?.value ?? "";
    let val=raw;
    try{ val=JSON.parse(raw); }catch(e){}
    body[key]=val;
  });
  try{
    await API.saveSettings(body);
    await renderSettings();
    alert("Pengaturan disimpan.");
  }catch(e){alert("Gagal menyimpan pengaturan: "+e.message);}
}
async function deleteSettingKey(key){
  if(!confirm(`Hapus setting "${key}"?`))return;
  try{
    await API.deleteSetting(key);
    await renderSettings();
  }catch(e){alert("Gagal menghapus setting: "+e.message);}
}

async function renderSessions(){
  const el=document.getElementById("sessionsTableBody"); if(!el)return;
  if(!document.getElementById("pengaturan")?.classList.contains("active"))return;
  let rows=[];
  try{ rows=await API.getSessions(); }catch(e){ el.innerHTML=`<tr><td colspan="5" class="text-secondary">Gagal memuat sesi: ${esc(e.message)}</td></tr>`; return; }
  if(!Array.isArray(rows)||!rows.length){ el.innerHTML=`<tr><td colspan="5" class="text-secondary">Tidak ada sesi aktif.</td></tr>`; return; }
  el.innerHTML=rows.map(s=>`<tr>
    <td>${esc(s.username)}${s.token===API.token?` <span class="badge text-bg-info">sesi ini</span>`:""}</td>
    <td><code>${esc(String(s.token).slice(0,8))}…</code></td>
    <td class="small text-secondary">${esc(s.created_at||"")}</td>
    <td class="small text-secondary">${esc(s.expires_at||"")}</td>
    <td><button class="btn btn-sm btn-danger" type="button" onclick="revokeSessionToken('${esc(s.token)}')">Cabut</button></td>
  </tr>`).join("");
}
async function revokeSessionToken(token){
  if(!confirm("Cabut sesi ini? Pengguna akan diminta login ulang."))return;
  try{
    await API.revokeSession(token);
    if(token===API.token){ API.setToken(''); AUTH_USER=null; applyAuthUI(); renderAll(); alert("Sesi Anda sendiri telah dicabut. Silakan login lagi."); return; }
    await renderSessions();
  }catch(e){alert("Gagal mencabut sesi: "+e.message);}
}
async function archiveCategory(){
  const key=window.__editingCategory;
  if(!key)return;
  if(!confirm(`Arsipkan kategori ${catLabel(key)}? Kategori akan disembunyikan dari daftar aktif.`))return;
  try{
    await API.archiveCategory(key, true);
    closeCategoryModal();
    await reloadCategories();
    alert("Kategori diarsipkan.");
  }catch(e){alert("Gagal mengarsipkan kategori: "+e.message);}
}
async function archiveCategoryKey(key, archived){
  try{
    await API.archiveCategory(key, archived);
    await reloadCategories();
    await renderPengaturan();
    alert(archived?"Kategori diarsipkan.":"Kategori dipulihkan.");
  }catch(e){alert("Gagal mengubah status arsip: "+e.message);}
}
async function deleteCategoryByKey(key, label){
  if(!confirm(`Hapus kategori ${label}?\n\nSemua tim dan hasil pertandingan kategori ini akan hilang.`))return;
  try{
    await API.deleteCategory(key);
    await reloadCategories();
    alert("Kategori dihapus.");
  }catch(e){alert("Gagal menghapus kategori: "+e.message);}
}
async function deleteCurrentCategory(){
  const key=currentCategory;
  if(!key || !CATEGORIES[key]) return;
  await deleteCategoryByKey(key, catLabel(key));
}
function closeCategoryModal(){ hideModal("categoryModalBackdrop"); }
