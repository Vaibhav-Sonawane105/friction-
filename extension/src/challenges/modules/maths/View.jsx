import { useState } from 'react';
function Question({
  state,
  disabled,
  onAction
}) {
  const [answer, set] = useState(''),
    [ops, update] = useState(Array(state.slots).fill(''));
  const operators = state.family === 'operators';
  return <form className="p-4" onSubmit={e => {
    e.preventDefault();
    onAction({
      type: 'submit',
      answer: operators ? ops.join('') : answer
    });
  }}>
<p>Question {Math.min(state.solved + 1, state.total)} of {state.total}</p><h3 className="font-bold my-3">{state.prompt}</h3>
<p className="mb-3">Evaluate parentheses first, then multiplication and division before addition and subtraction.</p>
{operators ? ops.map((op, i) => <label key={i}>Operator {i + 1} <select required disabled={disabled} value={op} onChange={e => update(ops.map((x, j) => j === i ? e.target.value : x))}><option value="">Choose</option>{['+', '−', '×', '÷'].map(v => <option key={v}>{v}</option>)}</select> </label>) : <label>Whole-number answer <input required className="border-2 p-1" disabled={disabled} value={answer} onChange={e => set(e.target.value)} /></label>}
<button className="border-2 p-2 ml-2" disabled={disabled}>Check answer</button></form>;
}
export default function View(props) {
  return <Question key={props.state.solved} {...props} />;
}
