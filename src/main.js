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
