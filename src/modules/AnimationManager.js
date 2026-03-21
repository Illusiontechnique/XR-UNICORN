// Module wrapper for legacy AnimationManager
export const AnimationManager = (typeof window !== 'undefined' && window.AnimationManager) ? window.AnimationManager : null;
export default AnimationManager;
