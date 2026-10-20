import { getModuleMetadata } from './catalog';
export { selectModuleIds } from './catalog';

const loaders = {
  attention: {
    loadModel: () => import('./modules/attention/model.js'),
    loadView: () => import('./modules/attention/View.jsx'),
  },
  memory: {
    loadModel: () => import('./modules/memory/model.js'),
    loadView: () => import('./modules/memory/View.jsx'),
  },
  tracking: {
    loadModel: () => import('./modules/tracking/model.js'),
    loadView: () => import('./modules/tracking/View.jsx'),
  },
  arithmetic: {
    loadModel: () => import('./modules/arithmetic/model.js'),
    loadView: () => import('./modules/arithmetic/View.jsx'),
  },
  equations: {
    loadModel: () => import('./modules/equations/model.js'),
    loadView: () => import('./modules/equations/View.jsx'),
  },
};

export function getModuleDescriptor(id, version = 1) {
  return { ...getModuleMetadata(id, version), ...loaders[id] };
}
