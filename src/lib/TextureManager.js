import * as THREE from 'three';

export class TextureManager {
	constructor() {
		this.texLoader = new THREE.TextureLoader();
		this.texMap = {};
	}

	loadTexture(name, src, textureEncoding) {
		return new Promise((resolve, reject) => {
			if ( !name || !src ) {
				reject(new Error("Invalid parameters"));
				return;
			}

			this.texLoader.load(src, (texture) => {
				this.texMap[name] = texture;
				texture.encoding = textureEncoding || THREE.sRGBEncoding;
				resolve(texture);
			}, null, (err) => {
				reject(new Error(`Failed to load ${err.currentTarget.src}`));
			});
		});
	}

	getTexture(name) {
		return this.texMap[name];
	}

	disposeAll() {
		for ( let [key, value] of Object.entries(this.texMap) ) {
			value.dispose();
			this.texMap[key] = null;
		}
		this.texMap = {};
	}
}

export default TextureManager;
