// Module wrapper for legacy TextureManager
export const TextureManager = (typeof window !== 'undefined' && window.TextureManager) ? window.TextureManager : null;
export default TextureManager;
