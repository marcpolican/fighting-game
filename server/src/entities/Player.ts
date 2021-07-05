import { Schema, type } from "@colyseus/schema";

export interface PressedKeys {
    x: number;
    y: number;
	a: number;
	b: number;
}

export class Position extends Schema {
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") z: number = 0;
}

export class Player extends Schema {
    @type("string") name: string;
    @type("number") id: number = 0;
    @type("number") state: number = 0;
    @type(Position) position = new Position();

	pressedKeys: PressedKeys = { x: 0, y: 0, a:0, b:0 };
}

export enum CharState {
	Idle,
	Crouch,
	CrouchLoop,
	JumpUp,
	JumpLoop,
	JumpFall,
	LowAttack,
	HighAttack,
}

export class StateAnim {
	state: CharState;
	anim: string;

	constructor(s: CharState, a: string) {
		this.state = s;
		this.anim = a;
	}
}

export var Char01States: StateAnim[] = [
	new StateAnim(CharState.Idle,       "Idle"),
	new StateAnim(CharState.Crouch,     "Crouch"),
	new StateAnim(CharState.CrouchLoop, "CrouchLoop"),
	new StateAnim(CharState.JumpUp,     "Jump"),
	new StateAnim(CharState.LowAttack,  "LowAttack"),
	new StateAnim(CharState.HighAttack, "HighAttack"),
];
