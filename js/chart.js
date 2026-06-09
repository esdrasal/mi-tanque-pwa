function renderMileageChart(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const points = state.entries
    .filter(e => e.odoValue)
    .map(e => ({ ts: e.ts, date: e.date, odo: e.odoValue }))
    .sort((a, b) => a.ts - b.ts);

  if (points.length < 2) {
    el.innerHTML = '<div class="empty" style="padding:40px 20px"><p>Necesitas 2+ registros con odómetro<br>para ver el gráfico.</p></div>';
    return;
  }

  const W = Math.min(el.clientWidth || 340, 480) - 32;
  const H = 160;
  const PAD = { top: 14, right: 16, bottom: 36, left: 58 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const odoVals = points.map(p => p.odo);
  const minY = Math.floor(Math.min(...odoVals) / 100) * 100;
  const maxY = Math.ceil(Math.max(...odoVals) / 100) * 100;
  const rangeY = maxY - minY || 100;
  const minX = points[0].ts, maxX = points[points.length - 1].ts;
  const rangeX = maxX - minX || 1;

  function px(ts) { return PAD.left + ((ts - minX) / rangeX) * cw; }
  function py(v)  { return PAD.top  + (1 - (v - minY) / rangeY) * ch; }

  // Y ticks — 3-4 evenly spaced
  const yStep = Math.ceil(rangeY / 3 / 100) * 100;
  const yTicks = [];
  for (let v = minY; v <= maxY + 1; v += yStep) yTicks.push(v);

  const linePts = points.map(p => `${px(p.ts).toFixed(1)},${py(p.odo).toFixed(1)}`).join(' ');
  const areaD = `M${px(points[0].ts).toFixed(1)},${(PAD.top + ch).toFixed(1)} `
    + points.map(p => `L${px(p.ts).toFixed(1)},${py(p.odo).toFixed(1)}`).join(' ')
    + ` L${px(points[points.length-1].ts).toFixed(1)},${(PAD.top + ch).toFixed(1)} Z`;

  const labelIdxs = new Set([0, points.length - 1]);
  if (points.length > 2) labelIdxs.add(Math.floor(points.length / 2));
  const dateLabels = [...labelIdxs].map(i => {
    const p = points[i];
    const short = p.date.replace(/\s+\d{4}$/, '');
    return `<text x="${px(p.ts).toFixed(1)}" y="${(PAD.top + ch + 16).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--text3)">${short}</text>`;
  }).join('');

  const totalMi = points[points.length-1].odo - points[0].odo;

  el.innerHTML = `
    <div style="background:var(--bg2);border-radius:var(--radius-lg);padding:14px 16px 10px">
      <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px">Odómetro — historial</div>
      <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">
        <defs>
          <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--info)" stop-opacity="0.2"/>
            <stop offset="100%" stop-color="var(--info)" stop-opacity="0.01"/>
          </linearGradient>
        </defs>
        ${yTicks.map(v => `<line x1="${PAD.left}" y1="${py(v).toFixed(1)}" x2="${PAD.left+cw}" y2="${py(v).toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`).join('')}
        <path d="${areaD}" fill="url(#mg)"/>
        <polyline points="${linePts}" fill="none" stroke="var(--info)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${points.map(p => `<circle cx="${px(p.ts).toFixed(1)}" cy="${py(p.odo).toFixed(1)}" r="3.5" fill="var(--bg)" stroke="var(--info)" stroke-width="2"/>`).join('')}
        ${yTicks.map(v => `<text x="${(PAD.left-5).toFixed(1)}" y="${(py(v)+4).toFixed(1)}" text-anchor="end" font-size="9" fill="var(--text3)">${(v/1000).toFixed(0)}k</text>`).join('')}
        ${dateLabels}
        <line x1="${PAD.left}" y1="${(PAD.top+ch).toFixed(1)}" x2="${PAD.left+cw}" y2="${(PAD.top+ch).toFixed(1)}" stroke="var(--border2)" stroke-width="1"/>
        <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${(PAD.top+ch).toFixed(1)}" stroke="var(--border2)" stroke-width="1"/>
      </svg>
      <div style="display:flex;justify-content:space-between;margin-top:10px;flex-wrap:wrap;gap:6px">
        <div style="font-size:12px;color:var(--text2)">Actual: <b>${fmtOdo(points[points.length-1].odo)}</b></div>
        <div style="font-size:12px;color:var(--text2)">Recorrido: <b>${fmtDist(totalMi)}</b></div>
      </div>
    </div>`;
}

function renderPriceChart(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const points = state.entries
    .filter(e => e.type === 'fuel' && e.fuelMode === 'gallons' && e.fuel > 0)
    .map(e => ({ ts: e.ts, date: e.date, ppg: e.paid / e.fuel, paid: e.paid, gal: e.fuel }))
    .sort((a, b) => a.ts - b.ts);

  if (points.length < 2) {
    el.innerHTML = '<div class="empty" style="padding:40px 20px"><p>Necesitas 2+ cargas en galones<br>para ver el gráfico.</p></div>';
    return;
  }

  const W = Math.min(el.clientWidth || 340, 480) - 32;
  const H = 180;
  const PAD = { top: 18, right: 16, bottom: 36, left: 46 };
  const cw = W - PAD.left - PAD.right;
  const ch = H - PAD.top - PAD.bottom;

  const ppgVals = points.map(p => p.ppg);
  const minY = Math.floor(Math.min(...ppgVals) * 10) / 10;
  const maxY = Math.ceil(Math.max(...ppgVals) * 10) / 10;
  const rangeY = maxY - minY || 0.5;
  const minX = points[0].ts, maxX = points[points.length - 1].ts;
  const rangeX = maxX - minX || 1;

  function px(ts) { return PAD.left + ((ts - minX) / rangeX) * cw; }
  function py(v)  { return PAD.top  + (1 - (v - minY) / rangeY) * ch; }

  // Y axis ticks
  const yTicks = [];
  const step = rangeY <= 0.5 ? 0.1 : rangeY <= 1.5 ? 0.25 : 0.5;
  for (let v = minY; v <= maxY + 0.001; v = Math.round((v + step) * 100) / 100) yTicks.push(v);

  // polyline path
  const linePts = points.map(p => `${px(p.ts).toFixed(1)},${py(p.ppg).toFixed(1)}`).join(' ');

  // area fill path
  const areaD = `M${px(points[0].ts).toFixed(1)},${(PAD.top + ch).toFixed(1)} `
    + points.map(p => `L${px(p.ts).toFixed(1)},${py(p.ppg).toFixed(1)}`).join(' ')
    + ` L${px(points[points.length-1].ts).toFixed(1)},${(PAD.top + ch).toFixed(1)} Z`;

  // avg
  const avg = ppgVals.reduce((s, v) => s + v, 0) / ppgVals.length;

  // date labels — first, last, and middle if gap is big enough
  const labelIdxs = new Set([0, points.length - 1]);
  if (points.length > 2) labelIdxs.add(Math.floor(points.length / 2));
  const dateLabels = [...labelIdxs].map(i => {
    const p = points[i];
    const short = p.date.replace(/\s+\d{4}$/, ''); // remove year
    return `<text x="${px(p.ts).toFixed(1)}" y="${(PAD.top + ch + 16).toFixed(1)}" text-anchor="middle" font-size="9" fill="var(--text3)">${short}</text>`;
  }).join('');

  const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;overflow:visible">
    <defs>
      <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0.01"/>
      </linearGradient>
    </defs>
    <!-- grid lines -->
    ${yTicks.map(v => `<line x1="${PAD.left}" y1="${py(v).toFixed(1)}" x2="${PAD.left + cw}" y2="${py(v).toFixed(1)}" stroke="var(--border)" stroke-width="1"/>`).join('')}
    <!-- avg line -->
    <line x1="${PAD.left}" y1="${py(avg).toFixed(1)}" x2="${PAD.left + cw}" y2="${py(avg).toFixed(1)}" stroke="var(--text3)" stroke-width="1" stroke-dasharray="4 3"/>
    <!-- area -->
    <path d="${areaD}" fill="url(#cg)"/>
    <!-- line -->
    <polyline points="${linePts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <!-- dots + tooltips -->
    ${points.map(p => `<circle cx="${px(p.ts).toFixed(1)}" cy="${py(p.ppg).toFixed(1)}" r="4" fill="var(--bg)" stroke="var(--accent)" stroke-width="2"/>`).join('')}
    <!-- Y axis labels -->
    ${yTicks.map(v => `<text x="${(PAD.left - 5).toFixed(1)}" y="${(py(v) + 4).toFixed(1)}" text-anchor="end" font-size="9" fill="var(--text3)">$${v.toFixed(2)}</text>`).join('')}
    <!-- avg label -->
    <text x="${(PAD.left + cw + 4).toFixed(1)}" y="${(py(avg) + 4).toFixed(1)}" font-size="9" fill="var(--text3)">avg</text>
    <!-- X axis date labels -->
    ${dateLabels}
    <!-- X axis line -->
    <line x1="${PAD.left}" y1="${(PAD.top + ch).toFixed(1)}" x2="${PAD.left + cw}" y2="${(PAD.top + ch).toFixed(1)}" stroke="var(--border2)" stroke-width="1"/>
    <!-- Y axis line -->
    <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${(PAD.top + ch).toFixed(1)}" stroke="var(--border2)" stroke-width="1"/>
  </svg>`;

  const last = points[points.length - 1];
  const first = points[0];
  const trend = last.ppg - first.ppg;
  const trendStr = trend > 0.01 ? `↑ +$${trend.toFixed(2)}/gal desde el inicio` : trend < -0.01 ? `↓ -$${Math.abs(trend).toFixed(2)}/gal desde el inicio` : '→ precio estable';

  el.innerHTML = `
    <div style="background:var(--bg2);border-radius:var(--radius-lg);padding:14px 16px 10px">
      <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:10px">Precio por galón — historial</div>
      ${svg}
      <div style="display:flex;justify-content:space-between;margin-top:12px;flex-wrap:wrap;gap:6px">
        <div style="font-size:12px;color:var(--text2)">Últ: <b>$${last.ppg.toFixed(3)}/gal</b></div>
        <div style="font-size:12px;color:var(--text2)">Prom: <b>$${avg.toFixed(3)}/gal</b></div>
        <div style="font-size:12px;color:var(--text2)">Mín: <b>$${Math.min(...ppgVals).toFixed(3)}</b></div>
        <div style="font-size:12px;color:var(--text2)">Máx: <b>$${Math.max(...ppgVals).toFixed(3)}</b></div>
      </div>
      <div style="font-size:12px;color:var(--text3);margin-top:6px">${trendStr}</div>
    </div>`;
}
