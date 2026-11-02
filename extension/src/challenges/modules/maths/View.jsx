import { useState } from 'react';
function Question({
  state,
  disabled,
  onAction
}) {
  const [answer, set] = useState(''),
    [ops, update] = useState(Array(state.slots).fill(''));
  const operators = state.family === 'operators';
  const titles = { arithmetic: 'Solve the equation', missing: 'Find the missing value', operators: 'Choose the operators', constraints: 'Solve the number puzzle' };
  return <form className="pf-maths-card" onSubmit={e => {
    e.preventDefault();
    if (!disabled) onAction({ type: 'submit', answer: operators ? ops.join('') : answer });
  }}>
    <div className="pf-maths-question">
      <h2>{titles[state.family]}</h2>
      <p className={state.family === 'constraints' ? 'pf-word-problem' : 'pf-equation'}>{state.prompt}</p>
      {['operators','arithmetic'].includes(state.family) && <small>Evaluate parentheses first, then multiply or divide before adding or subtracting.</small>}
    </div>
    <div className="pf-maths-bar">
      <div className="pf-maths-fields">
        {operators ? ops.map((op,i) => <label key={i}>Operator {i+1}
          <select required disabled={disabled} value={op} onChange={e => update(ops.map((x,j)=>i===j?e.target.value:x))}>
            <option value="">Choose</option>{['+','−','×','÷'].map(v=><option key={v}>{v}</option>)}
          </select></label>) : <label>Whole-number answer
          <input required placeholder="Your answer" disabled={disabled} value={answer} onChange={e=>set(e.target.value)} />
        </label>}
      </div>
      <button type="submit" disabled={disabled}>Check answer <span aria-hidden="true">→</span></button>
    </div>
  </form>;
}
export default function View(props) {
  return <Question key={props.state.solved} {...props} />;
}
