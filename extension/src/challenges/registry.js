import { getModuleMetadata } from './catalog';
export { selectModuleIds } from './catalog';

const loaders = {
  arithmetic: {
    loadModel: () => import('./modules/arithmetic/model.js'),
    loadView: () => import('./modules/arithmetic/View.jsx'),
  },
};

export function getModuleDescriptor(id, version = 1) {
  return { ...getModuleMetadata(id, version), ...loaders[id] };
}
