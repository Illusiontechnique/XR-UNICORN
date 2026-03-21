//jasonhendrik - illusiontechnique 2021 - prototype v1



function showMsg(msg, type) {
	
	let msgStr = msg.message || msg;

	let consoleMsgFn = null;
	if ( type == "error" ) {
		consoleMsgFn = console.error;
		// Also show the error logo.
		// TODO This is probably not the best location for this code.
		document.getElementById("error_wrapper").classList.remove("hidden");
		// And also temporarily hide the load/enter logos.
		document.getElementById("loading_wrapper").classList.add("temp_hidden");
		document.getElementById("enter_wrapper").classList.add("temp_hidden");
	} else if ( type == "warn" ) {
		consoleMsgFn = console.warn;
	} else if ( type == "debug" ) {
		consoleMsgFn = console.debug;
		// TEMP ->
		// Don't show "debug" message in the message panel.
		msgStr = null;
		// TEMP <-
	} else {
		consoleMsgFn = console.log;
		// TEMP ->
		// Don't show "log" messages in the message panel.
		msgStr = null;
		// TEMP <-
	}
	consoleMsgFn(msg);

	if ( msgStr ) {
		const msgPane = document.getElementById("msg_panel");
		msgPane.classList.add("active");
		msgPane.textContent = msgStr;
	}
}

function hideMsg() {
	let msgPane = document.getElementById("msg_panel");
	msgPane.classList.remove("active");

	// Also hide the error logo (in case it was showing).
	document.getElementById("error_wrapper").classList.add("hidden");
	// And if needed show the temporarily hidden load/enter logos again.
	if ( !document.getElementById("logos_container").classList.contains("loading_finished") ) {
		// Only show the "unhide" the loading wrapper in case loading
		// didn't finish yet. Otherwise unhiding it will basically
		// trigger the fade-out effect of it again, which makes it show
		// up again shortly beneath the enter logo.
		document.getElementById("loading_wrapper").classList.remove("temp_hidden");
	}
	document.getElementById("enter_wrapper").classList.remove("temp_hidden");
}


let g_debug = false;

let alreadyCreated = false;
let g_canvas = null;
let g_xrSession = null;
let g_xrRefSpace = null;
let g_renderer = null;
let g_camera = null;
let g_scene = null;
let g_reticle = null;
let g_hud = null;
let g_modelMesh = null;
let g_viewerHitTestSource = null;
let g_raycaster = null;
let g_texMgr = null;
let g_audioMgr = null;
let g_animMgr = null;
let g_actionStateMgr = null;

let g_roarObj = null;
let g_prevHrTime = performance.now();

let g_gltfModelRig = null;
// The model's default height (in [m]).
const g_defModelHeight = .20;
// The model's enlarged size (in [m]).
const g_enlargedModelHeight = 1.325;

// Used to store and handle the select's input pose until after the camera is
// also updated with the most recent pose information.
let g_storedSelectData = null;

let g_btnSndsActive = true;
let g_btnShadowsActive = false;

let strDownloadMime = "image/octet-stream";



function init() {
	let msgPane = document.getElementById("msg_panel");
	msgPane.addEventListener("click", hideMsg);


	// Show the info panel when #btn_info is clicked.
	document.getElementById("btn_info").addEventListener("click", () => {
		document.getElementById("info_panel_container").classList.toggle("active");
	});
	// Hide the info panel when the #btn_close_info is clicked.
	document.getElementById("btn_close_info").addEventListener("click", () => {
		document.getElementById("info_panel_container").classList.toggle("active");
		
		
	});

	// Check if WebXR and "immersive-ar" is available. And if so, then start
	// loading the resources.
	if ( !navigator.xr ) {
		showMsg("WebXR not supported. Please use xrCompatible device and browser.", "error");
		return;
	}
	navigator.xr.isSessionSupported("immersive-ar")
	.then((isSupported) => {
		if ( isSupported ) {
			showMsg("immersive-ar supported!");
			// Make the loading and enter logo wrappers visible.
			document.getElementById("loading_wrapper").classList.remove("hidden");
			document.getElementById("enter_wrapper").classList.remove("hidden");

			// Start loading the resources.
			// Note: Since the resources are loaded here before
			// starting the XRSession, we shouldn't dispose of those
			// resources when the XRSession ends. Otherwise the
			// resources won't be available anymore when a new is
			// started again.
			loadResources().then(() => {
				// And once the resources are loaded, show/setup
				// the "Enter AR" button.
				document.getElementById("logos_container").classList.add("loading_finished");
				const btnAR = document.getElementById("btn_enter_ar");
				btnAR.addEventListener("click", setupXRSession);
				btnAR.disabled = false;
			});
		} else {
			showMsg("WebXR immersive-ar sessions not supported.", "error");
		}
	}).catch((err) => {
		showMsg(err, "error");
	});

	// Setup listener and check current state of the Options checkboxes.
	const btnSndsInput = document.getElementById("btnSounds");
	const btnShadowsInput = document.getElementById("btnShadows");
	g_btnSndsActive = btnSndsInput.checked;
	g_btnShadowsActive = btnShadowsInput.unchecked;

	btnSndsInput.addEventListener("change", () => {
		g_btnSndsActive = btnSndsInput.checked;
	});



	btnShadowsInput.addEventListener("change", () => {
		g_btnShadowsActive = btnShadowsInput.checked;
	});



	// Prevent the info panel from being hidden when clicking on one of the
	// elements on the "bottom_row" of the info panel.
	// for ( const el of document.getElementById("bottom_row").children ) {
	// 	el.addEventListener("click", (evt) => {
	// 		// Stop the click event propagation, so the (parent)
	// 		// info panel won't get hidden if this is clicked.
	// 		evt.stopPropagation();
	// 	});
	// }

	window.addEventListener("resize", onResize);
}






function loadResources() {
	

	if ( !g_texMgr ) {
		g_texMgr = new TextureManager();
	}
	if ( !g_audioMgr ) {
		g_audioMgr = new AudioManager();
	}


	return Promise.allSettled([
		
		g_texMgr.loadTexture("icon_exit", "assets/icon_exit.png"),
		g_texMgr.loadTexture("logo_image", "assets/illusiontechnique_logo.png"),
		g_texMgr.loadTexture("overlay-top", "assets/unicorn_01.png"),
		g_texMgr.loadTexture("overlay-left", "assets/unicorn_02.png"),
		g_texMgr.loadTexture("overlay-right", "assets/unicorn_04.png"),
		g_texMgr.loadTexture("overlay-bottom", "assets/unicorn_05.png"),
		g_texMgr.loadTexture("icon_move", "assets/icon_move.png"),
		g_texMgr.loadTexture("icon_remove", "assets/icon_remove.png"),
		g_texMgr.loadTexture("icon_scale", "assets/icon_scale.png"),
		g_texMgr.loadTexture("icon_flying", "assets/icon_flying.png"),
		g_texMgr.loadTexture("icon_standing", "assets/icon_standing.png"),
		g_texMgr.loadTexture("icon_capture", "assets/icon_capture.png"),
		g_texMgr.loadTexture("reticle", "assets/reticle_1.png"),
		g_texMgr.loadTexture("reticle_alt", "assets/reticle_2.png"),
		g_texMgr.loadTexture("shadowBlob", "assets/shadowBlob.png"),
		g_audioMgr.loadAudio("whinny", "assets/whinny.ogg"),
		g_audioMgr.loadAudio("flapSound", "assets/wingflap.ogg"),
		g_audioMgr.loadAudio("popSound", "assets/pop1.ogg"),
		loadGltfModel("assets/Unicorn_00.glb"),
		
		]).then((results) => {
			results.forEach((result) => {
			// Show an error message for any resource that failed to
			// load.
			if ( result.status == "rejected" ) {
				console.error(result.reason);
				//   TODO Maybe do a catch on the resource loading
				// promises instead, so we can know which one
				// failed?
				showMsg("Error loading a resource.", "error");
			}
		});
		});

		

	}


	function loadGltfModel(filepath) {

		
		const loader = new THREE.GLTFLoader();
		return new Promise((resolve, reject) => {
			loader.load(filepath, resolve, null, reject);

		}).then((gltfModel) => {



			gltfModel.scene.castShadow = true;
			
			gltfModel.scene.traverse( function( child ){ 
				child.castShadow = true;
			//child.receiveShadow = true,
		} );

			const root = gltfModel.scene;
		// Rotate the model so it correctly faces forward.
		// TODO Can't we do this in Blender already?
		root.rotation.x = -Math.PI / 2;
		// Use a model rig, so we can later on modify the transform
		// without having to take the actual glTF model's rotation
		// into account.

		g_gltfModelRig = new THREE.Group();
		
		g_gltfModelRig.add(root);

		// We add the AnimationMixer and the gltfModel as userData
		// properties, so we can access the animations later on.
		g_gltfModelRig.userData["gltfModel"] = gltfModel;
		g_animMgr = new AnimationManager(root, gltfModel.animations);

		// DEBUG ->
		console.debug("Loaded glTF model", g_gltfModelRig);
		// DEBUG <-
		
		// Get model size...
		const boxSize = new THREE.Vector3();
		const bbox = new THREE.Box3();
		bbox.setFromObject(root).getSize(boxSize);
		// ... then scale the model so it's about 30cm high, ...
		const scaleFactor = (1 / boxSize.y) * g_defModelHeight;
		
		// DEBUG >>>
		console.debug(`Model scale factor: ${scaleFactor}, org box height: ${boxSize.y}`);
		// DEBUG <<<
		g_gltfModelRig.scale.setScalar(scaleFactor);
		g_gltfModelRig.userData.isDefaultSize = true;
		// ... and store model's original height in the userData.
		g_gltfModelRig.userData.orgHeight = boxSize.y;

		return g_gltfModelRig;
	});


		
	}

	function setupXRSession() {
		g_audioMgr.playAudio("startSound", g_modelMesh);
		if ( !g_xrSession ) {
		// Need to request hit-test upon session request. See example:
		// https://web.dev/ar-hit-test/
		navigator.xr.requestSession("immersive-ar", {
			requiredFeatures: ["local", "hit-test"],
			
			//capt
			optionalFeatures: ["secondary-views"]
		})
		.then((xrSession) => {
			if ( !xrSession.requestHitTestSource ) {
				showMsg("HitTesting unavailable. Aborting...", "error");
				xrSession.end();
				return;
			}
			g_xrSession = xrSession;
			xrSession.addEventListener("end", onXRSessionEnded);
			// Setup a "select" (~= "click" event) handler.
			xrSession.addEventListener("select", onXRSessionSelect);

			if ( !g_renderer ) {
				// Add the canvas to #container.
				if ( g_canvas == null ) {
					g_canvas = document.createElement("canvas");
					document.getElementById("container").appendChild(g_canvas);
				}
				let context = g_canvas.getContext("webgl2", {
					xrCompatible: true
				});
				let w = window.innerWidth;
				let h = window.innerHeight;
				g_renderer = new THREE.WebGLRenderer({
					"antialias" : true,
					"canvas": g_canvas,
					"context": context,
					"preserveDrawingBuffer": true,
					//"shadowMapEnabled": true,
					"shadowMapRenderSingleSide": false,
					
				});			
				g_renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
				g_renderer.shadowMap.enabled = true;
				//g_renderer.setPixelRatio(window.devicePixelRatio);
				g_renderer.setSize(w, h, false);
				g_renderer.autoClear = false;
				// Setup renderer to use the correct color
				// space. We do this mainly because the glTF
				// model's textures will be using the sRGB
				// encoding.
				// Note: Since we set the output encoding to
				// sRGB, we'll also need to make sure our colors
				// and texutures that we set and load manually
				// need to be converted correctly.
				// https://github.com/mrdoob/three.js/pull/18127
				g_renderer.outputEncoding = THREE.sRGBEncoding;

				g_camera = new THREE.PerspectiveCamera(
					45,	// viewAngle
					w / h,	// aspectRatio
					0.001,	// near
					750	// far
					);
				// Since we'll be setting the camera's matrices
				// ourselves, we need to disable auto updates.
				// See also: https://threejs.org/docs/index.html#manual/en/introduction/Matrix-transformations
				g_camera.matrixAutoUpdate = false;

				g_scene = new THREE.Scene();

				if ( g_debug ) {
					// Show a gizmo at the origin.
					g_scene.add(new THREE.AxesHelper(50));
				}
				
				

				if ( g_gltfModelRig ) {
					g_modelMesh = g_gltfModelRig;
				} else {
					console.warn("No glTF model available. Using a simple box as fallback instead.");
					const geometry = new THREE.BoxBufferGeometry(0.1, g_defModelHeight, 0.1);
					// Move the geometry slightly up, so its
					// origin is at the bottom face.
					geometry.translate(0, g_defModelHeight/2, 0);
					const material = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
					material.color.convertSRGBToLinear();
					g_modelMesh = new THREE.Group();
					g_modelMesh.add(new THREE.Mesh(geometry, material));
					
					g_modelMesh.userData.orgHeight = g_defModelHeight;
					g_modelMesh.userData.isDefaultSize = true;
				}
				
				g_modelMesh.visible = false;

				g_scene.add(g_modelMesh);
				
				
				if (g_btnShadowsActive){
					createLightingSetup2();
				} else {
					createLightingSetup1();
				}


				g_raycaster = new RaycasterWrapper(g_scene);
				g_raycaster.debug = g_debug;

				// Create an audio listener and attach it to the
				// camera, so that any positional audio that is
				// being played will sound as heared from the
				// camera's (i.e. viewer) position.
				const audioListener = new THREE.AudioListener();
				g_camera.add(audioListener);
				// And also provide the audio listener to the
				// AudioManager.
				g_audioMgr.setListener(audioListener);
			}

			xrSession.updateRenderState({
				baseLayer: new XRWebGLLayer(xrSession, g_renderer.getContext())
			});
			// Note: "local-floor" doesn't seem to yet be supported
			// by AR. Though the WebXR states that if "local" is
			// suppported then "local-floor" must also be supported.
			xrSession.requestReferenceSpace("local")
			.then((xrRefSpace) => {
				g_xrRefSpace = xrRefSpace;

				initActionStates();
				// Note: We create the HUD before creating the
				// reticle, so we can catch the initial
				// "hitteststatechange" event and show the
				// indication that the user should move the
				// device around while the AR tracking is
				// unstable.
				g_hud = new HUD(g_scene);
				setupUIButtons();

				// Construct a textures plane mesh to use as
				// the reticle (instead of the default ring).
				const g = new THREE.PlaneBufferGeometry(0.1, 0.1, 1, 1);
				g.rotateX(-Math.PI / 2);
				const m = new THREE.MeshBasicMaterial();
				m.map = g_texMgr.getTexture("reticle");
				m.transparent = true;

				g_reticle = new reticle(xrSession, xrRefSpace, g_scene, g_camera, new THREE.Mesh(g, m));
				g_reticle.addEventListener("hitteststatechange", onHitTestStateChange);
				g_reticle.debug = g_debug;
				// Enable the reticle, which will
				// asynchronously try to create an
				// XRHitTestSource.
				g_reticle.enable().catch((err) => {
					// If enabling the reticle fails, we
					// abort the session. Note that we
					// might already be rendering when this
					// happens.
					showMsg(err, "error");
					xrSession.end();
				});

				// Start the rendering loop.
				xrSession.requestAnimationFrame(onXRFrame);
			})
			.catch((err) => {
				showMsg(err, "error");
				// End the session if we failed to get an
				// xrRefSpace.
				xrSession.end();
			});
		}).catch((err) => {
			showMsg(err, "error");
			// Make sure we "clean up".
			if ( g_xrSession ) {
				g_xrSession.end();
			}
		});
	} else {
		// In case we decide the button to be a toggle button.
		g_xrSession.end();
	}
}


//REGULAR LIGHTING
function createLightingSetup1(){
	if (!alreadyCreated){
				// Setup some lighting.
				const ambientLight = new THREE.AmbientLight(0xFFFFFF, .325);
				g_scene.add(ambientLight);

				//A shadowplane perhaps?
				//Create a plane that receives shadows (but does not cast them)
				const shadowPlaneGeometry = new THREE.PlaneGeometry(100000, 100000);
				shadowPlaneGeometry.rotateX(-Math.PI / 2);

				const shadowPlaneMaterial = new THREE.ShadowMaterial();
				shadowPlaneMaterial.opacity = .30 ;
				const shadowPlane = new THREE.Mesh( shadowPlaneGeometry, shadowPlaneMaterial );	
				shadowPlane.position.set(0,-5, 0);
				shadowPlane.receiveShadow = true;
				g_modelMesh.add( shadowPlane );

				//Middle (of model)
				const fillLight2 = new THREE.PointLight(0xFFFFFF, .45, 12000);
				fillLight2.position.set(0,-5000,1800);
				g_modelMesh.add(fillLight2);


				const backLight = new THREE.DirectionalLight(0xFFFFFF, .15);
				backLight.position.set(0,-1400,-1200);
				g_modelMesh.add(backLight);


				const mainLight = new THREE.PointLight(0xFFFFFF, .55, 120000);
				mainLight.position.set(0, 1400 ,-1200);
				g_modelMesh.add(mainLight);

				
				// Setup Shadow making light source.
				const shadowLight = new THREE.SpotLight( 0xFFFFFF, .25, 15000 );
				shadowLight.position.set( 0,1800,0 );
				shadowLight.shadow.camera.visible = true;
				shadowLight.shadow.mapSize.width = 768; 
				shadowLight.shadow.mapSize.height = 768 ; 
				shadowLight.shadow.camera.near = .1;
				shadowLight.shadow.camera.far = 12000; 
				shadowLight.shadow.camera.fov = 55;
				shadowLight.focus = .4;
				shadowLight.angle = 1.02;
				shadowLight.penumbra = 1; 
				//shadowLight.shadow.bias = - 0.000222;
				shadowLight.castShadow = true;
				shadowLight.target = g_gltfModelRig;
				
				g_modelMesh.add(shadowLight);

				if ( g_debug ) {
					g_modelMesh.add(new THREE.AxesHelper(50));

					const shadowLightHelper = new THREE.SpotLightHelper( shadowLight );
					g_modelMesh.add( shadowLightHelper );

					// const mainLightHelper = new THREE.PointLightHelper( mainLight );
					// g_scene.add( mainLightHelper );

					// const fillLight0Helper = new THREE.PointLightHelper( fillLight0 );
					// g_scene.add( fillLight0Helper );

					// const fillLight1Helper = new THREE.PointLightHelper( fillLight1 );
					// g_scene.add( fillLight1Helper );

					// const fillLight2Helper = new THREE.PointLightHelper( fillLight2 );
					// g_scene.add( fillLight2Helper );
					
					const shadowCameraHelper = new THREE.CameraHelper( shadowLight.shadow.camera );
					g_scene.add( shadowCameraHelper );

					
				}
				alreadyCreated = true;
			}
		}


//LONG SHADOW LIGHTING
function createLightingSetup2(){

	if(!alreadyCreated){
				// Setup some lighting.
				const ambientLight = new THREE.AmbientLight(0xFFFFFF, .325);
				g_scene.add(ambientLight);

				//A shadowplane perhaps?
				//Create a plane that receives shadows (but does not cast them)
				const shadowPlaneGeometry = new THREE.PlaneGeometry(100000, 100000);
				shadowPlaneGeometry.rotateX(-Math.PI / 2);
				const shadowPlaneMaterial = new THREE.ShadowMaterial();
				shadowPlaneMaterial.opacity = .70 ;
				const shadowPlane = new THREE.Mesh( shadowPlaneGeometry, shadowPlaneMaterial );	
				shadowPlane.position.set(0,-5, 0);
				shadowPlane.receiveShadow = true;
				g_modelMesh.add( shadowPlane );

				//Middle (of model)
				const fillLight2 = new THREE.PointLight(0xFFFFFF, .45, 12000);
				fillLight2.position.set(0,-5000,1800);
				g_modelMesh.add(fillLight2);

				const backLight = new THREE.DirectionalLight(0xFFFFFF, .15);
				backLight.position.set(0,-1400,-1200);
				g_modelMesh.add(backLight);

				const mainLight = new THREE.PointLight(0xFFFFFF, .55, 12000);
				mainLight.position.set(0, 1400 ,-1200);
				g_modelMesh.add(mainLight);
				
				// Setup Shadow making light source.
				const shadowLight = new THREE.SpotLight( 0xFFFFFF, .25, 240000 );
				shadowLight.position.set( 0,1.25,0 );
				shadowLight.shadow.camera.visible = true;
				shadowLight.shadow.mapSize.width = 768; 
				shadowLight.shadow.mapSize.height = 768 ; 
				shadowLight.shadow.camera.near = .1;
				shadowLight.shadow.camera.far = 240000; 
				shadowLight.shadow.camera.fov = 40;
				shadowLight.focus = .4;
				shadowLight.angle = .99;
				shadowLight.penumbra = 1; 
				shadowLight.castShadow = true;
				
				g_scene.add(shadowLight);

				if ( g_debug ) {
					g_modelMesh.add(new THREE.AxesHelper(50));

					const shadowLightHelper = new THREE.SpotLightHelper( shadowLight );
					g_scene.add( shadowLightHelper );

					// const mainLightHelper = new THREE.PointLightHelper( mainLight );
					// g_scene.add( mainLightHelper );

					// const fillLight0Helper = new THREE.PointLightHelper( fillLight0 );
					// g_scene.add( fillLight0Helper );

					// const fillLight1Helper = new THREE.PointLightHelper( fillLight1 );
					// g_scene.add( fillLight1Helper );

					// const fillLight2Helper = new THREE.PointLightHelper( fillLight2 );
					// g_scene.add( fillLight2Helper );
					
					const shadowCameraHelper = new THREE.CameraHelper( shadowLight.shadow.camera );
					g_scene.add( shadowCameraHelper );

					
				}
				alreadyCreated = true;
			}
			
		}




		function onXRSessionEnded() {
	// Cancel any pending requestAnimationFrame().
	g_xrSession.cancelAnimationFrame(onXRFrame);
	// Not realy needed since we won't be using `g_xrSession` anymore,
	// but just for completeness we deregister the event handler we
	// previously assigned.
	g_xrSession.removeEventListener("select", onXRSessionSelect);

	//showMsg("XRSession ended.", "debug");

	if ( g_reticle ) {
		g_reticle.removeEventListener("hitteststatechange", onHitTestStateChange);
		g_reticle.dispose();
		g_reticle = null;
	}

	if ( g_hud ) {
		g_hud.dispose();
		g_hud = null;
	}

	g_xrSession = null;
	g_xrRefSpace = null;

	if ( g_renderer ) {
		g_renderer.getContext().bindFramebuffer(g_renderer.getContext().FRAMEBUFFER, null);
		g_renderer.dispose();
		g_renderer = null;
		// TODO Dispose of *all* THREE stuff (Mesh, Geometry, Material,
		// Texture)


		g_scene.dispose();
		g_scene = null;
		g_camera = null;
	}

	if ( g_raycaster ) {
		g_raycaster.dispose();
		g_raycaster = null;
	}



	// Cleanup the model.
	// TODO Cleanup the glTF model and also other three.js stuff.
	if ( g_modelMesh ) {
		_resetAngerData(g_modelMesh);

		//g_modelMesh.dispose(); 
		//Reset the model scale so it's ~30cm again when a new session
		//is be started.
		if ( g_modelMesh.userData.orgHeight != null ) {
			g_modelMesh.scale.setScalar((1 / g_modelMesh.userData.orgHeight) * g_defModelHeight);
			g_modelMesh.userData.isDefaultSize = true;
		}
	}


	stopModelAnimations();

	//Cleanup the roar model.
	//TODO Dispose of the Texture assigned to the material.
	// if ( g_roarObj ) {
	// 	const roarSubObj = g_roarObj.getObjectByName("roarObj");
	// 	roarSubObj.geometry.dispose();
	// 	roarSubObj.material.dispose();
	// 	g_roarObj = null;
	// }

	if ( g_actionStateMgr ) {
		g_actionStateMgr.clearAll();
		g_actionStateMgr = null;
	}
	
	g_audioMgr.stopAll();

	// g_scene.remove(g_modelMesh);

}

function onResize() {
	if ( g_renderer ) {
		let w = window.innerWidth;
		let h = window.innerHeight;
		g_renderer.setSize(w, h);

		g_camera.aspect = w / h;
		g_camera.updateProjectionMatrix();
	}
}

function onXRFrame(hrTime, xrFrame) {
	// Request the next frame.
	const xrSession = xrFrame.session;
	xrSession.requestAnimationFrame(onXRFrame);

	// Update the animation mixer of the roar object.
	// TODO Should we use a THREE.Clock instead?
	let deltaSeconds = (hrTime - g_prevHrTime) * 0.001;
	g_prevHrTime = hrTime;
	if ( g_roarObj ) {
		g_roarObj.userData.animMixer.update(deltaSeconds);
	}
	if ( g_animMgr ) {
		g_animMgr.update(deltaSeconds);
	}

	//// DEBUG >>>
	if ( g_debug && g_gltfModelRig ) {
		if ( !g_gltfModelRig.userData.box ) {
			g_gltfModelRig.userData.box = new THREE.BoxHelper(g_gltfModelRig);
			g_scene.add(g_gltfModelRig.userData.box);
		}
		g_gltfModelRig.userData.box.update();
	}
	//// DEBUG <<<

	// Get the viewer's pose.
	const xrViewerPose = xrFrame.getViewerPose(g_xrRefSpace);
	if ( xrViewerPose ) {
		const gl = g_renderer.getContext();
		const xrLayer = xrSession.renderState.baseLayer;

		//gl.bindFramebuffer(gl.FRAMEBUFFER, xrLayer.framebuffer);
		g_renderer.setFramebuffer(xrLayer.framebuffer);

		// TODO Does it make sense to setSize() on resize if we set it
		// here anyway each frame? And/or do we want/need to set the
		// canvas's size here to the framebuffer's size each time (or
		// at all)?
		// Note: The `false` parameter prevents three.js from updating
		// the canvas's style width and height. So only the canvas's
		// dimension are updated.
		// Note: If understood correctly, if the XRWebGLLayer was
		// created with composition disabled (the default), then an
		// 'opaque framebuffer' is created using the provided canvas's
		// context. After that framebuffer is created, its "size cannot
		// be adjusted by the developer after the XRWebGLLayer has been
		// created". So what effect does the g_renderer.setSize() have
		// in the onResize() method? Because that setSize() will change
		// the size of the underlying canvas. But in that case, won't
		// there be a difference between the size of the canvas, and
		// the framebuffer (of the XRWebGLLayer, which has a fixed
		// size)? Or in other words, won't the code below override any
		// changes to the canvas's size after a resize?
		g_renderer.setSize(xrLayer.framebufferWidth, xrLayer.framebufferHeight, false);
		// TODO Do we need to clear? The WebXR docs say that the opaque
		// framebuffer MUST be cleared (by the user agent) prior to
		// processing of each XR animation frame.
		g_renderer.clear();

		for ( let xrView of xrViewerPose.views ) {
			const vp = xrLayer.getViewport(xrView);
			//gl.viewport(vp.x, vp.y, vp.width, vp.height);
			g_renderer.setViewport(vp.x, vp.y, vp.width, vp.height);

			g_camera.projectionMatrix.fromArray(xrView.projectionMatrix);
			// Because `Raycaster::setFromCamera()` internally also
			// calls `unproject(camera)` which then uses
			// `projectionMatrixInverse`, we also need to (manually)
			// update it.
			g_camera.projectionMatrixInverse.getInverse(g_camera.projectionMatrix);
			/*
			// Since render() basically only uses the
			// `projectionMatrix` and `matrixWorldInverse` of the
			// camera, we can just set `matrixWorldInverse`
			// directly instead of having it being updated via
			// setting `matrix` and calling `updateMatrixWorld()`
			// Note: The `matrixWorldInverse` basically acts as the
			// view matrix.
			g_camera.matrixWorldInverse.fromArray(xrView.transform.inverse.matrix);
			*/
			// Because `Raycaster::setFromCamera()` internally uses
			// the camera's `matrixWorld`, we can't just only
			// set the `matrixWorldInverse`.
			g_camera.matrix.fromArray(xrView.transform.matrix);
			// Note: The camera's `updateMatrixWorld()` will also
			// update its `matrixWorldInverse` (based on the
			// current `matrix`).
			// Note: The camera's `matrixAutoUpdate` must be `false`
			// for this to work correctly. Otherwise
			// `updateMatrixWorld()` would call `updateMatrix()`,
			// which would reset the `matrix` (because we didn't
			// set the `position`, `quaternion` & `scale`).
			g_camera.updateMatrixWorld(true);

			// TODO If there are multiple views, then the reticle
			// and hud will be updated multiple times. This is
			// probably not what we want. But updating them outside
			// of the views loop, causes them to use an outdated
			// camera. Which in turn causes "jitter" on the objects
			// that used this outdated camera to update their pose.

			// Update the reticle.
			g_reticle.update(xrFrame);
			// Allow the HUD to update.
			g_hud.update(g_camera);

			g_renderer.render(g_scene, g_camera);

			g_renderer.clearDepth();
		}
	}

	// If there was a select event, then it's callback will have been
	// triggered before this call to onXRFrame(). Because at that time the
	// camera isn't updated yet (while the pose data in the select event
	// is), we postpone actually handling the event until here (i.e. after
	// the camera is also updated with the most recent pose information).
	handleSelectDelayed();
}

/**	In this callback we just get the input's pose and store it in a
 *	`g_storedSelectData` object. We then do the actual ray casting etc. at
 *	the end of the next onXRFrame() animation callback. The latter will
 *	run right after the input event listeners get called (including this
 *	one).
 *	The reason we postpone handling the select event to the end of
 *	onXRFrame(), is because then the camera will be up to date. If we would
 *	do the ray casting here, then the select event's input pose (which in
 *	our case basically corresponds to the camera/viewer) will be (one frame)
 *	newer than the pose that was used to update the g_camera position. And
 *	this would cause a mismatch between the current touch/select position at
 *	which the ray will be casted, and the UI elements that are still at the
 *	"old" camera location.
 *	This one frame delay becomes noticable when moving the device and trying
 *	to click a UI element.
 *
 *	@param {XRInputSourceEvent} evt - The event that triggerd this handler.
 */
 function onXRSessionSelect(evt) {
	// Get the touch location as a 3D position in the refSpace.
	// Note: For "generic-touchscreen" XRInputSources, the resulting pose
	// will represent the location where the screen was touched.
	let inputPose = evt.frame.getPose(evt.inputSource.targetRaySpace, g_xrRefSpace);

	// Note: We use a object instead of directly assigning the inputPose to
	// g_storedSelectData because inputPose might be null. And we want to
	// handle a select event even if the inputPose was null (and check the
	// reticle instead). But if we assign directly, then g_storedSelectData
	// will be null and handleSelectDelayed() would think there was nothing
	// to process. Another option would be to use a separate boolean
	// variable (instead of the object) to signal to handleSelectDelayed()
	// that a select event should be processed.
	g_storedSelectData = {
		"inputPose": inputPose
	};
}

function handleSelectDelayed() {
	if ( !g_storedSelectData ) {
		return;
	}

	let gotVirtualHit = false;

	const inputPose = g_storedSelectData.inputPose;
	if ( inputPose ) {
		// TODO If we move while "clicking" then, often it seems that
		// the ray "misses" the HUD elements. Can we prevent this from
		// happening? (Is there a delay between the click event's
		// location being determined, and the ray being executed? I.e.
		// that the camera is already in a new location, before we get
		// the (slightly out-of-date) "select" pose?)
		// => It seems that the "select" happens during the same frame,
		// so no delay there.
		// ==> The select seems to happen closer to the next frame. I.e.
		// the time between end of onXRFrame() and the call of
		// onXRSessionSelect() is almost a whole frame time (~40-60ms).
		// While the time between onXRSessionSelect() and the start of
		// onXRFrame() is smaller (~5-10ms).
		// ===> Looking at the performance profile in the developer
		// tools, then indeed onXRSessionSelect() is called right before
		// the next onXRFrame(). I.e. onXRSessionSelect() is called
		// in the next frame and before the three.js camera is updated
		// for this new frame.
		let hits = g_raycaster.castRay(inputPose, g_hud.getObjectsForRaycasting());
		if ( hits.length > 0 ) {
			const hit = hits[0];
			// DEBUG ->
			console.debug("Got HUD click", hit);
			// DEBUG <-
			// If a HUD's UI element was clicked, then we want to
			// prevent any other click handling.
			gotVirtualHit = true;

			// Don't do any action if the UI element is disabled.
			// Note: Even if the UI element is disabled, we register
			// it as a virtual hit. Otherwise the user could click
			// "through" disabled UI elements, which is probably
			// not the expected behavior.
			if ( !hit.object.userData.disabled ) {
				const action = hit.object.userData.uiAction;
				// Note: We don't play the button sound when
				// the "move" icon is clicked.
				if ( g_btnSndsActive && g_audioMgr && action != "move" ) {
					g_audioMgr.playAudio("btn_pos");
				}
				if ( hit.object.userData.uiCallback ) {
					hit.object.userData.uiCallback(action);
				}
			} else {
				if ( g_btnSndsActive && g_audioMgr ) {
					g_audioMgr.playAudio("btn_neg");
				}
			}
		}
		// If no HUD element got triggered, see if the model was maybe
		// hit.
		// Note: We use the same inputPose again, so RaycasterWrapper
		// doesn't need to calculate the Ray's position and direction.
		// Note: Also only try to raycast the model when it's visible.
		if ( !gotVirtualHit && g_modelMesh.visible ) {
			// Note: We try to test for a hit on the "Unicorn"
			// submesh, because otherwise the hit would also trigger
			// for the "Nut" submesh (since their both part of
			// parent `g_modelMesh`).
			// Note: We enable recursive raycasting, because
			// `g_modelMesh` is a Group (of which the actual model
			// is a child). And if the "Unicorn" object isn't found
			// (probably because the fallback yellow block is now
			// the model), we still want the raycasting to behave
			// properly.
			const modelToHit = g_modelMesh.getObjectByName("Unicorn") || g_modelMesh;
			hits = g_raycaster.castRay(inputPose, [modelToHit], true);
			if ( hits.length > 0 ) {
				const hit = hits[0];
				// DEBUG ->
				console.debug("Got Model hit", hit);
				// DEBUG <-
				handleModelHit(hit);
				gotVirtualHit = true;
			}
		}
	}

	// Clear the variable, so we don't handle this select event again in the
	// next frame.
	// Note: We need do this here (instead of at the end of the function),
	// because if there was no gotVirtualHit then we return early in the
	// code below.
	g_storedSelectData = null;

	// If we handled the "select" via a hit on any of the virtual objects,
	// then skip the reticle "select" handling code.
	// Otherwise for example if the model hasn't been placed yet and if we
	// "select" one of the HUD buttons, then the model would still be placed
	// at the reticle position.
	if ( gotVirtualHit ) {
		return;
	}

	// Only try to place the model on the reticle position, if the reticle
	// is enabled, and "stable". Note that only an enabled reticle can be
	// "stable".
	if ( g_reticle.isStable ) {
		// Note: Instead of performing a new hit test when the screen
		// is touched, we just reuse the reticle's current position.
		// If the model should be placed depending on where at the
		// screen the touch was registered, then we would need to do
		// a new hit test here, that is cast from the touch location.
		// Note: If the reticle is stable, then it will also have a
		// position.
		let reticlePos = g_reticle.getPosition();
		g_modelMesh.position.copy(reticlePos);
		let lookAtPos = new THREE.Vector3();
		// Note: Needs the camera's `matrix` to be set.
		lookAtPos.setFromMatrixPosition(g_camera.matrix);
		// Rotate `g_modelMesh` towards the camera, but keep it upright
		// by using the mesh's own y coordinate in lookAt().
		g_modelMesh.lookAt(lookAtPos.x, g_modelMesh.position.y, lookAtPos.z);
		
		//part of maintain shoadows directly above model?
		if(g_scene.shadowLight){
			shadowLight.shadow.update( spotLight );
		}	

		g_modelMesh.visible = true;
		g_modelMesh.receiveShadow = true;
		
		// Disable the reticle when the model has been placed (until
		// that model is "delete"-ed via the UI).
		g_reticle.disable();
		if ( g_btnSndsActive && g_audioMgr ) {
			g_audioMgr.playAudio("popSound", g_modelMesh);
		}
		// Randomly swap the reticle for when it is shown again after
		// the model gets deleted.
		
		
		const newreticleTex = Math.random() < 0.5 ? g_texMgr.getTexture("reticle") : g_texMgr.getTexture("reticle_alt");
		if ( newreticleTex ) {
			g_reticle.mesh.material.map = newreticleTex;
			
		}

		enableWholeUI();
		
		// When the model becomes visible, also start its idle animation.
		if ( g_actionStateMgr ) {
			g_actionStateMgr.switchState(MDL_STATE_IDLE);
		}
	}
}

function enableWholeUI(){
		// When the model has been placed, enable the delete button, so
		// it can be "deleted" again. Also enable the scale button.
		g_hud.enableAction("delete");
		g_hud.enableAction("scale");
		g_hud.enableAction("flying");
		//g_hud.enableAction("capture_image");

	}

	function disableWholeUI(){
		// When the model has been placed, enable the delete button, so
		// it can be "deleted" again. Also enable the scale button.
		g_hud.disableAction("delete");
		g_hud.disableAction("scale");
		g_hud.disableAction("flying");
		//g_hud.disableAction("capture_image");

	}

	function hideWholeUI(){
		// When the model has been placed, enable the delete button, so
		// it can be "deleted" again. Also enable the scale button.
		g_hud.hideAction("delete");
		g_hud.hideAction("scale");
		g_hud.hideAction("flying");
		//g_hud.hideAction("capture_image");
		g_hud.hideAction("exit")

	}

	function showWholeUI(){
		// When the model has been placed, enable the delete button, so
		// it can be "deleted" again. Also enable the scale button.
		g_hud.showAction("delete");
		g_hud.showAction("scale");
		g_hud.showAction("flying");
		//g_hud.showAction("capture_image");
		g_hud.showAction("exit")

	}


	function onHitTestStateChange(evt) {
		if ( g_hud ) {
			if ( evt.detail.state == reticle.HitTestStates.UNSTABLE ) {
			// Note: We delay showing the notification by 1 second,
			// so it isn't shown when tracking is lost for just a
			// short period. E.g. tracking is reestablished within a
			// second because the user was already moving the device
			// around.
			g_hud.showAction("move", 1);
		} else {
			g_hud.hideAction("move");
		}
	}
}

const MDL_STATE_IDLE = "Idling";
const MDL_STATE_STANDING = "Standing";
const MDL_STATE_LIFTOFF = "Liftoff";
const MDL_STATE_FLYING = "Flying";
const MDL_STATE_LANDING = "Landing";

let g_timerIdStanding = 0;
let g_timerIdLiftoff = 0;
let g_timerIdFlying = 0;



function initActionStates() {
	
	if ( g_actionStateMgr ) {
		// ActionStateManager already set up.
		return;
	}

	g_actionStateMgr = new ActionStateManager();


	// Idle
	g_actionStateMgr.addState(MDL_STATE_IDLE, () => {
		if ( !g_animMgr ) {
			//exit func
			return;
		}
		g_animMgr.queueAnimations([{
			"name": "idle",
			"loop": true
			
		}]);
	}, null);


	// Standing
	g_actionStateMgr.addState(MDL_STATE_STANDING, () => {
		if ( !g_animMgr ) {
			return;
		}
		g_animMgr.playAnimations([{
			"name": "standing",
			"clamp": false,
			"isMixin": false,
			"forcePlaythrough" : true,
			"callback": () => {
				g_timerIdStanding = window.setTimeout(() => {
					g_timerIdStanding = 4000;
					if ( g_btnSndsActive && g_audioMgr ) {
						g_audioMgr.playAudio("whinny", g_modelMesh, {"loop": false});
					}
				}, 35); //delay in ms
			}
		}, {
			// Switch back to idle.
			"name": "idle",
			"fadeTime": .15,
			"loop": true
			
		}]);


	}, () => {
		if ( g_animMgr ) {
			g_animMgr.playAnimations([{
				"name": "standing",
				"reverse": false
				// "forcePlaythrough": true
			}]);
		}
		if ( g_timerIdStanding ) {
			window.clearTimeout(g_timerIdStanding);
			g_timerIdStanding = 4000;
		} else if ( g_audioMgr ) {
			g_audioMgr.stopAudio("whinny", {"fadeOutTime": .250});
		}
	});


// Liftoff
g_actionStateMgr.addState(MDL_STATE_LIFTOFF, () => {
	if ( !g_animMgr ) {
		return;
	}
	g_animMgr.playAnimations([{
		"name": "liftoff",
		"isMixin": false,
		"callback": () => {
			g_timerIdLiftoff = window.setTimeout(() => {
				g_timerIdLiftoff = 2000;
				if ( g_btnSndsActive && g_audioMgr ) {
					g_audioMgr.playAudio("flapSound", g_modelMesh, {"loop": false});
				}
				}, 1600); //delay in ms
		}
		
	}, {
		"name": "flying",
			// Switch to Flying.
			"fadeTime": .15,
			"loop": true
		}]);
}, () => {
	if ( g_animMgr ) {
		g_animMgr.playAnimations([{
			"name": "liftoff",
			"isMixin": false
				// "forcePlaythrough": true
			}]);
	}
	if ( g_timerIdLiftoff ) {
		window.clearTimeout(g_timerIdLiftoff);
		g_timerIdLiftoff = 2000;
	} else if ( g_audioMgr ) {
			//g_audioMgr.stopAudio("whinny", {"fadeOutTime": .250});
		}

		
	});


// Landing (liftoff in reverse)
g_actionStateMgr.addState(MDL_STATE_LANDING, () => {
	if ( !g_animMgr ) {
		return;
	}
	g_animMgr.playAnimations([{
		"name": "liftoff",
		"isMixin": false,
		"loop": true,
		"reverse": true,
		"callback": () => {
			g_timerIdLiftoff = window.setTimeout(() => {
				g_timerIdLiftoff = 2000;
				if ( g_btnSndsActive && g_audioMgr ) {
					g_audioMgr.playAudio("flapSound", g_modelMesh, {"loop": false});
				}
				}, 620); //delay in ms
		}
		
	}, {
		"name": "idle",
			// Switch back to idle to Land.
			"fadeTime": .15,
			"loop": true
		}]);
}, () => {
	if ( g_animMgr ) {
		g_animMgr.playAnimations([{
			"name": "liftoff",
			"reverse": true,
			"isMixin": true,
			"reverse": true
				// "forcePlaythrough": true
			}]);
	}
	if ( g_timerIdLiftoff ) {
		window.clearTimeout(g_timerIdLiftoff);
		g_timerIdLiftoff = 2000;
	} else if ( g_audioMgr ) {
		
	}

	
});





	// Flying 2

	g_actionStateMgr.addState(MDL_STATE_FLYING, () => {
		if ( !g_animMgr ) {
			//exit func
			return;
		}
		g_animMgr.queueAnimations([{
			"name": "flying",
			"loop": true
			
		}]);
	}, null);
}



/**	Adds buttons to the HUD and sets up their action callbacks.
*/
function setupUIButtons() {
	if ( !g_hud ) {
		return;
	}

	// Calculate a button width (and height) based on pixel screen width,
	// but limit between 10% and 20%.
	// Note: Based on Galaxy S3's 768 CSS, and default 0.15 relative width.
	const btnW = Math.max(Math.min((0.15 * 768) / window.innerWidth, 0.2), 0.1);

	const logoW = Math.max(Math.min((0.15 * 768) / window.innerWidth, 0.2), 1.0);

	const btnH = btnW * g_camera.aspect;
	const spacing = 0.03;
	
	let isHidden = false;

	//Add Logo
	//g_hud.addUIElement(.34, spacing+btnH/2, "null", 0xFFFFFF, logoW * .6, btnH, "logo_image");

	//Add Overlay Slices
	g_hud.addUIElement(.5, .30, "top", 0xFFFFFF, .65, .035, "overlay-top");
	g_hud.overlayOnly("top");

	g_hud.setActionCallback("top", () => {
		if (!isHidden){
			hideWholeUI();
			isHidden = true;
		}else{
			showWholeUI();
			isHidden = false;
		}
	});

	g_hud.addUIElement(.7965, .5, "right", 0xFFFFFF, .06, .365, "overlay-right");
	g_hud.overlayOnly("right");

	g_hud.setActionCallback("right", () => {
		if (!isHidden){
			hideWholeUI();
			isHidden = true;
		}else{
			showWholeUI();
			isHidden = false;
		}
	});

	g_hud.addUIElement(.2035, .5, "left", 0xFFFFFF, .06, .365,"overlay-left");
	g_hud.overlayOnly("left");

	g_hud.setActionCallback("left", () => {
		if (!isHidden){
			hideWholeUI();
			isHidden = true;
		}else{
			showWholeUI();
			isHidden = false;
		}
	});

	g_hud.addUIElement(.5, .70, "bottom", 0xFFFFFF, .65, .035, "overlay-bottom");
	g_hud.overlayOnly("bottom");

	g_hud.setActionCallback("bottom", () => {
		if (!isHidden){
			hideWholeUI();
			isHidden = true;
		}else{
			showWholeUI();
			isHidden = false;
		}
	});


	// Add the UI buttons.
	g_hud.addUIElement(1-spacing-(btnW/2), 1-spacing-(btnH/2), "delete", 0xFFFFFF, btnW, btnH, "icon_remove");
	// The "delete" button should start out as disabled. It will be enabled
	// once the model has been placed.
	g_hud.disableAction("delete");
	
	g_hud.setActionCallback("delete", () => {
		if ( g_modelMesh && g_modelMesh.visible ) {
			g_modelMesh.visible = false;
			if ( g_btnSndsActive && g_audioMgr ) {
				g_audioMgr.playAudio("popSound", g_modelMesh);
			}
			// When the model is "delete"-ed, also reset its
			// angerData.
			_resetAngerData(g_modelMesh);
			// And stop any animation.
			stopModelAnimations();
			
			// Also stop playback of any audio. Except for any
			// button push sounds that are playing.
			
			// if ( g_audioMgr ) {
			// 	g_audioMgr.stopAll(["btn_pos", "btn_neg"]);
			// }

			// Re-enable the reticle when the model is "delete"-ed.
			// Note that the reticle probably won't be stable
			// right away after enabling it again.
			g_reticle.enable();

			// Disable the delete, scale, flying and standing
			// buttons after the model has been "deleted".
			disableWholeUI();
			// Reset the model's action state.
			g_actionStateMgr.reset();
			
			
		}
	});

	g_hud.addUIElement(1-spacing-(btnW/2), spacing+btnH/2, "exit", 0xFFFFFF, btnW, btnH, "icon_exit");
	
	g_hud.setActionCallback("exit", () => {
		// Exit the XR session.

		// pop up with short delay saying GOODBYE!
		g_xrSession.end();
	});

	g_hud.addUIElement(.5, .5, "move", 0xFFFFFF, btnW*(0.2/0.15), btnH*(0.2/0.15), "icon_move");
	// Hide the "move" element by default.
	g_hud.hideAction("move");


	g_hud.addUIElement(spacing+(btnW/2) + 0*(btnW+spacing), 1-spacing-btnH/2, "scale", 0xFFFFFF, btnW, btnH, "icon_scale");
	g_hud.disableAction("scale");
	g_hud.setActionCallback("scale", () => {
		// If the glTF model was loaded, toggle its scale between
		// tabletop and "real life" size.
		if ( g_btnSndsActive && g_audioMgr ) {
			g_audioMgr.playAudio("popSound", g_modelMesh);
		}
		if ( g_modelMesh && g_modelMesh.userData.orgHeight ) {
			let scaleFactor = (1 / g_modelMesh.userData.orgHeight);
			if ( g_modelMesh.userData.isDefaultSize ) {
				scaleFactor *= g_enlargedModelHeight;
			} else {
				scaleFactor *= g_defModelHeight;
			}
			g_modelMesh.scale.setScalar(scaleFactor);
			g_modelMesh.userData.isDefaultSize = !g_modelMesh.userData.isDefaultSize;
		}
	});

	g_hud.addUIElement(spacing+(btnW/2) + 1*(btnW+spacing), 1-spacing-btnH/2, "flying", 0xFFFFFF, btnW, btnH, "icon_flying");
	g_hud.disableAction("flying");
	g_hud.setActionCallback("flying", () => {

		if ( g_btnSndsActive && g_audioMgr ) {
			g_audioMgr.playAudio("popSound", g_modelMesh);
		}
		g_actionStateMgr.toggleState(MDL_STATE_LIFTOFF, MDL_STATE_LANDING);
		
	});

}

/**	Stops all animations of the glTF model.
*/
function stopModelAnimations() {
	if ( g_animMgr ) {
		g_animMgr.stopAll();
	}

	// Also make sure any of the action/animations state change related
	// timers no longer fire.
	if ( g_timerIdStanding ) {
		window.clearTimeout(g_timerIdStanding);
		g_timerIdStanding = 0;
	}

	if ( g_timerIdFlying ) {
		window.clearTimeout(g_timerIdFlying);
		g_timerIdFlying = 0;
	}
	
}


function _resetAngerData(model) {
	if ( model.userData.angerData && model.userData.angerData.coolOffId ) {
		window.clearTimeout(model.userData.angerData.coolOffId);
	}
	model.userData.angerData = {
		level: 0,
		cooldown: 0,
		coolOffId: null,
	};
}



function _coolOffFn(angerData) {

	if ( angerData.level > 0 ) {
		angerData.level -= 1;
		// Play a sigh sound, so the user knows something has happened.
		g_audioMgr.playAudio("sigh", g_modelMesh);
		// DEBUG ->
		console.debug(`Dropped anger level to ${angerData.level}`);
		// DEBUG <-
	}
	if ( angerData.level > 0 ) {
		// If the new anger level is still not the lowest level, then
		// launch a new cool-off timer to drop the anger level further.
		angerData.coolOffId = window.setTimeout(_coolOffFn, 500, angerData);
	} else {
		// If we cooled-off to level 0, then we should clear the
		// timeout id, since there is no more pending cool-off timeout.
		angerData.coolOffId = null;
	}
}



function handleModelHit(hit) {
	const curTime = performance.now(); //ms

	// Only consider the "angering" when we're in the idle state. Otherwise
	// just play the nopoke sound and return early.
	// We do this mainly to prevent the animations from mixing up. Which
	// wouldn't look correctly because for example the poke animation
	// isn't additive. Which in turn would result the flying or nut to
	// switch to a half-way position while the current and poke animation
	// would be playing.
	// NOTE --- If we would allow "angering" in other states then IDLE, we
	// should instead check here if the current state is the WAVE state.
	// And in that case we should still return early (as otherwise the
	// anger level could grow while we're still in the WAVE (a.k.a. anger)
	// state).
	if ( !g_actionStateMgr || g_actionStateMgr.getState() != MDL_STATE_IDLE ) {
		// Don't play the "nopoke" sound while we're still waving, i.e.
		// while the "niichan" sound is still playing.
		if ( g_actionStateMgr.getState() != MDL_STATE_STANDING ) {
			g_audioMgr.playAudio("nopoke", g_modelMesh);
		}
		return;
	}

	// On the first hit angerData won't be available yet, so initialize it.
	if ( !g_modelMesh.userData.angerData ) {
		_resetAngerData(g_modelMesh);
	}
	const angerData = g_modelMesh.userData.angerData;

	// Each time the model is hit, start (or reset) the cool-off timeout.
	// If the model isn't hit before the timeout expires in 5s, then the
	// timeout function will drop the anger level by one (and start a new
	// cool-off timer to drop the level further, until reaching level 0).
	if ( angerData.coolOffId ) {
		window.clearTimeout(angerData.coolOffId);
	}
	angerData.coolOffId = window.setTimeout(_coolOffFn, 10, angerData);

	// Require a cooldown of 2.5s before allowing a new hit to increase
	// the anger level. If the user clicked the model before this cooldown
	// period has expired, we'll reset the cooldown period. I.e. the user
	// will have to wait another cooldown period before the anger level can
	// be increased.
	const cooldownExpireTime = angerData.cooldown;
	angerData.cooldown = curTime + 500;
	if ( curTime <= cooldownExpireTime ) {
		// DEBUG ->
		console.log("Too eager! Resetting cooldown.");
		// DEBUG <-
		// Play a default light grunt sound, but don't increase
		// the anger level.
		g_audioMgr.playAudio("nopoke", g_modelMesh);

		// Don't do anything else when the user clicked the model too
		// fast.
		return;
	}

	// If the hit happend after the cooldown period and before the cool-off
	// timer timed out, then increase the anger level.
	angerData.level += 1;
	// DEBUG ->
	console.log(`Anger level increased to: ${angerData.level}`);
	// DEBUG <-

	let soundToPlay = null;
	let animsToPlay = [{
		"name": "Poked",
		"fadeTime": 0.1,
		"isMixin": true
	}];
	switch ( angerData.level ) {
		case 3:
			// We'll switch to the WAVE state in this case, which
			// will trigger the wave animation and the accompanying
			// "niichan" sound for us.
			animsToPlay = null;
			break;
			case 2:
			soundToPlay = "poke2";
			break;
			case 1:
			default:
			soundToPlay = "poke1";
		}

		if ( animsToPlay ) {
			g_animMgr.playAnimations(animsToPlay);
		}
		if ( soundToPlay ) {
			g_audioMgr.playAudio(soundToPlay, g_modelMesh);
		}

	// Maximum anger level reached.
	if ( angerData.level >= 1 ) {
		// Reset the anger data when switching to the WAVE state. Note
		// that since we currently only allow the anger level to
		// increase while in the IDLE state, any further angering is
		// disabled until we switch back to the IDLE state (which the
		// WAVE state will do automatically).
		_resetAngerData(g_modelMesh);
		g_actionStateMgr.switchState(MDL_STATE_STANDING);

		// Trigger the "roar event".
		//triggerRoarEffect();
	}
}




if ( document.readyState === "loading" ) {
	document.addEventListener("DOMContentLoaded", init);
} else {
	init();
}

