import * as runtime from './challengeRuntime';
import { handleChallengeControl } from '../dev/challengeControls';

const worker = { ...runtime, handleChallengeControl };
export const getChallengeRuntime = () => worker;
