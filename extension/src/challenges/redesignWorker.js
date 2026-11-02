import { getModuleMetadata } from './redesignCatalog';
import * as maths from './modules/maths/model';
import * as route from './modules/route/model';
import * as ordering from './modules/ordering/model';
import * as memory from './modules/memory/v2';
import * as oldMemory from './modules/memory/model';
export { selectModuleIds } from './redesignCatalog';
export { reserveType, recordPuzzle } from './rotation';
const models = {
  maths,
  route,
  ordering,
  memory
};
export function getModuleDescriptor(id, version) {
  const meta = getModuleMetadata(id, version);
  return {
    ...meta,
    loadModel: async () => id === 'memory' && meta.version === 1 ? oldMemory : models[id]
  };
}
