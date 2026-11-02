import ShapeSymbol from '../../components/ShapeSymbol';

export default function MemoryView({ state, disabled, onAction }) {
  return <div className="bg-white border-2 border-black rounded-xl shadow-brutal-card p-4 sm:p-6">
    <p className="font-istok font-bold mb-2" role="status">{`${state.pairsMatched} of ${state.totalPairs} pairs matched`}</p>
    <progress aria-label="Memory pairs matched" max={state.totalPairs} value={state.pairsMatched} className="w-full h-3 accent-[#4ECDC4]" />
    <p id="friction-memory-instructions" className="font-istok mt-4 mb-6">{state.instructions}</p>
    <div role="group" aria-label="Memory cards" aria-describedby="friction-memory-instructions" className={`grid ${state.totalPairs===3?'grid-cols-3':'grid-cols-4'} gap-2 sm:gap-3`}>
      {state.cards.map((card, index) => <button key={index} type="button" disabled={disabled || card.faceUp}
        aria-label={`Card ${index + 1}, ${card.faceUp ? `${card.value}, ${card.matched ? 'matched' : 'face up'}` : 'face down'}`}
        onClick={() => { if (!disabled && !card.faceUp) onAction({ type: 'flip', index }); }}
        className={`relative min-w-0 min-h-24 sm:min-h-28 p-1.5 sm:p-3 border-2 border-black rounded-xl shadow-brutal-badge font-istok focus:outline-2 focus:outline-offset-4 ${card.matched ? 'bg-[#CCFBF1]' : card.faceUp ? 'bg-white' : 'bg-[#FFB8B5] text-black enabled:hover:bg-[#FFC8C5]'} ${disabled ? 'opacity-60' : ''}`}>
        {card.faceUp ? <><ShapeSymbol name={card.value} />{card.matched && <span aria-hidden="true" className="absolute right-1 top-0.5 text-xs font-bold text-[#0F766E]">✓</span>}</>
          : <><span className="block text-3xl font-bold text-[#9C3151]" aria-hidden="true">?</span><span className="block text-[11px] mt-1">Card {index + 1}</span></>}
      </button>)}
    </div>
  </div>;
}
