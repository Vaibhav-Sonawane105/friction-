import { ArrowUp, ArrowDown, KeyRound, Sailboat, Leaf, Moon, Bell, CupSoda, Diamond, BookOpen, Apple, Drum, Star, PawPrint } from 'lucide-react';
const icons={Key:KeyRound,Boat:Sailboat,Leaf,Moon,Bell,Cup:CupSoda,Kite:Diamond,Book:BookOpen,Pear:Apple,Drum,Star,Fox:PawPrint};
export default function View({state,disabled,onAction}) {
  return <div className="pf-game-card"><header className="pf-game-title"><h2>Arrange the objects</h2><p>Arrange the objects from first to last so every clue is true.</p></header>
    <div className="pf-order-layout"><section aria-label="Clues"><h3>Clues</h3><ol className="pf-clues">{state.clues.map((clue,i)=>{
      const broken=state.broken.includes(i);
      return <li key={i} data-broken={broken||undefined}><span className="pf-clue-number">{i+1}</span><div>{broken&&<strong>Check this clue<br/></strong>}{clue}</div></li>
    })}</ol></section>
    <section aria-label="Your order"><h3>Your order</h3><ol className="pf-order-slots">{state.row.map((name,i)=>{
      const Icon=icons[name];return <li key={name}><span className="pf-slot-number">{i+1}</span>{Icon&&<Icon aria-hidden="true" size={17}/>}<strong>{name}</strong>
      <div className="pf-move-controls">{[-1,1].map(d=><button type="button" key={d} aria-label={`Move ${name} ${d<0?'earlier':'later'}`} disabled={disabled||i+d<0||i+d>=state.row.length} onClick={()=>onAction({type:'reorder',from:i,to:i+d})}>{d<0?<ArrowUp/>:<ArrowDown/>}</button>)}</div></li>
    })}</ol></section></div>
    <div className="pf-game-actions"><button className="primary" disabled={disabled} onClick={()=>onAction({type:'submit'})}>Check order →</button></div></div>;
}
