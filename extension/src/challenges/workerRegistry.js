import { getModuleMetadata } from './catalog';
import * as arithmetic from './modules/arithmetic/model';
import * as equations from './modules/equations/model';
import * as tracking from './modules/tracking/model';
import * as memory from './modules/memory/model';
import * as attention from './modules/attention/model';
export { selectModuleIds } from './catalog';

// MV3 workers cannot call import(). Pure models are bundled statically; only the
// selected model is invoked. Interactive views remain lazy in the browser registry.
const models = { arithmetic, equations, tracking, memory, attention };
export function getModuleDescriptor(id, version = 1) {
  return { ...getModuleMetadata(id, version), loadModel: async () => models[id] };
}
