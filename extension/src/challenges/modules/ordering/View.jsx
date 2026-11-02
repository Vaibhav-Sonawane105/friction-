export default function View({
  state,
  disabled,
  onAction
}) {
  return <div className="p-3"><p>Put the objects in an order that satisfies every clue. Move them with the arrow buttons, then check your order.</p>
<ol className="my-2">{state.clues.map((c, i) => <li key={i} className={state.broken.includes(i) ? 'font-bold text-red-800' : ''}>{state.broken.includes(i) ? 'Check: ' : ''}{c}</li>)}</ol>
<div className="flex flex-wrap gap-2">{state.row.map((item, i) => <div key={item} className="border-2 p-2 rounded"><strong>{i + 1}. {item}</strong><div>{[-1, 1].map(d => <button key={d} className="px-2" aria-label={'Move ' + item + ' ' + (d < 0 ? 'earlier' : 'later')} disabled={disabled || i + d < 0 || i + d >= state.row.length} onClick={() => onAction({
            type: 'reorder',
            from: i,
            to: i + d
          })}>{d < 0 ? '←' : '→'}</button>)}</div></div>)}</div>
<button className="border-2 p-2 mt-3" disabled={disabled} onClick={() => onAction({
      type: 'submit'
    })}>Check order</button></div>;
}
