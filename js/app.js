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
}

function initChart(){ renderMileageChart('chart-mileage'); renderPriceChart('chart-price'); }

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
function initSettings(){ document.getElementById('set-odo').value=state.setup?.odo||''; document.getElementById('set-cap').value=state.setup?.capacity||''; }
function saveSettings(){
  if(!state.setup) state.setup={};
  const odo=parseFloat(document.getElementById('set-odo').value);
  if(odo) state.setup.odo=odo;
  state.setup.capacity=parseFloat(document.getElementById('set-cap').value)||null;
  persist(); alert('Guardado.'); goTo('screen-home');
}
function resetAll(){ if(!confirm('¿Borrar todos los datos?')) return; state={entries:[],setup:null}; persist(); location.reload(); }

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
