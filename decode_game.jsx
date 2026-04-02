import { useState, useEffect, useRef } from "react";

const F=360,T=60;

function Field({sc,run}){
  const[t,setT]=useState(0);const rf=useRef(),t0=useRef();
  useEffect(()=>{if(!run){setT(0);t0.current=null;return;}const tk=s=>{if(!t0.current)t0.current=s;setT((s-t0.current)/1000);rf.current=requestAnimationFrame(tk);};rf.current=requestAnimationFrame(tk);return()=>cancelAnimationFrame(rf.current);},[run]);
  const px=v=>v/100*F,lr=(a,b,f)=>a+(b-a)*Math.max(0,Math.min(1,f));
  const bxy=b=>{if(!b.a||!run)return{x:px(b.x),y:px(b.y)};const p=b.a,d=b.d||2,pr=Math.min(1,t/d),n=p.length-1,sf=pr*n,si=Math.min(~~sf,n-1),sp=sf-si;return{x:lr(px(p[si][0]),px(p[si+1][0]),sp),y:lr(px(p[si][1]),px(p[si+1][1]),sp)};};
  const fxp=e=>{if(!run)return null;const el=t-(e.at||0);if(el<0)return null;const pr=Math.min(1,el/(e.dr||.8));return{x:lr(px(e.f[0]),px(e.t[0]),pr),y:lr(px(e.f[1]),px(e.t[1]),pr),pr};};
  const bots=sc?.bots||{r:[],b:[]},fx=sc?.fx||[],pd=sc?.pd||"";

  return(
  <svg viewBox="-6 -20 372 440" style={{width:"100%",maxWidth:420,display:"block",margin:"0 auto",borderRadius:8}}>
  <defs><filter id="gl"><feGaussianBlur stdDeviation="3" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>

  {/* ── FIELD ── */}
  <rect x={-5} y={-5} width={F+10} height={F+10} rx={3} fill="#0e0e11"/>
  <rect x={0} y={0} width={F} height={F} fill="#6d7078"/>

  {/* 6x6 tile grid (orange) */}
  {Array.from({length:5}).map((_,i)=><line key={`v${i}`} x1={(i+1)*T} y1={0} x2={(i+1)*T} y2={F} stroke="#d4880e" strokeWidth={1.5} opacity={0.6}/>)}
  {Array.from({length:5}).map((_,i)=><line key={`h${i}`} x1={0} y1={(i+1)*T} x2={F} y2={(i+1)*T} stroke="#d4880e" strokeWidth={1.5} opacity={0.6}/>)}

  {/* Perimeter border (orange) */}
  <rect x={0} y={0} width={F} height={F} fill="none" stroke="#d4880e" strokeWidth={3}/>
  {/* Alliance walls: left=blue, right=red */}
  <line x1={0} y1={0} x2={0} y2={F} stroke="#1e40af" strokeWidth={5}/>
  <line x1={F} y1={0} x2={F} y2={F} stroke="#991b1b" strokeWidth={5}/>

  {/* Far launch zone (top triangle: 6 wide x 3 tall, apex down) */}
  <polygon points={`0,0 ${F},0 ${F/2},${T*3}`} fill="#e0e0e008" stroke="#e0e0e0" strokeWidth={2.5} opacity={0.75}/>
  {/* Bottom triangle (2 wide x 1 tall) */}
  <polygon points={`${T*2},${F} ${T*4},${F} ${F/2},${F-T}`} fill="#e0e0e010" stroke="#e0e0e0" strokeWidth={2.5} opacity={0.75}/>

  {/* Depot tape */}
  <line x1={2} y1={T+8} x2={T+8} y2={T+8} stroke="#ccc" strokeWidth={1.6} opacity={0.4}/>
  <line x1={F-T-8} y1={T+8} x2={F-2} y2={T+8} stroke="#ccc" strokeWidth={1.6} opacity={0.4}/>

  {/* Blue GOAL (top-left, 1-tile triangle) */}
  <polygon points={`0,0 ${T},0 0,${T}`} fill="#1a3a78"/>
  <polygon points={`2,2 ${T-4},2 2,${T-4}`} fill="#152d65" opacity={0.9}/>

  {/* Red GOAL (top-right, 1-tile triangle) */}
  <polygon points={`${F-T},0 ${F},0 ${F},${T}`} fill="#781a1a"/>
  <polygon points={`${F-T+4},2 ${F-2},2 ${F-2},${T-4}`} fill="#651515" opacity={0.9}/>

  {/* Gates (dark vertical rails) */}
  <line x1={T/3} y1={T} x2={T/3} y2={T*3} stroke="#333" strokeWidth={1.5}/>
  <line x1={F-T/3} y1={T} x2={F-T/3} y2={T*3} stroke="#333" strokeWidth={1.5}/>
  {/* Alliance lines below gates (gate to row 5) */}
  <line x1={T/3} y1={T*3} x2={T/3} y2={T*5} stroke="#ee4444" strokeWidth={1.8} opacity={0.7}/>
  <line x1={F-T/3} y1={T*3} x2={F-T/3} y2={T*5} stroke="#4488ff" strokeWidth={1.8} opacity={0.7}/>

{/* BASE tape squares (center-bottom) */}
  <rect x={75} y={255} width={45} height={45} rx={1} fill="none" stroke="#cc3333" strokeWidth={2} opacity={0.6}/>
  <rect x={240} y={255} width={45} height={45} rx={1} fill="none" stroke="#4488ff" strokeWidth={2} opacity={0.7}/>

  {/* Loading zone tape (bottom corners) */}
  <rect x={3} y={F-T+3} width={T-6} height={T-6} rx={1} fill="none" stroke="#2540aa" strokeWidth={1.2} opacity={0.35}/>
  <rect x={F-T+3} y={F-T+3} width={T-6} height={T-6} rx={1} fill="none" stroke="#aa2525" strokeWidth={1.2} opacity={0.35}/>

  {/* Spike marks + game pieces */}
  {[[T*1,T*2.5,"G","P","P"],[T*5,T*2.5,"P","P","G"],[T*1,T*3.5,"P","G","P"],[T*5,T*3.5,"P","G","P"],[T*1,T*4.5,"P","P","G"],[T*5,T*4.5,"G","P","P"]].map(([x,y,...a],i)=>
    <g key={`s${i}`}><line x1={x-14} y1={y} x2={x+14} y2={y} stroke="#ffffff20" strokeWidth={1}/>
    {a.map((c,j)=><circle key={j} cx={x-12+j*12} cy={y} r={4.5} fill={c==="G"?"#22c55e":"#a855f7"} stroke={c==="G"?"#4ade8040":"#c084fc40"} strokeWidth={0.6}/>)}</g>
  )}

  {/* Loading zone game pieces */}
  {[[12,F-35],[F-26,F-35]].map(([x,y],i)=>
    <g key={`la${i}`}>{["P","G","P"].map((c,j)=><circle key={j} cx={x+j*9} cy={y} r={4} fill={c==="G"?"#22c55e":"#a855f7"} opacity={0.65}/>)}</g>
  )}

  {/* Obelisk (top center) */}
  <polygon points={`${F/2-10},-3 ${F/2+10},-3 ${F/2+4},-18 ${F/2-4},-18`} fill="#3a3a40" stroke="#555" strokeWidth={0.8}/>

  {/* Audience label */}
  <text x={F/2} y={F+14} textAnchor="middle" fill="#94a3b8" fontSize={11} fontWeight={600} fontFamily="sans-serif">Audience</text>

  {/* AprilTags (visual reference only) */}
  <g fontFamily="monospace" fontSize={6} fontWeight={800} fill="#fff">
    <rect x={8} y={6} width={16} height={14} rx={2} fill="#111827" stroke="#e5e7eb" strokeWidth={0.8}/>
    <text x={16} y={16} textAnchor="middle">20</text>
    <rect x={F-24} y={6} width={16} height={14} rx={2} fill="#111827" stroke="#e5e7eb" strokeWidth={0.8}/>
    <text x={F-16} y={16} textAnchor="middle">24</text>
    <rect x={F/2-8} y={-20} width={16} height={14} rx={2} fill="#111827" stroke="#e5e7eb" strokeWidth={0.8}/>
    <text x={F/2} y={-10} textAnchor="middle">21</text>
  </g>

  {/* ═══ EFFECTS ═══ */}
  {fx.filter(e=>e.tp==="zhl").map((_,i)=><polygon key={`z${i}`} points={`${T},0 ${T*5},0 ${T*3+T*2/3},${T*5} ${T*2+T/3},${T*5}`} fill="#f59e0b08" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 3" opacity={.7}><animate attributeName="stroke-opacity" values="1;.3;1" dur="1.2s" repeatCount="indefinite"/></polygon>)}

  {fx.filter(e=>e.tp==="bhl").map((_,i)=><g key={`bh${i}`}>
    <rect x={T*2+2} y={T*4+2} width={T-4} height={T-4} fill="#ef444422" stroke="#ef4444" strokeWidth={2.5}><animate attributeName="stroke-opacity" values="1;.3;1" dur="1s" repeatCount="indefinite"/></rect>
    <rect x={T*3+2} y={T*4+2} width={T-4} height={T-4} fill="#3b82f622" stroke="#3b82f6" strokeWidth={2.5}><animate attributeName="stroke-opacity" values="1;.3;1" dur="1s" repeatCount="indefinite"/></rect>
  </g>)}

  {fx.filter(e=>e.tp==="col"&&run&&t>(e.at||0)).map((e,i)=>
    <g key={`c${i}`} filter="url(#gl)"><circle cx={px(e.x)} cy={px(e.y)} r={14+Math.sin(t*8)*5} fill="#ef444422" stroke="#ef4444" strokeWidth={1.5}/><text x={px(e.x)} y={px(e.y)+5} textAnchor="middle" fontSize={16}>💥</text></g>
  )}

  {fx.filter(e=>e.tp==="ght"&&run&&t>(e.at||0)).map((e,i)=>{
    const gx=e.s==="b"?T+T-12:F-T*2+3;
    return<g key={`g${i}`} filter="url(#gl)"><rect x={gx} y={T/3-2} width={8} height={18} rx={2} fill="#ef444488" stroke="#ef4444" strokeWidth={2}><animate attributeName="opacity" values="1;.3;1" dur=".3s" repeatCount="indefinite"/></rect><text x={gx+4} y={T/3-8} textAnchor="middle" fill="#fca5a5" fontSize={6.5} fontWeight={700}>⚠ GATE</text></g>;
  })}

  {fx.filter(e=>e.tp==="fal").map((e,i)=>{const p=fxp(e);if(!p)return null;return<circle key={`f${i}`} cx={p.x} cy={p.y} r={5} fill={e.c==="g"?"#22c55e":"#a855f7"} opacity={.9}/>;
  })}

  {fx.filter(e=>e.tp==="lnc").map((e,i)=>{const p=fxp(e);if(!p)return null;return<g key={`l${i}`}><circle cx={p.x} cy={p.y} r={5.5} fill={e.c==="g"?"#22c55e":"#a855f7"} stroke="#fff" strokeWidth={1}/>{p.pr<.8&&<line x1={p.x} y1={p.y} x2={p.x+(px(e.f[0])-p.x)*.3} y2={p.y+(px(e.f[1])-p.y)*.3} stroke="#fff3" strokeWidth={2}/>}</g>;
  })}

  {fx.filter(e=>e.tp==="pin"&&run&&t>(e.at||0)).map((e,i)=>
    <g key={`p${i}`}><rect x={px(e.x)-22} y={px(e.y)-9} width={44} height={18} rx={5} fill="#f59e0bdd"/><text x={px(e.x)} y={px(e.y)+3} textAnchor="middle" fill="#000" fontSize={10} fontWeight={800} fontFamily="monospace">PIN {Math.min(9,~~(t-(e.at||0)))}s</text></g>
  )}

  {fx.filter(e=>e.tp==="wrn"&&run&&t>(e.at||0)).map((e,i)=>
    <g key={`w${i}`}><rect x={px(e.x)-32} y={px(e.y)-9} width={64} height={18} rx={5} fill="#ef4444dd"/><text x={px(e.x)} y={px(e.y)+3} textAnchor="middle" fill="#fff" fontSize={6.5} fontWeight={800} fontFamily="monospace">{e.tx}</text></g>
  )}

  {fx.filter(e=>e.tp==="scr").map((e,i)=><g key={`s${i}`}><rect x={F/2-34} y={F/2-12} width={68} height={24} rx={6} fill="#08080fee" stroke="#4a4a6a" strokeWidth={.8}/><text x={F/2-14} y={F/2+4} textAnchor="middle" fill="#ef4444" fontSize={11} fontWeight={800}>{e.r}</text><text x={F/2} y={F/2+4} textAnchor="middle" fill="#555" fontSize={9}>—</text><text x={F/2+14} y={F/2+4} textAnchor="middle" fill="#3b82f6" fontSize={11} fontWeight={800}>{e.bl}</text></g>)}

  {fx.filter(e=>e.tp==="bkd").map((e,i)=><g key={`d${i}`}><rect x={F/2-48} y={F/2-e.it.length*8} width={96} height={e.it.length*16+4} rx={6} fill="#08080fdd" stroke="#10b98144" strokeWidth={1}/>{e.it.map((s,j)=><text key={j} x={F/2} y={F/2-e.it.length*8+j*16+16} textAnchor="middle" fill={j===e.it.length-1?"#fff":"#94a3b8"} fontSize={8} fontWeight={j===e.it.length-1?900:600} fontFamily="monospace">{s}</text>)}</g>)}

  {fx.filter(e=>e.tp==="mot").map((e,i)=><g key={`m${i}`}><rect x={F/2-30} y={F+24} width={60} height={28} rx={6} fill="#08080fee" stroke="#8b5cf644" strokeWidth={1}/><text x={F/2} y={F+36} textAnchor="middle" fill="#8b5cf6" fontSize={7} fontWeight={700}>MOTIF</text>{e.p.split("").map((c,ci)=><circle key={ci} cx={F/2-14+ci*14} cy={F+44} r={5} fill={c==="G"?"#22c55e":"#a855f7"} stroke="#fff" strokeWidth={.6}/>)}</g>)}

  {/* ═══ ROBOTS ═══ */}
  {bots.r?.map(b=>{const p=bxy(b);const tip=b.tp&&run&&t>b.tp;return<g key={b.id}>
    <g transform={tip?`rotate(90 ${p.x} ${p.y})`:""} opacity={tip?.45:1}>
      <rect x={p.x-13} y={p.y-13} width={26} height={26} rx={4} fill={b.me?"#dc2626":"#991b1b"} stroke={b.me?"#f87171":"#ef4444"} strokeWidth={b.me?2.5:1.5}/>
      <rect x={p.x-14} y={p.y-9} width={3} height={6} rx={1} fill="#666"/><rect x={p.x+11} y={p.y-9} width={3} height={6} rx={1} fill="#666"/>
      <rect x={p.x-14} y={p.y+3} width={3} height={6} rx={1} fill="#666"/><rect x={p.x+11} y={p.y+3} width={3} height={6} rx={1} fill="#666"/>
    </g>
    {b.cr>0&&<><circle cx={p.x} cy={p.y} r={9} fill="#000c"/><text x={p.x} y={p.y+4} textAnchor="middle" fill="#fbbf24" fontSize={12} fontWeight={900}>{b.cr}</text></>}
    {b.ib&&<circle cx={p.x+14} cy={p.y-14} r={5.5} fill={b.fb?"#10b981":"#f59e0b"} stroke="#fff" strokeWidth={.8}/>}
    {b.ex&&<><line x1={p.x} y1={p.y-16} x2={p.x} y2={p.y-36} stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="3 2"><animate attributeName="y2" values={`${p.y-30};${p.y-40};${p.y-30}`} dur=".8s" repeatCount="indefinite"/></line><text x={p.x} y={p.y-40} textAnchor="middle" fill="#f59e0b" fontSize={7.5} fontWeight={700}>↑18"?</text></>}
    {tip&&<text x={p.x} y={p.y+5} textAnchor="middle" fontSize={15}>⟲</text>}
    <text x={p.x} y={p.y-17} textAnchor="middle" fill={b.me?"#fca5a5":"#ef444466"} fontSize={7.5} fontWeight={700} fontFamily="monospace">{b.id.toUpperCase()}</text>
  </g>;})}

  {bots.b?.map(b=>{const p=bxy(b);const sh=b.sh&&run&&t>b.sh;const sx=sh?Math.sin(t*24)*3:0;const ht=b.ht&&run&&t>b.ht&&t<b.ht+.6;const hx=ht?Math.sin(t*30)*4:0;const tip=b.tp&&run&&t>b.tp;return<g key={b.id}>
    <g transform={tip?`rotate(90 ${p.x} ${p.y})`:""} opacity={tip?.45:1}>
      <rect x={p.x-13+sx+hx} y={p.y-13} width={26} height={26} rx={4} fill={sh?"#1e3a5f":"#1d4ed8"} stroke={sh?"#f59e0b":"#60a5fa"} strokeWidth={1.5}/>
      <rect x={p.x-14+sx+hx} y={p.y-9} width={3} height={6} rx={1} fill="#666"/><rect x={p.x+11+sx+hx} y={p.y-9} width={3} height={6} rx={1} fill="#666"/>
      <rect x={p.x-14+sx+hx} y={p.y+3} width={3} height={6} rx={1} fill="#666"/><rect x={p.x+11+sx+hx} y={p.y+3} width={3} height={6} rx={1} fill="#666"/>
    </g>
    {tip&&<text x={p.x} y={p.y+5} textAnchor="middle" fontSize={15}>⟲</text>}
    <text x={p.x+sx+hx} y={p.y-17} textAnchor="middle" fill="#93c5fd66" fontSize={7.5} fontWeight={700} fontFamily="monospace">{b.id.toUpperCase()}</text>
  </g>;})}

  {/* Period */}
  {pd&&<><rect x={F/2-32} y={F+4} width={64} height={15} rx={4} fill={pd.includes("AUTO")?"#6366f133":pd.includes("TR")||pd.includes("END")?"#ef444433":"#10b98122"}/><text x={F/2} y={F+14} textAnchor="middle" fill={pd.includes("AUTO")?"#818cf8":pd.includes("TR")||pd.includes("END")?"#fca5a5":"#6ee7b7"} fontSize={7} fontWeight={800} fontFamily="monospace">{pd}</text></>}
  </svg>);
}

// ── SCENARIOS (compact) ──
const SC=[
{m:"r",ti:"AUTO Interference",df:2,ds:"AUTO. Red пересёк центр и врезался в Blue на его стороне.",bots:{r:[{id:"r1",x:75,y:42,a:[[75,42],[55,42],[32,44]],d:2.5},{id:"r2",x:80,y:78}],b:[{id:"b1",x:28,y:44,ht:2.2},{id:"b2",x:22,y:75}]},fx:[{tp:"col",x:30,y:43,at:2.2}],pd:"AUTO",opts:["Нет нарушения","MINOR FOUL","MAJOR FOUL","MAJOR + YELLOW"],cor:2,rl:"G402",ex:"G402: Контакт с роботом противника на его стороне в AUTO = MAJOR FOUL."},
{m:"r",ti:"Transition LAUNCH",df:2,ds:"AUTO закончился. Red на моторах запускает ARTIFACT в GOAL в 8-сек переходе.",bots:{r:[{id:"r1",x:72,y:30},{id:"r2",x:78,y:72}],b:[{id:"b1",x:28,y:45},{id:"b2",x:22,y:70}]},fx:[{tp:"lnc",f:[72,30],t:[92,10],c:"p",at:1,dr:.8}],pd:"TRANSITION",opts:["Инерция — ОК","MINOR FOUL","MAJOR FOUL","MAJOR + egregious"],cor:2,rl:"G403",ex:"G403: Powered movement в переходе = MAJOR FOUL. LAUNCH = powered."},
{m:"r",ti:"GATE Attack",df:3,ds:"TELEOP. Red подъехал к Blue GATE. 4 ARTIFACTS упали с RAMP.",bots:{r:[{id:"r1",x:60,y:50,a:[[72,55],[50,35],[34,14]],d:2.5},{id:"r2",x:78,y:68}],b:[{id:"b1",x:35,y:55},{id:"b2",x:25,y:72}]},fx:[{tp:"ght",s:"b",at:2.3},...[0,1,2,3].map(i=>({tp:"fal",f:[31,12+i*4],t:[28+i*3,32+i*7],c:i%2?"g":"p",at:2.5+i*.2,dr:.6}))],pd:"TELEOP",opts:["1 MAJOR (GATE)","4 MAJOR (артефакты)","5 MAJOR + PATTERN RP","YELLOW CARD"],cor:2,rl:"G417+G418",ex:"G417: 1 MAJOR за GATE + PATTERN RP. G418: 1 MAJOR за каждый ARTIFACT с RAMP. = 5 MAJOR (75!) + PATTERN RP."},
{m:"r",ti:"3-Second PIN",df:2,ds:"TELEOP. Red прижал Blue к стене. 5 секунд — Red не двигается.",bots:{r:[{id:"r1",x:10,y:50,a:[[25,50],[15,50],[10,50]],d:1.5},{id:"r2",x:70,y:65}],b:[{id:"b1",x:4,y:50,sh:1.5},{id:"b2",x:30,y:72}]},fx:[{tp:"pin",x:8,y:38,at:1.5}],pd:"TELEOP",opts:["Нет нарушения","MINOR + доп. каждые 3с","MAJOR FOUL","YELLOW CARD"],cor:1,rl:"G422",ex:"G422: PIN макс 3 сек. После — MINOR + ещё MINOR каждые 3 сек."},
{m:"r",ti:"Intentional Tip",df:3,ds:"TELEOP. Red клином переворачивает Blue. Blue не может ехать.",bots:{r:[{id:"r1",x:58,y:48,a:[[75,48],[65,48],[58,48]],d:1.5},{id:"r2",x:78,y:70}],b:[{id:"b1",x:48,y:48,tp:1.4},{id:"b2",x:28,y:70}]},fx:[{tp:"col",x:53,y:48,at:1.3}],pd:"TELEOP",opts:["Нормальный геймплей","MAJOR FOUL","MAJOR + YELLOW","MAJOR + RED CARD"],cor:3,rl:"G421",ex:"G421: Намеренный tip + unable to drive = MAJOR + RED CARD = DISQUALIFICATION!"},
{m:"r",ti:"Post-Match Score",df:3,ds:"Матч кончился (0:00). Red забрасывает ARTIFACT в GOAL + касается GATE.",bots:{r:[{id:"r1",x:80,y:28,a:[[80,28],[88,18]],d:2},{id:"r2",x:78,y:72}],b:[{id:"b1",x:28,y:48},{id:"b2",x:22,y:70}]},fx:[{tp:"lnc",f:[80,28],t:[94,8],c:"g",at:.8,dr:.7},{tp:"ght",s:"r",at:1.8}],pd:"END 0:00",opts:["MINOR FOUL","MINOR + 2 MAJOR","Только MAJOR","RED CARD"],cor:1,rl:"G404",ex:"G404: MINOR(движение) + MAJOR(GOAL) + MAJOR(GATE) = 35 очков противнику!"},
{m:"r",ti:"CONTROL Overload",df:2,ds:"TELEOP. Red удерживает 5 ARTIFACTS одновременно.",bots:{r:[{id:"r1",x:55,y:50,cr:5,a:[[78,65],[65,55],[55,50]],d:2},{id:"r2",x:80,y:72}],b:[{id:"b1",x:30,y:45},{id:"b2",x:22,y:70}]},fx:[{tp:"wrn",tx:"5 > LIMIT 3!",x:55,y:40,at:1.5}],pd:"TELEOP",opts:["Нет нарушения","MINOR за 2","MAJOR FOUL","MINOR×2 + YELLOW"],cor:3,rl:"G408",ex:"G408: Лимит 3. MINOR за каждый сверх. 5+ = excessive = YELLOW CARD!"},
{m:"r",ti:"LAUNCH вне зоны",df:3,ds:"TELEOP. Red в ЦЕНТРЕ поля запускает ARTIFACT — попадает в GOAL.",bots:{r:[{id:"r1",x:55,y:55},{id:"r2",x:80,y:70}],b:[{id:"b1",x:28,y:48},{id:"b2",x:22,y:70}]},fx:[{tp:"lnc",f:[55,55],t:[94,8],c:"p",at:1,dr:1.2},{tp:"wrn",tx:"⚠ NOT IN LAUNCH ZONE",x:55,y:48,at:.5}],pd:"TELEOP",opts:["Засчитан","MINOR FOUL","MAJOR (в GOAL!)","Не считается"],cor:2,rl:"G416",ex:"G416: LAUNCH из LZ только. MINOR обычно, MAJOR если попал в GOAL!"},
// STRATEGIST
{m:"s",ti:"Endgame: 20 сек",df:2,ds:"20 сек. Ваш робот +2 ARTIFACTS. Партнёр в BASE. -8 очков.",bots:{r:[{id:"r1",x:65,y:50,cr:2,me:true},{id:"r2",x:38,y:73,ib:true,fb:true}],b:[{id:"b1",x:35,y:50},{id:"b2",x:22,y:70}]},fx:[{tp:"scr",r:52,bl:60}],pd:"TELEOP 0:20",opts:["Забросить → BASE","GATE → PATTERN","Сразу BASE (+30)","Защищать GATE"],cor:2,rl:"Table 10-2",ex:"Оба полностью в BASE = 10+10+10(бонус) = 30! Перекрывает 8 очков."},
{m:"s",ti:"AUTO: Порядок",df:3,ds:"MOTIF=GPP. 3 ARTIFACTS (1G, 2P). Первый заброс = индекс 1.",bots:{r:[{id:"r1",x:80,y:40,cr:3,me:true},{id:"r2",x:82,y:72}],b:[{id:"b1",x:25,y:45},{id:"b2",x:22,y:72}]},fx:[{tp:"mot",p:"GPP"}],pd:"AUTO",opts:["G→P→P (MOTIF)","P→P→G","P→G→P","Не важен"],cor:0,rl:"10.5.2",ex:"PATTERN по индексу RAMP. Для GPP: 1=G, 2=P, 3=P. Порядок LAUNCH = позиция!"},
{m:"s",ti:"Vertical Expansion",df:3,ds:"18 сек. Робот В LAUNCH ZONE. Хотите поднять выше 18\".",bots:{r:[{id:"r1",x:72,y:38,me:true,ex:true},{id:"r2",x:80,y:72}],b:[{id:"b1",x:28,y:48},{id:"b2",x:22,y:70}]},fx:[{tp:"zhl"}],pd:"TELEOP 0:18",opts:["Можно — 20 сек","Нельзя — LAUNCH ZONE!","До 38\"","Только BASE"],cor:1,rl:"G415",ex:"G415: >18\" только: последние 20с + НЕ в LAUNCH ZONE. Вы в LZ — нельзя!"},
{m:"s",ti:"DEPOT Dilemma",df:2,ds:"Blue кладёт ARTIFACTS рядом с вашим DEPOT.",bots:{r:[{id:"r1",x:68,y:50,me:true},{id:"r2",x:80,y:72}],b:[{id:"b1",x:88,y:22,a:[[50,40],[70,30],[88,22]],d:2},{id:"b2",x:22,y:70}]},fx:[],pd:"TELEOP",opts:["Штраф!","Ничего","Забрать — легально","Нарушение Blue"],cor:2,rl:"10.5.1",ex:"DEPOT не защищён. Забрать из своего DEPOT = легально!"},
// CALCULATOR
{m:"c",ti:"AUTO Score",df:2,ds:"2 LEAVE. 2 CLASSIFIED + 1 OVERFLOW. MOTIF=GPP, 3 совпадения.",bots:{r:[{id:"r1",x:65,y:55},{id:"r2",x:72,y:70}],b:[{id:"b1",x:28,y:48},{id:"b2",x:22,y:70}]},fx:[{tp:"bkd",it:["LEAVE×2=6","CLASS×2=6","OVER×1=1","PAT×3=6","= ???"]}],pd:"AUTO END",opts:["15","17","19","21"],cor:2,rl:"Table 10-2",ex:"6+6+1+6 = 19 очков!"},
{m:"c",ti:"Penalty Damage",df:1,ds:"Red: 2 MAJOR + 1 MINOR. Blue получает?",bots:{r:[{id:"r1",x:60,y:50},{id:"r2",x:78,y:68}],b:[{id:"b1",x:28,y:48},{id:"b2",x:22,y:70}]},fx:[{tp:"bkd",it:["MAJOR×2=30","MINOR×1=5","Blue +???"]}],pd:"PENALTIES",opts:["25","30","35","45"],cor:2,rl:"Table 10-4",ex:"30+5 = 35 очков для Blue!"},
{m:"c",ti:"BASE Endgame",df:2,ds:"Red1 полностью в BASE. Red2 частично.",bots:{r:[{id:"r1",x:38,y:73,ib:true,fb:true},{id:"r2",x:42,y:70,ib:true}],b:[{id:"b1",x:28,y:48},{id:"b2",x:88,y:90}]},fx:[{tp:"bhl"}],pd:"ENDGAME",opts:["10","15","20","25"],cor:1,rl:"Table 10-2",ex:"Full=10 + Partial=5 = 15. Бонус +10 только если ОБА полностью."},
{m:"c",ti:"GATE Catastrophe",df:3,ds:"Red открыл Blue GATE. 5 ARTIFACTS упали.",bots:{r:[{id:"r1",x:42,y:22,a:[[58,38],[42,22]],d:2},{id:"r2",x:75,y:65}],b:[{id:"b1",x:35,y:55},{id:"b2",x:25,y:72}]},fx:[{tp:"ght",s:"b",at:1.8},...[0,1,2,3,4].map(i=>({tp:"fal",f:[30,12+i*4],t:[26+i*3,32+i*7],c:i%2?"g":"p",at:2+i*.2,dr:.5}))],pd:"TELEOP",opts:["75 (5M)","90 (6M)","90+PATTERN RP","105"],cor:2,rl:"G417+G418",ex:"1M(GATE)+5M(ARTIFACTS)=90 + PATTERN RP!"},
];

const MM={r:{l:"REFEREE",c:"var(--red)"},s:{l:"STRATEGY",c:"var(--accent-2)"},c:{l:"SCORE",c:"var(--green)"}};
const shuf=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=0|Math.random()*(i+1);[b[i],b[j]]=[b[j],b[i]];}return b;};

export default function App(){
  const[scr,setScr]=useState("menu");const[pool,setPool]=useState([]);const[idx,setIdx]=useState(0);
  const[sel,setSel]=useState(null);const[rev,setRev]=useState(false);
  const[pts,setPts]=useState(0);const[str,setStr]=useState(0);const[bst,setBst]=useState(0);const[hist,setHist]=useState([]);

  const go=m=>{setPool(m==="all"?shuf(SC):shuf(SC.filter(s=>s.m===m)));setIdx(0);setSel(null);setRev(false);setPts(0);setStr(0);setBst(0);setHist([]);setScr("game");};
  const pick=i=>{if(rev)return;setSel(i);setRev(true);const s=pool[idx],ok=i===s.cor;if(ok){setPts(v=>v+Math.round((s.df||1)*150*(1+str*.15)));setStr(v=>v+1);setBst(v=>Math.max(v,str+1));}else setStr(0);setHist(h=>[...h,{...s,ua:i,ok}]);};
  const nxt=()=>{if(idx+1>=pool.length){setScr("res");return;}setIdx(i=>i+1);setSel(null);setRev(false);};

  const cur=pool[idx],cc=hist.filter(h=>h.ok).length;

  // MENU
  if(scr==="menu")return(
    <div style={R}><div style={W}>
      <div style={{padding:"24px 0 12px"}}>
        <div style={{display:"inline-block",padding:"3px 10px",borderRadius:4,background:"var(--panel)",border:"1px solid var(--border)",fontSize:10,fontWeight:600,letterSpacing:1.5,color:"var(--muted)",marginBottom:10}}>FTC 2025-26</div>
        <h1 style={{fontSize:36,fontWeight:900,margin:0,letterSpacing:-1.5,color:"var(--text)",lineHeight:1}}>Rule Quiz</h1>
        <div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>Field scenario simulator — referee, strategy, scoring</div>
      </div>
      {Object.entries(MM).map(([k,m])=><button key={k} onClick={()=>go(k)} style={{...MB,borderLeftColor:m.c}}><div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,letterSpacing:1.5,color:m.c}}>{m.l}</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{SC.filter(s=>s.m===k).length} scenarios</div></div></button>)}
      <button onClick={()=>go("all")} style={{...MB,borderLeftColor:"var(--amber)",marginTop:4}}><div><div style={{fontSize:12,fontWeight:700,letterSpacing:1.5,color:"var(--amber)"}}>ALL</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{SC.length} scenarios</div></div></button>
      <div style={{marginTop:16,opacity:.3,borderRadius:6,overflow:"hidden"}}><Field sc={{bots:{r:[{id:"r1",x:72,y:42},{id:"r2",x:80,y:75}],b:[{id:"b1",x:28,y:45},{id:"b2",x:20,y:75}]},fx:[],pd:""}} run={false}/></div>
    </div></div>
  );

  // RESULTS
  if(scr==="res"){
    const pct=hist.length?Math.round(cc/hist.length*100):0;
    const g=pct>=90?"S":pct>=75?"A":pct>=60?"B":pct>=40?"C":"D";
    const gc={S:"var(--green)",A:"var(--accent)",B:"var(--blue)",C:"var(--amber)",D:"var(--red)"}[g];
    return(<div style={R}><div style={W}>
      <div style={{padding:"24px 0 14px"}}>
        <div style={{fontSize:11,fontWeight:600,letterSpacing:2,color:"var(--muted)",textTransform:"uppercase",marginBottom:8}}>Results</div>
        <div style={{display:"flex",alignItems:"baseline",gap:10}}>
          <span style={{fontSize:32,fontWeight:900,color:gc}}>{g}</span>
          <span style={{fontSize:14,color:"var(--text-2)"}}>{pct}% correct</span>
        </div>
      </div>
      <div style={{display:"flex",gap:6,marginTop:8}}>
        {[[cc+"/"+hist.length,"Correct"],[pts,"Points"],[bst,"Streak"]].map(([v,l],i)=><div key={i} style={{flex:1,textAlign:"center",padding:"10px 4px",background:"var(--bg-raised)",borderRadius:6,border:"1px solid var(--border)"}}><div style={{fontSize:16,fontWeight:800,fontFamily:"var(--font-mono)"}}>{v}</div><div style={{fontSize:9,color:"var(--muted)",marginTop:3,textTransform:"uppercase",letterSpacing:1}}>{l}</div></div>)}
      </div>
      <div style={{marginTop:18}}><div style={{fontSize:10,fontWeight:600,letterSpacing:2,color:"var(--muted)",marginBottom:8}}>INCORRECT</div>
        {hist.filter(h=>!h.ok).length===0?<div style={{color:"var(--green)",padding:12,fontSize:12}}>No errors.</div>:
          hist.filter(h=>!h.ok).map((h,i)=><div key={i} style={{padding:"10px 12px",background:"var(--bg-raised)",border:"1px solid var(--border)",borderRadius:6,marginBottom:5}}>
            <div style={{fontSize:12,fontWeight:700,color:MM[h.m]?.c}}>{h.ti}</div>
            <div style={{fontSize:11,color:"var(--rose)",marginTop:4}}>Your answer: {h.opts[h.ua]}</div>
            <div style={{fontSize:11,color:"#6ee7b7",marginTop:2}}>Correct: {h.opts[h.cor]}</div>
            <div style={{fontSize:11,color:"var(--text-2)",marginTop:5,lineHeight:1.5}}>{h.ex}</div>
            <div style={{fontSize:10,color:"var(--muted)",marginTop:3}}>{h.rl}</div>
          </div>)}
      </div>
      <button onClick={()=>setScr("menu")} style={{width:"100%",padding:"10px",marginTop:14,background:"var(--panel)",border:"1px solid var(--border)",borderRadius:6,color:"var(--text-2)",fontFamily:"inherit",fontSize:12,fontWeight:600,cursor:"pointer"}}>Back to menu</button>
    </div></div>);
  }

  // GAME
  const meta=MM[cur.m]||MM.r;const prog=(idx/pool.length)*100;
  const df="★".repeat(cur.df||1)+"☆".repeat(3-(cur.df||1));
  return(<div style={R}><div style={W}>
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0"}}>
      <button onClick={()=>setScr("res")} style={{width:28,height:28,borderRadius:4,background:"none",border:"1px solid var(--border)",color:"var(--muted)",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>✕</button>
      <div style={{flex:1,height:3,background:"var(--panel)",borderRadius:1,overflow:"hidden"}}><div style={{height:"100%",width:`${prog}%`,background:"var(--accent)",transition:"width .3s"}}/></div>
      <span style={{fontSize:12,fontWeight:700,color:"var(--text-2)",fontFamily:"var(--font-mono)"}}>{pts}</span>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0"}}>
      <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:4,background:"var(--panel)",border:"1px solid var(--border)",color:meta.c}}>{meta.l}</span>
      {str>1&&<span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:4,background:"var(--panel)",border:"1px solid var(--border)",color:"var(--amber)"}}>x{str}</span>}
      <span style={{fontSize:11,color:"var(--dim)",marginLeft:"auto",fontFamily:"var(--font-mono)"}}>{idx+1}/{pool.length}</span>
    </div>
    <div style={{background:"var(--bg-raised)",borderRadius:8,padding:"12px 10px",marginTop:6,border:"1px solid var(--border)"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:14,fontWeight:800}}>{cur.ti}</span><span style={{color:"var(--dim)",fontSize:11,fontFamily:"var(--font-mono)"}}>{df}</span></div>
      <Field sc={cur} run={!rev}/>
      <p style={{fontSize:12.5,lineHeight:1.6,color:"var(--text-2)",margin:"8px 0 0"}}>{cur.ds}</p>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:8}}>
      {cur.opts.map((o,i)=>{let bg="var(--bg-raised)",bd="var(--border)",cl="var(--text)";if(rev){if(i===cur.cor){bg="rgba(22,163,74,0.08)";bd="var(--green)";cl="var(--green)";}else if(i===sel){bg="rgba(220,38,38,0.08)";bd="var(--red)";cl="var(--red)";}else{bg="var(--bg)";bd="transparent";cl="var(--dim)";}}
        return<button key={i} disabled={rev} onClick={()=>pick(i)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",background:bg,border:`1px solid ${bd}`,borderRadius:6,fontFamily:"inherit",fontSize:12.5,color:cl,textAlign:"left",cursor:rev?"default":"pointer",transition:"all .15s",lineHeight:1.4}}>
          <span style={{width:24,height:24,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:11,flexShrink:0,background:rev&&i===cur.cor?"var(--green)":rev&&i===sel?"var(--red)":"var(--panel)",color:rev&&(i===cur.cor||i===sel)?"#fff":"var(--dim)",border:rev?"none":"1px solid var(--border)"}}>{["A","B","C","D"][i]}</span>{o}</button>;})}
    </div>
    {rev&&<div style={{marginTop:8,padding:"12px 14px",background:"var(--bg-raised)",borderRadius:6,border:`1px solid ${sel===cur.cor?"var(--green)":"var(--red)"}`}}>
      <div style={{fontWeight:700,fontSize:13,color:sel===cur.cor?"var(--green)":"var(--red)",marginBottom:5}}>{sel===cur.cor?`+${Math.round((cur.df||1)*150*(1+Math.max(0,str-1)*.15))} correct`:"Incorrect"}</div>
      <p style={{fontSize:12,lineHeight:1.55,color:"var(--text-2)",margin:"0 0 6px"}}>{cur.ex}</p>
      <div style={{fontSize:10,color:"var(--muted)",marginBottom:8}}>{cur.rl}</div>
      <button onClick={nxt} style={{width:"100%",padding:"9px",background:"var(--accent)",border:"none",borderRadius:6,color:"#fff",fontFamily:"inherit",fontSize:12,fontWeight:600,cursor:"pointer"}}>{idx+1>=pool.length?"Results":"Next"}</button>
    </div>}
  </div></div>);
}

const R={minHeight:"100vh",background:"var(--bg)",color:"var(--text)",fontFamily:"var(--font)",display:"flex",justifyContent:"center",padding:14};
const W={maxWidth:500,width:"100%",margin:"0 auto",paddingBottom:24};
const MB={width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"var(--panel)",border:"1px solid var(--border)",borderLeft:"3px solid",borderRadius:6,cursor:"pointer",color:"var(--text)",fontFamily:"inherit",textAlign:"left",marginBottom:4};
