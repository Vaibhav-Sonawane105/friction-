import { Flag, MapPin, RotateCcw, Undo2 } from 'lucide-react';
import { neighbors } from './solver';

export default function View({state:{board:b,path},disabled,onAction}) {
  const tip=path.at(-1), found=b.checkpoints.filter(c=>path.includes(c)).length;
  const nearby=neighbors(tip,b.size);
  function tile(cell){
    const cp=b.checkpoints.indexOf(cell), step=path.indexOf(cell);
    const wall=b.blocks.includes(cell), start=cell===b.start, exit=cell===b.exit;
    const available=nearby.includes(cell)&&step<0&&!wall&&tip!==b.exit;
    const label=start?'Start':exit?'Exit':wall?'Wall':cp>=0?'Checkpoint '+(b.ordered?cp+1:''):step>=0?'Path':available?'Available move':'Open square';
    const links=step<0?[]:[path[step-1],path[step+1]].filter(n=>n!==undefined);
    return <button type="button" key={cell} disabled={disabled||!available}
      className="pf-route-cell" data-wall={wall||undefined} data-visited={step>=0||undefined} data-tip={cell===tip||undefined} data-open={available||undefined}
      aria-label={`Row ${Math.floor(cell/b.size)+1}, column ${cell%b.size+1}: ${label}${cell===tip?', current position':''}`}
      onClick={()=>onAction({type:'extend',cell})}>
      {links.length>0&&<svg className="pf-track" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{links.map(n=><line key={n} x1="50" y1="50" x2={50+50*((n%b.size)-(cell%b.size))} y2={50+50*(Math.floor(n/b.size)-Math.floor(cell/b.size))}/>)}</svg>}
      {start?<span className="pf-route-token start"><MapPin/></span>:exit?<span className="pf-route-token exit"><Flag/></span>:cp>=0?<span className="pf-route-token checkpoint">{b.ordered?cp+1:'◆'}</span>:cell===tip?<span className="pf-current-dot"/>:available?<span className="pf-next-dot"/>:null}
    </button>
  }
  return <div className="pf-game-card"><header className="pf-game-title"><h2>Plan your route</h2><p>Move one square at a time. Visit every checkpoint{b.ordered?' in numbered order':''}, then reach the exit. Avoid walls and your own path.</p></header>
    <div className="pf-map-wrap"><div className="pf-map-top"><span>Route map</span><b>{found} / {b.checkpoints.length} checkpoints</b></div>
    <div role="group" aria-label="Route grid" className="pf-route-grid" style={{gridTemplateColumns:`repeat(${b.size},1fr)`}}>{Array.from({length:b.size*b.size},(_,i)=>tile(i))}</div>
    <div className="pf-map-key"><span><MapPin/> Start</span><span><Flag/> Exit</span><span><i/> Wall</span><span>◆ Checkpoint</span></div></div>
    <div className="pf-game-actions"><button disabled={disabled||path.length===1} onClick={()=>onAction({type:'undo'})}><Undo2/> Undo</button><button disabled={disabled||path.length===1} onClick={()=>onAction({type:'clear'})}><RotateCcw/> Clear</button><button className="primary" disabled={disabled} onClick={()=>onAction({type:'submit'})}>Check route →</button></div>
  </div>;
}
