import "./index.css";

import * as BABYLON from "babylonjs";
import * as GUI from "babylonjs-gui";
import 'babylonjs-loaders';
import * as MATERIALS from 'babylonjs-materials';
import Keycode from "keycode.js";

import { client } from "./game/network";

// Re-using server-side types for networking
// This is optional, but highly recommended
import { StateHandler } from "../../server/src/rooms/StateHandler";
import * as PLAYER from "../../server/src/entities/Player";

export class CharacterData {
    mesh: BABYLON.Mesh = null;;
    animGroups: BABYLON.AnimationGroup[] = [];
}

var canvas;
var engine;
var scene;
var camera;
var ground;
var shadowGenerator;
var authPos = {};

const playerViews: {[id: string]: BABYLON.Mesh} = {};
const playerAnims: {[id: string]: BABYLON.AnimationGroup[]} = {};

function main() {
	initEngine();
	initCamera();
	initLights();
	initGround();
	initUI();
	initColyseus();
}

function initEngine() {
	canvas = document.getElementById('game') as HTMLCanvasElement;
	engine = new BABYLON.Engine(canvas, true);
	scene = new BABYLON.Scene(engine);
	//scene.debugLayer.show();

	engine.runRenderLoop(update);
}

function initCamera() {
	// This creates and positions a free camera (non-mesh)
	camera = new BABYLON.FollowCamera("camera1", new BABYLON.Vector3(0, 1.5, -10), scene);
	camera.fov = 0.4;
	camera.setTarget(new BABYLON.Vector3(0,1,0));

	// This attaches the camera to the canvas
	//camera.attachControl(canvas, true);
}

function initLights() {
	var light = new BABYLON.HemisphericLight("light1Hemi", new BABYLON.Vector3(0, 1, 0), scene);
	light.intensity = 0.7;

	// 2nd light for shadows
	var light2 = new BABYLON.DirectionalLight("light2Dir", new BABYLON.Vector3(0, -1, 0.5), scene);
	light2.position = new BABYLON.Vector3(0,20,0);
	light2.intensity = 0.5;

	shadowGenerator = new BABYLON.ShadowGenerator(1024, light2);
}

function initGround() {
	var mat = new BABYLON.StandardMaterial("matGround", scene);
	mat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);

	// Our built-in 'ground' shape. Params: name, width, depth, subdivs, scene
	var ground = BABYLON.Mesh.CreateGround("ground1", 10, 10, 4, scene);
	ground.receiveShadows = true;
	ground.material = mat;
}

function initUI() {
	var advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI( "myUI");

	var rect = new GUI.Rectangle();
	advancedTexture.addControl(rect);

	rect.height = "40px";
	rect.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

	var text1 = new GUI.TextBlock();
    rect.addControl(text1);

    text1.text = "[Controls]  Move: W, S, A, D    Low punch: >    High punch: ? "
    text1.color = "white";
    text1.fontSize = 24;
}

function initColyseus() {
// Colyseus / Join Room
client.joinOrCreate<StateHandler>("game").then(room => {

    room.state.players.onAdd = async function(player, key) {

		const scaleFaceLeft = new BABYLON.Vector3(-1, 1, -1);
		const scaleFaceRight = new BABYLON.Vector3(1, 1, -1);

		console.log("added player", player, key);

		authPos[key] = new BABYLON.Vector3();

        // Our built-in 'sphere' shape. Params: name, subdivs, size, scene
        //playerViews[key] = BABYLON.Mesh.CreateSphere("sphere1", 16, 2, scene);
		var characterData = await loadCharacter(key);
		playerViews[key] = characterData.mesh;
		playerAnims[key] = characterData.animGroups;

		authPos[key].set(player.position.x, player.position.y, player.position.z);
        playerViews[key].rotate(new BABYLON.Vector3(0,1,0), Math.PI);

		console.log(playerViews[key].scaling);

		if (player.id == 2)
			playerViews[key].scaling = scaleFaceLeft;

        playerViews[key].position.set(player.position.x, player.position.y, player.position.z);

        // Update player position based on changes from the server.
        player.position.onChange = () => {
			authPos[key].set(player.position.x, player.position.y, player.position.z);

			if (playerViews[key].position.x > player.position.x)
				playerViews[key].scaling = scaleFaceLeft;
			else if (playerViews[key].position.x < player.position.x)
				playerViews[key].scaling = scaleFaceRight;
        };

		player.onChange = (changes) => {

			//console.log("player.onChange", changes);
			if (changes[0].field == "state" && player.state != 0) {

				var state = player.state;

				for (var s of PLAYER.Char01States) {
					if (state == s.state) {
						var anim = playerAnims[key].find(a => a.name == s.anim);
						if (anim != null) {
							anim.play();
						} else {
							console.warn("Cannot find anim", s.anim);
						}
					}
				}
			}
		};
    };

    room.state.players.onRemove = function(player, key) {
        scene.removeMesh(playerViews[key]);
        delete playerViews[key];
    };

    room.onStateChange((state) => { });

    // Keyboard listeners
    const keyboard: PLAYER.PressedKeys = { x: 0, y: 0, a: 0, b: 0 };
    window.addEventListener("keydown", function(e) {
        if (e.which === Keycode.A) {
            keyboard.x = -1;
        } else if (e.which === Keycode.D) {
            keyboard.x = 1;
        } else if (e.which === Keycode.W) {
            keyboard.y = -1;
        } else if (e.which === Keycode.S) {
            keyboard.y = 1;
        } else if (e.which === Keycode.PERIOD) {
            keyboard.a = 1;
        } else if (e.which === Keycode.FORWARDSLASH) {
            keyboard.b = 1;
        }
        room.send('key', keyboard);
    });

    window.addEventListener("keyup", function(e) {
        if (e.which === Keycode.A) {
            keyboard.x = 0;
        } else if (e.which === Keycode.D) {
            keyboard.x = 0;
        } else if (e.which === Keycode.W) {
            keyboard.y = 0;
        } else if (e.which === Keycode.S) {
            keyboard.y = 0;
        } else if (e.which === Keycode.PERIOD) {
            keyboard.a = 0;
        } else if (e.which === Keycode.FORWARDSLASH) {
            keyboard.b = 0;
        }
        room.send('key', keyboard);
    });

    // Resize the engine on window resize
    window.addEventListener('resize', function() {
        engine.resize();
    });
});
}

function update() {
	// interpolate
	for (let k in playerViews) {
		let curr = playerViews[k].position;
		let target = authPos[k];

		playerViews[k].position = BABYLON.Vector3.Lerp(curr, target, 0.05);
	}
    scene.render();
}

async function loadCharacter(key) : Promise<CharacterData> {

	var result = await BABYLON.SceneLoader.ImportMeshAsync("", "", "fighting-char-stick.glb", scene);

	var s = result.skeletons[0];
	var ag = result.animationGroups;
	ag[0].stop();

	var animIdle = ag.find(anim => anim.name == "Idle");
	if (animIdle != null)
		animIdle.play(true);

	var data = new CharacterData();
	data.mesh = result.meshes[0] as BABYLON.Mesh;
	data.mesh.material = material;
	data.animGroups = ag;

	// assign random color to mesh
	var material = new BABYLON.StandardMaterial("mat" + key, scene);
	material.diffuseColor = BABYLON.Color3.Random();

	var meshes = data.mesh.getChildMeshes(false, (node) => { return (node.name == "Mesh") } );
	if (meshes.length > 0) {
		meshes[0].material = material;
	}

	shadowGenerator.addShadowCaster(data.mesh);
	return data;
}

//------------------------------------------------------------------------------
main();
