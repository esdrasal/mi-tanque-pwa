// ── PWA ───────────────────────────────────────────────────
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferredPrompt=e; document.getElementById('install-bar').style.display='flex'; });
document.getElementById('install-btn').onclick=async()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; document.getElementById('install-bar').style.display='none'; };
document.getElementById('install-dismiss').onclick=()=>{ document.getElementById('install-bar').style.display='none'; };
if(/iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.navigator.standalone){ const h=document.createElement('div'); h.className='ios-hint'; h.innerHTML='Para instalar: toca <b>Compartir</b> → <b>Agregar a pantalla de inicio</b>'; document.querySelector('.app').appendChild(h); }
if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});

// ── Navegación ────────────────────────────────────────────
function goTo(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(id==='screen-home') renderHome();
  if(id==='screen-form') initForm();
  if(id==='screen-status') initStatus();
  if(id==='screen-settings') initSettings();
  if(id==='screen-chart') initChart();
  if(id==='screen-trip') initTrip();
}

function initChart(){
  renderMonthly('chart-monthly');
  renderMileageChart('chart-mileage');
  renderPriceChart('chart-price');
}

// ── Helpers ───────────────────────────────────────────────
function getLastOdo(){
  const e=state.entries.find(e=>e.odoValue);
  return e?e.odoValue:(state.setup?.odo||null);
}

// ── Setup (primera vez) ───────────────────────────────────
let setupGauge=null;
function initSetup(){ setupGauge=createGauge('setup-gauge',0.5); }
function saveSetup(){
  const odo=parseFloat(document.getElementById('setup-odo').value);
  if(!odo||odo<0){ alert('Ingresa el odómetro actual.'); return; }
  state.setup={ odo, level:setupGauge?setupGauge.getVal():0.5, capacity:parseFloat(document.getElementById('setup-cap').value)||null };
  persist(); goTo('screen-home');
}

// ── Settings ──────────────────────────────────────────────
function initSettings(){
  document.getElementById('set-odo').value=state.setup?.odo||'';
  document.getElementById('set-cap').value=state.setup?.capacity||'';
  document.getElementById('set-oil-interval').value=state.setup?.oilInterval||'';
  document.getElementById('set-oil-odo').value=state.setup?.oilOdo||'';
}
function saveSettings(){
  if(!state.setup) state.setup={};
  const odo=parseFloat(document.getElementById('set-odo').value);
  if(odo) state.setup.odo=odo;
  state.setup.capacity=parseFloat(document.getElementById('set-cap').value)||null;
  state.setup.oilInterval=parseFloat(document.getElementById('set-oil-interval').value)||null;
  state.setup.oilOdo=parseFloat(document.getElementById('set-oil-odo').value)||null;
  persist(); alert('Guardado.'); goTo('screen-home');
}
function resetAll(){ if(!confirm('¿Borrar todos los datos?')) return; state={entries:[],setup:null}; persist(); location.reload(); }

// ── CSV Export ────────────────────────────────────────────
function exportCSV(){
  const header='type,date,ts,odoValue,trip,fuel,fuelMode,paid,level,note,oilInterval,oilOdo';
  const esc=v=>v==null?'':String(v).includes(',')? '"'+String(v).replace(/"/g,'""')+'"' :String(v);
  const rows=[header];
  if(state.setup){
    rows.push(['setup',
      '', state.setup.odo||'', state.setup.odo||'', '',
      state.setup.capacity||'', '', '', state.setup.level??'', '',
      state.setup.oilInterval||'', state.setup.oilOdo||''
    ].map(esc).join(','));
  }
  state.entries.slice().sort((a,b)=>a.ts-b.ts).forEach(e=>{
    rows.push([e.type, e.date, e.ts, e.odoValue??'', e.trip??'',
      e.fuel??'', e.fuelMode??'', e.paid??'', e.level??'', e.note??''
    ].map(esc).join(','));
  });
  const blob=new Blob([rows.join('\n')],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const today=new Date().toISOString().slice(0,10);
  a.href=url; a.download=`mi-tanque-${today}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ── CSV Import ────────────────────────────────────────────
let _csvPending = null;

function importCSV(input){
  const file=input.files[0];
  input.value='';
  if(!file) return;
  const reader=new FileReader();
  reader.onload=function(ev){
    const lines=ev.target.result.split(/\r?\n/).filter(l=>l.trim());
    if(lines.length<2){ alert('CSV vacío o inválido.'); return; }

    const cols=lines[0].split(',');
    const idx=k=>cols.indexOf(k);
    const iType=idx('type'),iDate=idx('date'),iTs=idx('ts');
    const iOdo=idx('odoValue'),iTrip=idx('trip'),iFuel=idx('fuel');
    const iFuelMode=idx('fuelMode'),iPaid=idx('paid'),iLevel=idx('level'),iNote=idx('note');

    function parseRow(line){
      const parts=[]; let cur='',inQ=false;
      for(const ch of line){
        if(ch==='"'){inQ=!inQ;}
        else if(ch===','&&!inQ){parts.push(cur);cur='';}
        else{cur+=ch;}
      }
      parts.push(cur); return parts;
    }

    const entries=[]; let setupRow=null;
    for(let i=1;i<lines.length;i++){
      const p=parseRow(lines[i]);
      const type=p[iType]?.trim();
      if(!type) continue;
      if(type==='setup'){
        const iOilInterval=idx('oilInterval'), iOilOdo=idx('oilOdo');
        setupRow={
          odo:parseFloat(p[iTs])||parseFloat(p[iOdo])||null,
          capacity:parseFloat(p[iFuel])||null,
          level:p[iLevel]!==''?parseFloat(p[iLevel]):0.5,
          oilInterval:(iOilInterval>=0&&p[iOilInterval])?parseFloat(p[iOilInterval])||null:state.setup?.oilInterval||null,
          oilOdo:(iOilOdo>=0&&p[iOilOdo])?parseFloat(p[iOilOdo])||null:state.setup?.oilOdo||null
        };
        continue;
      }
      if(type!=='fuel'&&type!=='status') continue;
      const ts=parseInt(p[iTs]);
      if(!ts||isNaN(ts)) continue;
      entries.push({
        id:ts,type,
        date:p[iDate]?.trim()||new Date(ts).toLocaleDateString('es-SV',{day:'2-digit',month:'short',year:'numeric'}),
        ts,mileage:parseFloat(p[iOdo])||null,odoValue:parseFloat(p[iOdo])||null,
        trip:parseFloat(p[iTrip])||null,fuel:parseFloat(p[iFuel])||null,
        fuelMode:p[iFuelMode]?.trim()||'gallons',paid:parseFloat(p[iPaid])||null,
        level:p[iLevel]!==''?parseFloat(p[iLevel]):null,
        note:p[iNote]?.trim()||'',isOdo:true
      });
    }

    if(!entries.length&&!setupRow){ alert('No se encontraron registros válidos en el CSV.'); return; }

    _csvPending={entries,setupRow};
    const banner=document.getElementById('csv-import-banner');
    document.getElementById('csv-import-count').textContent=
      `${entries.length} registro${entries.length!==1?'s':''} encontrado${entries.length!==1?'s':''}`;
    banner.style.display='flex';
  };
  reader.readAsText(file);
}

function csvDoReplace(){
  if(!_csvPending) return;
  state.entries=_csvPending.entries.sort((a,b)=>b.ts-a.ts);
  if(_csvPending.setupRow) state.setup={...state.setup,..._csvPending.setupRow};
  _csvPending=null;
  persist();
  document.getElementById('csv-import-banner').style.display='none';
  goTo('screen-home');
}

function csvDoMerge(){
  if(!_csvPending) return;
  const existingTs=new Set(state.entries.map(e=>e.ts));
  let added=0;
  _csvPending.entries.forEach(e=>{ if(!existingTs.has(e.ts)){state.entries.push(e);added++;} });
  state.entries.sort((a,b)=>b.ts-a.ts);
  _csvPending=null;
  persist();
  document.getElementById('csv-import-banner').style.display='none';
  goTo('screen-home');
}

function csvCancelImport(){
  _csvPending=null;
  document.getElementById('csv-import-banner').style.display='none';
}

// ── Form: Carga ───────────────────────────────────────────
let fuelMode='gallons';
let formGauge=null;
function initForm(){
  ['f-mileage','f-fuel','f-paid','f-note'].forEach(id=>document.getElementById(id).value='');
  fuelMode='gallons'; setFuelMode('gallons');
  formGauge=createGauge('form-gauge',0.75);
}
function setFuelMode(m){
  fuelMode=m;
  document.getElementById('btn-gal').classList.toggle('active',m==='gallons');
  document.getElementById('btn-usd-fuel').classList.toggle('active',m==='dollars');
  document.getElementById('f-fuel').placeholder=m==='gallons'?'ej. 3.5 galones':'ej. 12.00 (en combustible)';
}
function saveEntry(){
  const odo=parseFloat(document.getElementById('f-mileage').value);
  const fuel=parseFloat(document.getElementById('f-fuel').value);
  const paid=parseFloat(document.getElementById('f-paid').value);
  if(isNaN(odo)||odo<=0){ alert('Ingresa el odómetro.'); return; }
  if(isNaN(paid)||paid<=0){ alert('Ingresa el dinero pagado.'); return; }
  const prev=getLastOdo();
  if(prev&&odo<=prev){ alert('El odómetro debe ser mayor al registro anterior ('+prev.toLocaleString()+' mi).'); return; }
  const trip=(prev&&odo>prev)?(odo-prev):null;
  state.entries.unshift({
    id:Date.now(), type:'fuel',
    date:new Date().toLocaleDateString('es-SV',{day:'2-digit',month:'short',year:'numeric'}),
    ts:Date.now(), mileage:odo, isOdo:true, trip, odoValue:odo,
    fuel:isNaN(fuel)?null:fuel, fuelMode, paid,
    level:formGauge?formGauge.getVal():null,
    note:document.getElementById('f-note').value.trim()
  });
  persist(); goTo('screen-home');
}

// ── Form: Status ──────────────────────────────────────────
let statusGauge=null;
function initStatus(){
  ['st-mileage','st-note'].forEach(id=>document.getElementById(id).value='');
  statusGauge=createGauge('status-gauge', state.setup?.level??0.5);
}
function saveStatus(){
  const odo=parseFloat(document.getElementById('st-mileage').value);
  if(isNaN(odo)||odo<=0){ alert('Ingresa el odómetro.'); return; }
  const prev=getLastOdo();
  if(prev&&odo<=prev){ alert('El odómetro debe ser mayor al registro anterior ('+prev.toLocaleString()+' mi).'); return; }
  const trip=(prev&&odo>prev)?(odo-prev):null;
  state.entries.unshift({
    id:Date.now(), type:'status',
    date:new Date().toLocaleDateString('es-SV',{day:'2-digit',month:'short',year:'numeric'}),
    ts:Date.now(), mileage:odo, isOdo:true, trip, odoValue:odo,
    level:statusGauge?statusGauge.getVal():null,
    note:document.getElementById('st-note').value.trim()
  });
  persist(); goTo('screen-home');
}

// ── Trip calculator ───────────────────────────────────────
let tripUnit='mi';

function initTrip(){
  document.getElementById('trip-dist').value='';
  document.getElementById('trip-result').style.display='none';
  document.getElementById('trip-no-data').style.display='none';
  setTripUnit('mi');
}

function setTripUnit(u){
  tripUnit=u;
  document.getElementById('trip-btn-mi').classList.toggle('active',u==='mi');
  document.getElementById('trip-btn-km').classList.toggle('active',u==='km');
  calcTrip();
}

function calcTrip(){
  const raw=parseFloat(document.getElementById('trip-dist').value);
  const resultEl=document.getElementById('trip-result');
  const noDataEl=document.getElementById('trip-no-data');
  const msgEl=document.getElementById('trip-no-data-msg');

  if(!raw||raw<=0){ resultEl.style.display='none'; noDataEl.style.display='none'; return; }

  const {mpg}=calcStats();
  const fuelEntries=state.entries.filter(e=>e.type==='fuel'&&e.fuelMode==='gallons'&&e.fuel>0&&e.paid>0);
  const lastFuel=fuelEntries[0];
  const ppg=lastFuel?(lastFuel.paid/lastFuel.fuel):null;

  if(!mpg&&!ppg){
    noDataEl.style.display='block'; resultEl.style.display='none';
    msgEl.textContent='Necesitas al menos 2 cargas con odómetro para calcular.';
    return;
  }

  const distMi=tripUnit==='mi'?raw:raw/MI2KM;
  const gals=mpg?distMi/mpg:null;
  const cost=(gals&&ppg)?gals*ppg:null;

  resultEl.style.display='block'; noDataEl.style.display='none';
  document.getElementById('tr-gal').textContent=gals?gals.toFixed(2)+' gal':'— (sin eficiencia aún)';
  document.getElementById('tr-cost').textContent=cost?'$'+cost.toFixed(2):'— (sin precio reciente)';
  document.getElementById('tr-mpg').textContent=mpg?fmtMpg(mpg):'—';
  document.getElementById('tr-ppg').textContent=ppg?'$'+ppg.toFixed(3)+'/gal':'—';
}

// ── Oil alert ─────────────────────────────────────────────
function renderOilAlert(currentOdo){
  const interval=state.setup?.oilInterval;
  const oilOdo=state.setup?.oilOdo;
  const alertEl=document.getElementById('oil-alert');
  const textEl=document.getElementById('oil-alert-text');
  if(!interval||!oilOdo||!currentOdo){ alertEl.style.display='none'; return; }
  const nextChange=oilOdo+interval;
  const remaining=nextChange-currentOdo;
  const warnAt=Math.min(500, interval*0.1);
  if(remaining<=0){
    alertEl.style.display='flex';
    alertEl.style.background='var(--danger-bg)';
    alertEl.style.color='var(--danger)';
    textEl.textContent=`🔧 Cambio de aceite vencido — ${Math.abs(remaining).toLocaleString()} mi pasadas`;
  } else if(remaining<=warnAt){
    alertEl.style.display='flex';
    alertEl.style.background='#fff8e1';
    alertEl.style.color='#b45309';
    textEl.textContent=`🔧 Cambio de aceite en ${remaining.toLocaleString()} mi`;
  } else {
    alertEl.style.display='none';
  }
}

function markOilChanged(){
  const currentOdo=calcStats().lastOdo;
  if(!currentOdo){ alert('No hay odómetro registrado aún.'); return; }
  if(!state.setup) state.setup={};
  state.setup.oilOdo=currentOdo;
  persist();
  renderOilAlert(currentOdo);
}

// ── Home ──────────────────────────────────────────────────
function renderHome(){
  const{total,mpg,mpd,count,lastOdo,totalGals,totalMiles}=calcStats();
  document.getElementById('s-total').textContent='$'+total.toFixed(2);
  document.getElementById('s-count').textContent=count;
  document.getElementById('s-odo').textContent=fmtOdo(lastOdo||state.setup?.odo);
  const mpgEl=document.getElementById('s-mpg');
  const mpdEl=document.getElementById('s-mpd');
  if(mpg){
    mpgEl.innerHTML=fmtMpg(mpg)+'<div style="font-size:11px;color:var(--text3);margin-top:2px">'+(totalMiles?totalMiles.toFixed(0)+' mi / '+totalGals.toFixed(1)+' gal acumulados':'')+'</div>';
  } else {
    mpgEl.textContent='— (necesita 2+ cargas con odómetro)';
  }
  mpdEl.textContent=fmtMpd(mpd);
  renderOilAlert(lastOdo);

  const list=document.getElementById('log-list');
  if(!state.entries.length){
    list.innerHTML='<div class="empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 10h2l1 2h13l1-3H6"/><path d="M7 17a1 1 0 100-2 1 1 0 000 2z"/><path d="M17 17a1 1 0 100-2 1 1 0 000 2z"/></svg><p>Sin registros aún.<br>Usa los botones de abajo para agregar.</p></div>';
    return;
  }
  list.innerHTML=state.entries.map(e=>{
    const isFuel=e.type==='fuel';
    const tripStr=e.trip?fmtDistShort(e.trip):'';
    const fuelStr=isFuel&&e.fuel?(e.fuelMode==='gallons'?e.fuel+' gal':'$'+e.fuel.toFixed(2)):'';
    const mpgVal=(e.trip&&e.fuel&&e.fuelMode==='gallons')?(e.trip/e.fuel):null;
    const mpgStr=mpgVal?mpgVal.toFixed(1)+' mpg':'';
    const levelStr=e.level!=null?nearestLevel(e.level)+' ('+Math.round(e.level*100)+'%)':'';
    const typeBadge=isFuel
      ?'<span class="log-type type-fuel">⛽ Carga</span>'
      :'<span class="log-type type-status">📍 Status</span>';
    return `<div class="log-item ${isFuel?'is-fuel':'is-status'}" onclick="showDetail(${e.id})">
      <div class="log-row">
        <div>
          <div class="log-date">${e.date} ${typeBadge}</div>
          ${e.note?`<div class="log-station">${e.note}</div>`:''}
        </div>
        ${isFuel?`<div class="log-cost">$${e.paid.toFixed(2)}</div>`:''}
      </div>
      <div class="log-metas">
        ${tripStr?`<span class="meta">🛣 ${tripStr}</span>`:''}
        ${fuelStr?`<span class="meta">⛽ ${fuelStr}</span>`:''}
        ${mpgStr?`<span class="meta">📊 ${mpgStr}</span>`:''}
        ${levelStr?`<span class="meta">🟢 ${levelStr}</span>`:''}
      </div>
    </div>`;
  }).join('');
}

// ── Edit ──────────────────────────────────────────────────
let editId=null, editFuelMode='gallons', editGauge=null;

function showEdit(id){
  const e=state.entries.find(x=>x.id===id);
  if(!e) return;
  editId=id;

  // Fecha: usar ts para pre-llenar el input date
  const d=new Date(e.ts);
  const yyyy=d.getFullYear();
  const mm=String(d.getMonth()+1).padStart(2,'0');
  const dd=String(d.getDate()).padStart(2,'0');
  document.getElementById('e-date').value=`${yyyy}-${mm}-${dd}`;

  document.getElementById('e-mileage').value=e.mileage||'';

  const fuelSec=document.getElementById('e-fuel-section');
  if(e.type==='fuel'){
    fuelSec.style.display='';
    editFuelMode=e.fuelMode||'gallons';
    setEditFuelMode(editFuelMode);
    document.getElementById('e-fuel').value=e.fuel!=null?e.fuel:'';
    document.getElementById('e-paid').value=e.paid||'';
  } else {
    fuelSec.style.display='none';
  }

  editGauge=createGauge('edit-gauge', e.level??0.5);
  document.getElementById('e-note').value=e.note||'';
  document.getElementById('e-del-btn').onclick=()=>deleteEntry(id);
  // Back va a detail del mismo registro
  document.getElementById('edit-back-btn').onclick=()=>showDetail(id);

  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-edit').classList.add('active');
}

function setEditFuelMode(m){
  editFuelMode=m;
  document.getElementById('e-btn-gal').classList.toggle('active',m==='gallons');
  document.getElementById('e-btn-usd').classList.toggle('active',m==='dollars');
  document.getElementById('e-fuel').placeholder=m==='gallons'?'ej. 3.5 galones':'ej. 12.00';
}

function saveEdit(){
  const e=state.entries.find(x=>x.id===editId);
  if(!e) return;

  const dateVal=document.getElementById('e-date').value;
  const odo=parseFloat(document.getElementById('e-mileage').value);
  if(!dateVal){ alert('Ingresa la fecha.'); return; }
  if(isNaN(odo)||odo<=0){ alert('Ingresa el odómetro.'); return; }

  if(e.type==='fuel'){
    const paid=parseFloat(document.getElementById('e-paid').value);
    if(isNaN(paid)||paid<=0){ alert('Ingresa el dinero pagado.'); return; }
    const fuel=parseFloat(document.getElementById('e-fuel').value);
    e.fuel=isNaN(fuel)?null:fuel;
    e.fuelMode=editFuelMode;
    e.paid=paid;
  }

  // Recalcular ts y fecha
  const newDate=new Date(dateVal+'T12:00:00');
  e.ts=newDate.getTime();
  e.date=newDate.toLocaleDateString('es-SV',{day:'2-digit',month:'short',year:'numeric'});

  // Recalcular trip: entrada anterior con odoValue (excluir self, ordenar por ts)
  const prev=state.entries
    .filter(x=>x.id!==editId&&x.odoValue&&x.ts<e.ts)
    .sort((a,b)=>b.ts-a.ts)[0];
  const prevOdo=prev?prev.odoValue:(state.setup?.odo||null);

  e.mileage=odo;
  e.odoValue=odo;
  e.isOdo=true;
  e.trip=(prevOdo&&odo>prevOdo)?(odo-prevOdo):null;
  e.level=editGauge?editGauge.getVal():e.level;
  e.note=document.getElementById('e-note').value.trim();

  // Reordenar por ts descendente
  state.entries.sort((a,b)=>b.ts-a.ts);
  persist();
  goTo('screen-home');
}

// ── Detail ────────────────────────────────────────────────
function showDetail(id){
  const e=state.entries.find(x=>x.id===id);
  if(!e) return;
  const isFuel=e.type==='fuel';
  const fuelStr=e.fuel?(e.fuelMode==='gallons'?e.fuel+' gal':'$'+e.fuel.toFixed(2)+' combustible'):'—';
  const mpgVal=(e.trip&&e.fuel&&e.fuelMode==='gallons')?(e.trip/e.fuel):null;
  const mpdVal=(e.trip&&e.paid)?(e.trip/e.paid):null;
  const levelStr=e.level!=null?nearestLevel(e.level)+' ('+Math.round(e.level*100)+'%)':'—';
  const typeLabel=isFuel?'⛽ Carga de combustible':'📍 Actualización de status';

  let html=`<div style="margin-bottom:14px"><span class="log-type ${isFuel?'type-fuel':'type-status'}" style="font-size:13px;padding:4px 12px">${typeLabel}</span></div>
  <div class="detail-grid">
    <div class="dc"><div class="dl">Fecha</div><div class="dv">${e.date}</div></div>
    ${isFuel?`<div class="dc"><div class="dl">Pagado</div><div class="dv">$${e.paid.toFixed(2)}</div></div>`:'<div class="dc"><div class="dl">Nivel</div><div class="dv">'+levelStr+'</div></div>'}
    <div class="dc wide"><div class="dl">Odómetro</div><div class="dv">${fmtDist(e.mileage)}</div></div>
    <div class="dc wide"><div class="dl">Trip</div><div class="dv">${e.trip?fmtDist(e.trip):'—'}</div></div>
    ${isFuel?`
    <div class="dc"><div class="dl">Gasolina</div><div class="dv">${fuelStr}</div></div>
    <div class="dc"><div class="dl">Nivel tras carga</div><div class="dv">${levelStr}</div></div>
    <div class="dc wide"><div class="dl">Eficiencia este viaje (estimado)</div><div class="dv">${fmtMpg(mpgVal)}</div></div>
    <div class="dc wide"><div class="dl">Rendimiento</div><div class="dv">${fmtMpd(mpdVal)}</div></div>
    <div class="dc wide"><div class="dl">Costo por distancia</div><div class="dv">${fmtCpp(e.paid,e.trip)}</div></div>`:''}
  </div>`;
  if(e.note) html+=`<div class="note-row">📍 ${e.note}</div>`;
  html+=`<button class="save-btn" style="margin-top:8px" onclick="showEdit(${e.id})">✏️ Editar</button>`;
  html+=`<button class="del-btn" style="margin-top:8px" onclick="deleteEntry(${e.id})">🗑 Eliminar este registro</button>`;

  document.getElementById('detail-content').innerHTML=html;
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-detail').classList.add('active');
}

function deleteEntry(id){
  if(!confirm('¿Eliminar este registro?')) return;
  state.entries=state.entries.filter(e=>e.id!==id);
  persist(); goTo('screen-home');
}

// ── Init ──────────────────────────────────────────────────
if(!state.setup){ initSetup(); goTo('screen-setup'); }
else { goTo('screen-home'); }
