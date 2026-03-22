import * as THREE from 'three';

/**
 * @description
 * Simple audio manager for Three.js that loads audio buffers, manages
 * positional and non-positional sources, and provides safe playback APIs.
 *
 * Usage:
 *   const audioMgr = new AudioManager();
 *   audioMgr.loadAudio('whinny','assets/whinny.ogg');
 *   audioMgr.setListener(cameraAudioListener);
 *   audioMgr.playAudio('whinny', g_modelMesh, { loop: false });
 */
export class AudioManager {
	constructor() {
		this.audioLoader = new THREE.AudioLoader();
		this.audioCache = {};
		this.audioListener = null;
	}

	/**
	 * Assign the THREE.AudioListener used for playback.
	 * @param {THREE.AudioListener} audioListener
	 */
	setListener(audioListener) {
		this.audioListener = audioListener;
	}

	/**
	 * Load an audio file into the cache.
	 * @param {string} name
	 * @param {string} src
	 * @returns {Promise<AudioBuffer>}
	 */
	loadAudio(name, src) {
		return new Promise((resolve, reject) => {
			if (!name || !src) {
				reject(new Error('Invalid parameters')); // guard for invalid refs
				return;
			}

			this.audioLoader.load(src,
				(buffer) => {
					this.audioCache[name] = this.audioCache[name] || {};
					this.audioCache[name].buffer = buffer;
					resolve(buffer);
				},
				null,
				(err) => {
					reject(new Error(`Failed to load ${err.currentTarget.src}`));
				}
			);
		});
	}

	/**
	 * Get a previously loaded audio buffer.
	 * @param {string} name
	 * @returns {AudioBuffer|undefined}
	 */
	getAudioBuffer(name) {
		return this.audioCache[name]?.buffer;
	}

	/**
	 * Play audio by name.
	 * @param {string} name
	 * @param {THREE.Object3D|null} objForAudio - if provided, pos audio is attached to this object.
	 * @param {object} options
	 * @param {boolean} options.onlyIfNotPlaying
	 * @param {number} options.refDistance
	 * @param {boolean} options.loop
	 * @param {number} options.fadeInTime
	 */
	playAudio(name, objForAudio = null, options = {}) {
		if (!this.audioListener) {
			console.error('No AudioListener assigned!');
			return;
		}

		const audioData = this.audioCache[name];
		if (!audioData?.buffer) {
			console.error(`No audio data for ${name}`);
			return;
		}

		const {
			onlyIfNotPlaying = false,
			refDistance = 0.75,
			loop = false,
			fadeInTime = 0
		} = options;

		let audioObj;
		if (objForAudio) {
			if (!audioData.posAudioObj) {
				audioData.posAudioObj = new THREE.PositionalAudio(this.audioListener);
			}
			audioObj = audioData.posAudioObj;
			audioObj.setRefDistance(refDistance);
			if (!audioObj.parent) {
				objForAudio.add(audioObj);
			} else if (audioObj.parent !== objForAudio) {
				audioObj.parent.remove(audioObj);
				objForAudio.add(audioObj);
			}
		} else {
			if (!audioData.audioObj) {
				audioData.audioObj = new THREE.Audio(this.audioListener);
			}
			audioObj = audioData.audioObj;
		}

		if (audioObj.isPlaying) {
			if (onlyIfNotPlaying) {
				return;
			}
			audioObj.stop();
		}

		// Avoid needless re-assignments if the same buffer is already set.
		if (audioObj.buffer !== audioData.buffer) {
			audioObj.setBuffer(audioData.buffer);
		}
		audioObj.setLoop(loop);

		const gainParam = audioObj.gain?.gain;
		const audCtx = audioObj.context;
		if (gainParam && audCtx && fadeInTime > 0) {
			gainParam.setValueAtTime(0, audCtx.currentTime);
			gainParam.linearRampToValueAtTime(gainParam.defaultValue, audCtx.currentTime + fadeInTime);
		} else if (gainParam && audCtx) {
			gainParam.cancelScheduledValues(audCtx.currentTime);
			gainParam.value = gainParam.defaultValue;
		}

		audioObj.play();
	}

	/**
	 * Stop playing audio (optionally fade out).
	 * @param {string} name
	 * @param {object} options
	 * @param {number} options.fadeOutTime
	 */
	stopAudio(name, options = {}) {
		const audioData = this.audioCache[name];
		if (!audioData) {
			return;
		}

		const { fadeOutTime = 0 } = options;
		const stopFn = (audioObj) => {
			if (!audioObj || !audioObj.isPlaying) {
				return;
			}
			if (fadeOutTime > 0 && audioObj.gain && audioObj.context) {
				const gainParam = audioObj.gain.gain;
				const audCtx = audioObj.context;
				gainParam.setValueAtTime(gainParam.value, audCtx.currentTime);
				gainParam.linearRampToValueAtTime(0, audCtx.currentTime + fadeOutTime);
				setTimeout(() => {
					if (audioObj.isPlaying) {
						audioObj.stop();
					}
				}, fadeOutTime * 1000);
			} else {
				audioObj.stop();
			}
		};

		stopFn(audioData.audioObj);
		stopFn(audioData.posAudioObj);
	}

	/**
	 * Dispose of all loaded audio resources.
	 */
	dispose() {
		for (const item of Object.values(this.audioCache)) {
			if (item.audioObj) {
				item.audioObj.stop();
			}
			if (item.posAudioObj) {
				item.posAudioObj.stop();
			}
		}
		this.audioCache = {};
	}
}

export default AudioManager;
