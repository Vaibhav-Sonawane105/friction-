import { getModuleMetadata } from './redesignCatalog';
export { selectModuleIds } from './redesignCatalog';
export { reserveType, recordPuzzle } from './rotation';
const models = {
  maths: () => import('./modules/maths/model.js'),
  route: () => import('./modules/route/model.js'),
  ordering: () => import('./modules/ordering/model.js'),
  memory: () => import('./modules/memory/v2.js')
};
const loaders = {
  maths: () => import('./modules/maths/View.jsx'),
  memory: () => import('./modules/memory/View.jsx'),
  route: () => import('./modules/route/View.jsx'),
  ordering: () => import('./modules/ordering/View.jsx')
};
export function getModuleDescriptor(id, version) {
  const metadata = getModuleMetadata(id, version);
  return {
    ...metadata,
    loadView: loaders[id],
    loadModel: id === 'memory' && metadata.version === 1 ? () => import('./modules/memory/model.js') : models[id]
  };
}
