import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureManager } from './lib/TextureManager.js';
import { AudioManager } from './lib/AudioManager.js';
import { HUD } from './lib/HUD.js';

// Expose core libraries and classes to the legacy globals so existing
// scripts keep working until they are migrated to ESM.
window.THREE = THREE;
window.GLTFLoader = GLTFLoader;
window.TextureManager = TextureManager;
window.AudioManager = AudioManager;
window.HUD = HUD;

console.log('Vite scaffold: three, GLTFLoader and core classes exposed on window');

async function bootstrapLegacy() {
  // Load legacy constructors (sets window.* for compatibility)
  await import('../js/ActionStateManager.js');
  await import('../js/AnimationManager.js');
  await import('../js/RaycasterWrapper.js');
  await import('../js/Reticle.js');

  // Entry script for XR Unicorn that currently calls init() on import.
  await import('../js/illusiontechnique_unicorns.js');

  console.log('Legacy XR Unicorn loaded successfully');
}

bootstrapLegacy().catch((err) => {
  console.error('Failed to bootstrap legacy app:', err);
});
