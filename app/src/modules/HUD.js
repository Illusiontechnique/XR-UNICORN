// Module wrapper for legacy HUD
export const HUD = (typeof window !== 'undefined' && window.HUD) ? window.HUD : null;
export default HUD;
