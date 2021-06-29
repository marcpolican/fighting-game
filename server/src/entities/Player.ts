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
