import "./index.css";

import * as BABYLON from "babylonjs";
import 'babylonjs-loaders';
import * as MATERIALS from 'babylonjs-materials';
import Keycode from "keycode.js";

import { client } from "./game/network";

// Re-using server-side types for networking
// This is optional, but highly recommended
import { StateHandler } from "../../server/src/rooms/StateHandler";
import { PressedKeys } from "../../server/src/entities/Player";

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
	initColyseus();
}

function initEngine() {
	canvas = document.getElementById('game') as HTMLCanvasElement;
	engine = new BABYLON.Engine(canvas, true);
	scene = new BABYLON.Scene(engine);
	scene.debugLayer.show();

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
	//var mat = new MATERIALS.GridMaterial("matGround", scene);
	//mat.mainColor = new BABYLON.Color3(0.7, 0.7, 0.7);
	//mat.lineColor = new BABYLON.Color3(0,0,0);

	var mat = new BABYLON.StandardMaterial("matGround", scene);
	mat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);

	// Our built-in 'ground' shape. Params: name, width, depth, subdivs, scene
	var ground = BABYLON.Mesh.CreateGround("ground1", 10, 10, 4, scene);
	ground.receiveShadows = true;
	ground.material = mat;
}

function initColyseus() {
// Colyseus / Join Room
client.joinOrCreate<StateHandler>("game").then(room => {

    room.state.players.onAdd = async function(player, key) {

		console.log("added player", player, key);

		authPos[key] = new BABYLON.Vector3();

        // Our built-in 'sphere' shape. Params: name, subdivs, size, scene
        //playerViews[key] = BABYLON.Mesh.CreateSphere("sphere1", 16, 2, scene);
		var characterData = await loadCharacter();
		playerViews[key] = characterData.mesh;
		playerAnims[key] = characterData.animGroups;

		authPos[key].set(player.position.x, player.position.y, player.position.z);
        playerViews[key].rotate(new BABYLON.Vector3(0,1,0), Math.PI);

		console.log(playerViews[key].scaling);

		if (player.id == 2)
			playerViews[key].scaling.set(-1,1,-1);

        playerViews[key].position.set(player.position.x, player.position.y, player.position.z);


        // Update player position based on changes from the server.
        player.position.onChange = () => {
			authPos[key].set(player.position.x, player.position.y, player.position.z);

        };

		player.onChange = (changes) => {
			console.log("player.onChange", changes);
			if (player.state == 1) {
				playerAnims[key][3].play();
				//console.log("PUNCH");
			}
		};
    };

    room.state.players.onRemove = function(player, key) {
        scene.removeMesh(playerViews[key]);
        delete playerViews[key];
    };

    room.onStateChange((state) => {
    });

    // Keyboard listeners
    const keyboard: PressedKeys = { x: 0, y: 0, a: 0, b: 0 };
    window.addEventListener("keydown", function(e) {
        if (e.which === Keycode.LEFT) {
            keyboard.x = -1;
        } else if (e.which === Keycode.RIGHT) {
            keyboard.x = 1;
        } else if (e.which === Keycode.UP) {
            keyboard.y = -1;
        } else if (e.which === Keycode.DOWN) {
            keyboard.y = 1;
        } else if (e.which === Keycode.SPACE) {
            keyboard.a = 1;
        }
        room.send('key', keyboard);
    });

    window.addEventListener("keyup", function(e) {
        if (e.which === Keycode.LEFT) {
            keyboard.x = 0;
        } else if (e.which === Keycode.RIGHT) {
            keyboard.x = 0;
        } else if (e.which === Keycode.UP) {
            keyboard.y = 0;
        } else if (e.which === Keycode.DOWN) {
            keyboard.y = 0;
        } else if (e.which === Keycode.SPACE) {
            keyboard.a = 0;
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

async function loadCharacter() : Promise<CharacterData> {
	var result = await BABYLON.SceneLoader.ImportMeshAsync("", "", "fighting-char-stick.glb", scene);

	console.log(result);
	var s = result.skeletons[0];
	var ag = result.animationGroups;
	ag[2].play(true);
	//ag[0].stop();

	var data = new CharacterData();
	data.mesh = result.meshes[0] as BABYLON.Mesh;
	data.animGroups = ag;

	shadowGenerator.addShadowCaster(data.mesh);
	return data;
}

//------------------------------------------------------------------------------
main();
