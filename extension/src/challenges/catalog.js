const modules = {
  arithmetic: {
    id: 'arithmetic', version: 1, level: 1, persistence: 'tab',
    instructions: 'Solve this arithmetic challenge to unlock temporary browsing access.',
  },
  equations: {
    id: 'equations', version: 1, level: 2, persistence: 'tab', variants: ['linear', 'derivative'],
    instructions: 'Solve a linear equation or evaluate an introductory derivative to unlock temporary access.',
  },
};

export function getModuleMetadata(id, version = 1) {
  const descriptor = Object.hasOwn(modules, id) ? modules[id] : null;
  if (!descriptor || descriptor.version !== version) throw new Error('This challenge module or version is unavailable.');
  return descriptor;
}

export function selectModuleIds(level) {
  return Object.values(modules).filter(module => module.level === level).map(module => module.id);
}
