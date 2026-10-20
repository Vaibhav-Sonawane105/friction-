import { getModuleMetadata } from './catalog';
import * as arithmetic from './modules/arithmetic/model';
export { selectModuleIds } from './catalog';

// MV3 workers cannot call import(). Pure models are bundled statically; only the
// selected model is invoked. Interactive views remain lazy in the browser registry.
const models = { arithmetic };
export function getModuleDescriptor(id, version = 1) {
  return { ...getModuleMetadata(id, version), loadModel: async () => models[id] };
}
