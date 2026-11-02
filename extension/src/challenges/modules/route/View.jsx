import { neighbors } from './solver';
export default function View({
  state: {
    board: b,
    path
  },
  disabled,
  onAction
}) {
  const tip = path.at(-1),
    send = (type, cell) => onAction({
      type,
      cell
    });
  return <div className="p-3"><p>Move one square at a time from Start to Exit. Visit every checkpoint{b.ordered ? ' in numbered order' : ''}. Avoid walls and previously visited squares.</p>
 <div role="group" aria-label="Route grid" className="grid gap-1 my-3" style={{
      gridTemplateColumns: 'repeat(' + b.size + ', minmax(0,1fr))'
    }}>{Array.from({
        length: b.size * b.size
      }, (_, i) => {
        const cp = b.checkpoints.indexOf(i);
        const mark = i === b.start ? 'S' : i === b.exit ? 'E' : b.blocks.includes(i) ? '■' : cp >= 0 ? b.ordered ? String(cp + 1) : '◆' : path.includes(i) ? '•' : '·';
        return <button key={i} type="button" disabled={disabled || !neighbors(tip, b.size).includes(i) || path.includes(i) || b.blocks.includes(i)} aria-label={'Row ' + (Math.floor(i / b.size) + 1) + ', column ' + (i % b.size + 1) + ', ' + (i === b.start ? 'start' : i === b.exit ? 'exit' : cp >= 0 ? 'checkpoint ' + (cp + 1) : mark)} className={'min-h-8 border-2 rounded font-bold ' + (i === tip ? 'bg-yellow-200' : path.includes(i) ? 'bg-teal-200' : 'bg-white')} onClick={() => send('extend', i)}>{mark}</button>;
      })}</div>
 <div className="flex gap-3">{['undo', 'clear', 'submit'].map((type, i) => <button key={type} className="border-2 p-2" disabled={disabled || i < 2 && path.length === 1} onClick={() => send(type)}>{['Undo', 'Clear path', 'Check route'][i]}</button>)}</div></div>;
}
