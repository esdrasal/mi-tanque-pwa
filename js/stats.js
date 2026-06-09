const MI2KM = 1.60934;
const GAL2L  = 3.78541;

function fmtDist(mi){ if(!mi&&mi!==0) return '—'; return mi.toLocaleString(undefined,{maximumFractionDigits:1})+' mi / '+(mi*MI2KM).toLocaleString(undefined,{maximumFractionDigits:1})+' km'; }
function fmtDistShort(mi){ if(!mi) return ''; return mi.toFixed(1)+' mi ('+(mi*MI2KM).toFixed(1)+' km)'; }
function fmtOdo(mi){ if(!mi) return '—'; return mi.toLocaleString()+' mi / '+Math.round(mi*MI2KM).toLocaleString()+' km'; }
function fmtMpg(mpg){ if(!mpg) return '—'; return mpg.toFixed(1)+' mpg · '+(mpg/MI2KM*GAL2L).toFixed(1)+' km/L'; }
function fmtMpd(mpd){ if(!mpd) return '—'; return mpd.toFixed(1)+' mi/$ · '+(mpd*MI2KM).toFixed(1)+' km/$'; }
function fmtCpp(paid,trip){ if(!paid||!trip) return '—'; return '$'+(paid/trip).toFixed(3)+'/mi · $'+(paid/(trip*MI2KM)).toFixed(3)+'/km'; }

function calcStats(){
  const es=state.entries;
  const fuelEntries=es.filter(e=>e.type==='fuel');
  const total=fuelEntries.reduce((s,e)=>s+e.paid,0);
  const lastOdo=es.length?(es[0].odoValue||null):null;
  const initOdo=state.setup?.odo||null;
  const totalGals=fuelEntries.filter(e=>e.fuel&&e.fuelMode==='gallons').reduce((s,e)=>s+e.fuel,0);
  const totalMiles=(lastOdo&&initOdo&&lastOdo>initOdo)?(lastOdo-initOdo):null;
  const mpg=(totalMiles&&totalGals>0)?(totalMiles/totalGals):null;
  const mpd=(totalMiles&&total>0)?(totalMiles/total):null;
  return{total,mpg,mpd,count:fuelEntries.length,lastOdo,totalGals,totalMiles};
}
