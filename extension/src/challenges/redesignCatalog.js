const variants = ['arithmetic', 'missing', 'constraints', 'operators'];
const descriptions = {
  maths: 'Complete the maths set.',
  memory: 'Find every matching pair.',
  route: 'Plan a route through the checkpoints.',
  ordering: 'Arrange the objects to satisfy every clue.'
};
export function selectModuleIds(level) {
  return [1, 2, 3, 4].includes(level) ? Object.keys(descriptions) : [];
}
export function getModuleMetadata(id, version = id === 'memory' ? 2 : 1) {
  if (!Object.hasOwn(descriptions, id) || !(version === 1 || id === 'memory' && version === 2)) throw Error('Unsupported challenge version.');
  return {
    id,
    version,
    persistence: 'tab',
    instructions: descriptions[id],
    ...(id === 'maths' ? {
      variants
    } : {})
  };
}
