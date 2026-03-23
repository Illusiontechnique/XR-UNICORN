import * as THREE from 'three';

export class HUD {
	constructor(scene) {
		this.scene = scene;
		this.HUDObjects = [];
	}

	addUIElement(relativeLeft, relativeTop, action, color, width, height, textureName, isTransparent) {
		relativeLeft = Math.min(Math.max(relativeLeft, 0.0), 1.0);
		relativeTop = Math.min(Math.max(relativeTop, 0.0), 1.0);
		action = action || "noop";
		if ( isTransparent == null ) {
			isTransparent = true;
		}
		const g = new THREE.PlaneBufferGeometry(1, 1, 1, 1);
		const m = new THREE.MeshBasicMaterial({ color: color });
		m.color.convertSRGBToLinear();
		if ( textureName ) {
			// Texture manager will be set on window by main
			if ( window.g_texMgr ) {
				const tex = window.g_texMgr.getTexture(textureName);
				if ( tex ) {
					m.map = tex;
					m.transparent = isTransparent;
				} else {
					console.error(`Couldn't retrieve texture with name ${textureName} from TextureMgr.`);
				}
			} else {
				console.error("Can't load texture without TextureMgr.");
			}
		}
		const mesh = new THREE.Mesh(g, m);
		mesh.userData.relLoc = [relativeLeft, relativeTop];
		mesh.userData.uiAction = action;
		mesh.userData.disabled = false;
		mesh.userData.width = width;
		mesh.userData.height = height;
		mesh.userData.calculatedWH = false;
		this.HUDObjects.push(mesh);
		this.scene.add(mesh);
	}

	update(camera) {
		for ( const obj of this.HUDObjects ) {
			if ( !obj.userData.calculatedWH ) {
				if ( !obj.userData.width && ! obj.userData.height ) {
					obj.userData.width = 0.15;
					obj.userData.height = 0.15 * camera.aspect;
				} else if ( !obj.userData.width ) {
					obj.userData.width = obj.userData.height / camera.aspect;
				} else if ( !obj.userData.height) {
					obj.userData.height = obj.userData.width * camera.aspect;
				}
				const s = new THREE.Vector3(obj.userData.width * 2, obj.userData.height * 2, -0.99);
				obj.userData.calculatedWH = true;
			}
		}
	}
}

export default HUD;
