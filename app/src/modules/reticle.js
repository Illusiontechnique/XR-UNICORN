// Module wrapper for legacy reticle class
export const reticle = (typeof window !== 'undefined' && window.reticle) ? window.reticle : null;
export default reticle;
