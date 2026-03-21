// Module wrapper for legacy RaycasterWrapper
export const RaycasterWrapper = (typeof window !== 'undefined' && window.RaycasterWrapper) ? window.RaycasterWrapper : null;
export default RaycasterWrapper;
