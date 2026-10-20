import { useEffect, useRef } from 'react';
import ShapeSymbol from '../../components/ShapeSymbol';
import styles from './view.css?inline';

const describe = value => typeof value === 'string' ? value : `${value.color} ${value.fill} ${value.shape}`;
function Symbol({ value }) {
  return typeof value === 'string' ? <ShapeSymbol name={value} />
    : <ShapeSymbol name={value.shape} color={value.color} fillStyle={value.fill} />;
}

export default function AttentionView({ state, disabled, onAction }) {
  const heading = useRef(null);
  useEffect(() => {
    if (state.stageNumber > 1) heading.current?.focus();
  }, [state.stageNumber]);
  return <div className="bg-white border-2 border-black rounded-xl shadow-brutal-card p-4 sm:p-6">
    <style>{styles}</style>
    <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
      <h2 ref={heading} tabIndex={-1} className="font-istok font-bold rounded focus:outline-2 focus:outline-offset-4">{`Stage ${state.stageNumber} of ${state.totalStages}`}</h2>
      <span role="status" className="font-istok text-sm bg-[#CCFBF1] border border-black rounded-lg px-3 py-1">{`${state.targetsFound} of ${state.targetsTotal} found`}</span>
    </div>
    <progress aria-label="Attention stages completed" max={state.totalStages} value={state.completedStages} className="w-full h-3 accent-[#4ECDC4]" />
    <div key={state.stageNumber} className="pf-attention-stage">
      <div className="flex items-center justify-center gap-4 bg-[#FFF1F0] border-2 border-black rounded-xl p-3 mt-4">
        <span className="font-istok font-bold">Find every</span><Symbol value={state.target} />
      </div>
      <p id="friction-attention-instructions" className="font-istok text-sm mt-3 mb-4">{state.instructions}</p>
      <div role="group" aria-label="Attention tiles" aria-describedby="friction-attention-instructions" className="grid grid-cols-4 gap-2 sm:gap-3">
        {state.tiles.map((shape, index) => {
          const selected = state.selected.includes(index);
          return <button key={index} type="button" disabled={disabled || selected} aria-pressed={selected}
            aria-label={`Tile ${index + 1}, ${describe(shape)}${selected ? ', selected' : ''}`}
            onClick={() => { if (!disabled && !selected) onAction({ type: 'select', index }); }}
            className={`pf-attention-tile relative min-w-0 min-h-16 sm:min-h-20 p-1 border-2 border-black rounded-xl shadow-brutal-badge focus:outline-2 focus:outline-offset-4 ${selected ? 'bg-[#CCFBF1] pf-attention-selected' : 'bg-[#F6F3FF]'} ${disabled ? 'opacity-60' : ''}`}>
            <Symbol value={shape} />
            {selected && <span aria-hidden="true" className="absolute right-1 top-0.5 text-xs font-bold text-[#0F766E]">✓</span>}
          </button>;
        })}
      </div>
    </div>
  </div>;
}
