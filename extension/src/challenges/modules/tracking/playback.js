// Each object retains an internal identity while its position changes. Choice buttons use slots only.
export function buildTimeline(plan) {
  const positions = Array.from({ length: plan.size }, (_, i) => i);
  const lifts = positions.map(() => 0), frames = [];
  const push = (at, highlight = false, finished = false) => frames.push({ at, positions: [...positions], lifts: [...lifts], highlight, finished });
  push(0, true);
  let at = plan.highlightMs;
  for (const [a,b] of plan.swaps) {
    const first = positions.indexOf(a), second = positions.indexOf(b);
    lifts[first] = -22; lifts[second] = 22; push(at);
    at += plan.stepMs / 3;
    positions[first] = b; positions[second] = a; push(at);
    at += plan.stepMs / 3;
    lifts[first] = 0; lifts[second] = 0; push(at);
    at += plan.stepMs / 3 + plan.pauseMs;
  }
  push(at, false, true);
  return frames;
}
