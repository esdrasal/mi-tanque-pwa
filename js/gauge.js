const LEVELS = ['E','1/4','1/2','3/4','F'];
const LVALS  = [0, 0.25, 0.5, 0.75, 1.0];

function nearestLevel(v){ return LEVELS[LVALS.reduce((bi,lv,i)=>Math.abs(lv-v)<Math.abs(LVALS[bi]-v)?i:bi,0)]; }

function createGauge(containerId, initVal){
  const el=document.getElementById(containerId);
  const TANK=15.7, RESERVE=1.0;
  const RFRAC=RESERVE/TANK;
  const STEP=0.5/TANK;
  // Arc: E at 210° (7 o'clock), F at 330° (5 o'clock), clockwise 120° span over top
  const DEG_E=210, DEG_F=330, SPAN=120;
  let val=Math.max(0,Math.min(1,initVal??0.5));

  function toXY(deg,r,cx,cy){ const rad=deg*Math.PI/180; return{x:+(cx+r*Math.cos(rad)).toFixed(2),y:+(cy+r*Math.sin(rad)).toFixed(2)}; }
  function fracToDeg(f){ return((DEG_E+f*SPAN)%360+360)%360; }
  function makePath(f0,f1,r,cx,cy){
    const d0=fracToDeg(f0),d1=fracToDeg(f1);
    const p0=toXY(d0,r,cx,cy),p1=toXY(d1,r,cx,cy);
    const sp=(f1-f0)*SPAN; const large=sp>180?1:0;
    return `M${p0.x} ${p0.y} A${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`;
  }

  const CX=110,CY=95,R=78;

  function buildTicks(){
    let s='';
    for(let i=0;i<=12;i++){
      const f=i/12,deg=fracToDeg(f);
      const isMain=(i%3===0);
      const r1=isMain?R-14:R-8,r2=R+2;
      const p1=toXY(deg,r1,CX,CY),p2=toXY(deg,r2,CX,CY);
      const col=f<=RFRAC?'#d32f2f':'var(--text3)';
      s+=`<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" stroke="${col}" stroke-width="${isMain?2.5:1.2}" stroke-linecap="round"/>`;
    }
    return s;
  }

  const eP=toXY(DEG_E,R+16,CX,CY);
  const fP=toXY(DEG_F,R+16,CX,CY);
  const resP=toXY(fracToDeg(RFRAC*0.5),R+18,CX,CY);

  el.innerHTML=`<div class="gauge-wrap">
    <div class="gauge-lbl">Nivel — Outlander 2003</div>
    <svg class="gauge-svg" width="220" height="130" viewBox="0 0 220 130">
      <circle cx="${CX}" cy="${CY}" r="${R+14}" fill="var(--bg3)" stroke="var(--border2)" stroke-width="1"/>
      <circle cx="${CX}" cy="${CY}" r="${R+10}" fill="var(--bg)" stroke="var(--border)" stroke-width="0.5"/>
      <path d="${makePath(0,1,R,CX,CY)}" fill="none" stroke="var(--border2)" stroke-width="7" stroke-linecap="butt"/>
      <path d="${makePath(0,RFRAC,R,CX,CY)}" fill="none" stroke="#d32f2f" stroke-width="7" stroke-linecap="butt" opacity="0.3"/>
      <path id="${containerId}-fill" fill="none" stroke-width="7" stroke-linecap="butt"/>
      ${buildTicks()}
      <text x="${(eP.x-6).toFixed(1)}" y="${(eP.y+5).toFixed(1)}" font-size="12" font-weight="700" fill="#d32f2f">E</text>
      <text x="${(fP.x-4).toFixed(1)}" y="${(fP.y+5).toFixed(1)}" font-size="12" font-weight="700" fill="#2e7d32">F</text>
      <text x="${(resP.x-7).toFixed(1)}" y="${(resP.y).toFixed(1)}" font-size="8" fill="#d32f2f" opacity="0.8">RES</text>
      <line id="${containerId}-needle" stroke="#d32f2f" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="${CX}" cy="${CY}" r="9" fill="var(--text2)" stroke="var(--border2)" stroke-width="1.5"/>
      <circle cx="${CX}" cy="${CY}" r="4" fill="var(--bg)"/>
    </svg>
    <div class="gauge-val" id="${containerId}-val"></div>
    <div class="gauge-taps" id="${containerId}-taps"></div>
    <div class="gauge-fine">
      <button class="gauge-fine-btn" id="${containerId}-minus">−</button>
      <span class="gauge-fine-val" id="${containerId}-fine"></span>
      <button class="gauge-fine-btn" id="${containerId}-plus">+</button>
    </div>
  </div>`;

  const tapsEl=document.getElementById(containerId+'-taps');
  LEVELS.forEach((l,i)=>{ const b=document.createElement('button'); b.className='gauge-tap'; b.textContent=l; b.onclick=()=>setVal(LVALS[i]); tapsEl.appendChild(b); });
  document.getElementById(containerId+'-minus').onclick=()=>setVal(val-STEP);
  document.getElementById(containerId+'-plus').onclick=()=>setVal(val+STEP);

  function setVal(v){
    val=Math.max(0,Math.min(1,v));
    const deg=fracToDeg(val);
    const fillEl=document.getElementById(containerId+'-fill');
    const needleEl=document.getElementById(containerId+'-needle');
    const valEl=document.getElementById(containerId+'-val');
    const fineEl=document.getElementById(containerId+'-fine');
    if(val>0.005){
      fillEl.setAttribute('d',makePath(0,val,R,CX,CY));
      fillEl.setAttribute('stroke',val<=RFRAC?'#d32f2f':val<0.28?'#e65100':val<0.55?'#f59f00':'#2e7d32');
    } else { fillEl.setAttribute('d',''); }
    const tip=toXY(deg,R-16,CX,CY);
    needleEl.setAttribute('x1',CX); needleEl.setAttribute('y1',CY);
    needleEl.setAttribute('x2',tip.x); needleEl.setAttribute('y2',tip.y);
    tapsEl.querySelectorAll('.gauge-tap').forEach((b,i)=>{ b.classList.toggle('active',Math.abs(LVALS[i]-val)<STEP*3); });
    const gals=(val*TANK).toFixed(1);
    const usable=Math.max(0,val*TANK-RESERVE).toFixed(1);
    valEl.textContent=nearestLevel(val)+' ('+Math.round(val*100)+'%)';
    fineEl.textContent='~'+gals+' gal · '+usable+' usables';
    if(val*TANK<=RESERVE) fineEl.textContent+=' ⚠️';
  }
  setVal(val);
  return{ getVal:()=>val, setVal };
}
