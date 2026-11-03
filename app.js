const $ = id => document.getElementById(id) || document.createElement("i"); // pages only contain some of the blocks
const fmt = n => n.toFixed(2);
const D = s => new Date(s+"T00:00:00");
const fdate = d => D(d).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
const FUELS = [{key:"petrol",name:"Petrol",color:"#0a7d4f"},{key:"diesel",name:"High Speed Diesel",color:"#2563eb"}];
$("yr").textContent = new Date().getFullYear();

// dark mode toggle (remembered when storage is available)
(function(){
  const root = document.documentElement, btn = $("theme");
  let t = null; try{ t = localStorage.getItem("theme"); }catch(e){}
  if(!t) t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const apply = v => { root.dataset.theme = v; btn.textContent = v==="dark" ? "☀" : "☾"; try{ localStorage.setItem("theme",v); }catch(e){} };
  apply(t);
  btn.onclick = () => apply(root.dataset.theme==="dark" ? "light" : "dark");
})();

if(!window.PRICES || !PRICES.days.length){
  document.querySelector("main").innerHTML = '<div class="panel">Prices could not be loaded. Please try again later.</div>';
} else {
const DAYS = PRICES.days, ASC = DAYS.slice().reverse(), cur = DAYS[0], prev = DAYS[1], first = ASC[0];

$("bar").textContent = "OGRA notification · Effective " + D(cur.date).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).replace(/,/g,"").toUpperCase();

// petrol stats
let lo = ASC[0], hi = ASC[0], changes = 0;
ASC.forEach((r,i)=>{ if(r.petrol<lo.petrol) lo=r; if(r.petrol>hi.petrol) hi=r; if(i&&r.petrol!==ASC[i-1].petrol) changes++; });
const d = cur.petrol-prev.petrol;
$("lead").innerHTML = `Petrol costs <b class="mono">Rs ${fmt(cur.petrol)}</b> per litre in Pakistan today, ${d<0?"down":d>0?"up":"unchanged"}${d?` Rs ${fmt(Math.abs(d))}`:""} from ${fdate(prev.date)}. Since ${fdate(first.date)} it changed price ${changes} times, from a low of Rs ${fmt(lo.petrol)} on ${fdate(lo.date)} to a high of Rs ${fmt(hi.petrol)} on ${fdate(hi.date)}.`;
const cls = d>0?"up":d<0?"down":"flat", ar = d>0?"▲":d<0?"▼":"–";
$("stats").innerHTML =
  `<div class="stat"><div class="k">Petrol today</div><div class="v mono">Rs ${fmt(cur.petrol)}</div><div class="s chg ${cls}">${ar} ${fmt(Math.abs(d))} · <a class="src" href="${cur.source}" target="_blank" rel="noopener" style="color:inherit">OGRA PDF</a></div></div>
   <div class="stat"><div class="k">Lowest</div><div class="v mono">Rs ${fmt(lo.petrol)}</div><div class="s">${fdate(lo.date)}</div></div>
   <div class="stat"><div class="k">Highest</div><div class="v mono">Rs ${fmt(hi.petrol)}</div><div class="s">${fdate(hi.date)}</div></div>
   <div class="stat"><div class="k">Price changes</div><div class="v mono">${changes}</div><div class="s">since ${fdate(first.date)}</div></div>`;
$("notice").textContent = "Figures cover " + DAYS.length + " OGRA daily notifications from " + fdate(first.date) + ". Each price links to the original OGRA PDF. Sundays and holidays carry the previous day's price.";

// diesel + kerosene cards
const dd = cur.diesel-prev.diesel, dc = dd>0?"up":dd<0?"down":"flat";
const ker = (PRICES.kerosene||[]).slice().sort((a,b)=>b.date<a.date?-1:1)[0];
$("cards").innerHTML =
  `<div class="card"><div class="k">High Speed Diesel</div><div class="v mono">Rs ${fmt(cur.diesel)} <small>per litre</small></div><div class="chg ${dc}">${dd>0?"▲":dd<0?"▼":"–"} ${fmt(Math.abs(dd))} vs ${fdate(prev.date)}</div><a href="${cur.source}" target="_blank" rel="noopener">Source: OGRA notification</a></div>` +
  (ker ? `<div class="card"><div class="k">Kerosene Oil · ex-depot, weekly</div><div class="v mono">Rs ${fmt(ker.price)} <small>per litre</small></div><div class="chg flat">Effective ${fdate(ker.date)}</div><a href="${ker.source}" target="_blank" rel="noopener">Source: OGRA notification</a></div>` : "");

// history table
$("hist").innerHTML = "<tr><th>Effective date</th><th>Petrol</th><th>Diesel</th><th>Source</th></tr>" +
  DAYS.map(r=>`<tr><td>${fdate(r.date)}</td><td class="n">${fmt(r.petrol)}</td><td class="n">${fmt(r.diesel)}</td><td><a href="${r.source}" target="_blank" rel="noopener">PDF</a></td></tr>`).join("");

// chart
(function(){
  const W=700,H=280,L=44,R=14,T=12,B=30, data=ASC;
  const vals = data.flatMap(r=>FUELS.map(f=>r[f.key]));
  const lo = Math.floor(Math.min(...vals)/10)*10, hi = Math.ceil(Math.max(...vals)/10)*10;
  const x = i => L + i*(W-L-R)/(data.length-1), y = v => T + (hi-v)*(H-T-B)/(hi-lo);
  let s = "";
  for(let k=0;k<=4;k++){ const v=lo+k*(hi-lo)/4;
    s += `<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="currentColor" opacity=".12"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="currentColor" opacity=".6">${Math.round(v)}</text>`; }
  const step = Math.ceil(data.length/6);
  data.forEach((r,i)=>{ if(i%step===0) s += `<text x="${x(i)}" y="${H-8}" text-anchor="middle" font-size="11" fill="currentColor" opacity=".6">${D(r.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</text>`; });
  FUELS.forEach(f=>{
    s += `<polyline points="${data.map((r,i)=>x(i)+","+y(r[f.key])).join(" ")}" fill="none" stroke="${f.color}" stroke-width="2" stroke-linejoin="round"/>`;
    data.forEach((r,i)=>{ s += `<circle cx="${x(i)}" cy="${y(r[f.key])}" r="6" fill="${f.color}" opacity="0"><title>${f.name} ${fdate(r.date)}: ${fmt(r[f.key])}</title></circle>`; });
  });
  $("chart").innerHTML = s; $("chart").style.color = "var(--ink)";
  $("legend").innerHTML = FUELS.map(f=>`<span><i style="background:${f.color}"></i>${f.name}</span>`).join("");
})();

// monthly average: every calendar day takes the latest price on or before it
(function(){
  const end = D(cur.date), byDate = Object.fromEntries(ASC.map(r=>[r.date,r]));
  const iso = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const rows = {}; let last = ASC[0];
  for(let d=new Date(D(first.date)); d<=end; d.setDate(d.getDate()+1)){
    last = byDate[iso(d)] || last;
    const k = iso(d).slice(0,7);
    const m = rows[k] || (rows[k]={k, n:0, petrol:0, diesel:0, d:new Date(d)});
    m.n++; m.petrol+=last.petrol; m.diesel+=last.diesel;
  }
  const list = Object.values(rows).sort((a,b)=>b.k<a.k?-1:1), lastMonth = iso(end).slice(0,7);
  $("avg").innerHTML = "<tr><th>Month</th><th>Petrol</th><th>Diesel</th></tr>" + list.map((m,i)=>{
    const p=list[i+1], dp = p? m.petrol/m.n - p.petrol/p.n : null;
    const partial = m.k===lastMonth || m.k===list[list.length-1].k;
    return `<tr><td>${m.d.toLocaleDateString("en-GB",{month:"short",year:"numeric"})}${partial?" *":""}</td><td class="n">${fmt(m.petrol/m.n)}${dp!=null?` <span class="chg ${dp>0?"up":dp<0?"down":"flat"}">${dp>0?"▲":dp<0?"▼":"–"}</span>`:""}</td><td class="n">${fmt(m.diesel/m.n)}</td></tr>`;
  }).join("");
  $("avgnote").textContent = "* Partial month: current month counts days up to " + fdate(cur.date) + "; the first month counts from " + fdate(first.date) + ". Arrow = petrol vs previous month.";
})();
}
