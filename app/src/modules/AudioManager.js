// Module wrapper for legacy AudioManager
export const AudioManager = (typeof window !== 'undefined' && window.AudioManager) ? window.AudioManager : null;
export default AudioManager;
