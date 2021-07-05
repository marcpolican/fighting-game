import { Room, Client } from "colyseus";

import { StateHandler } from "./StateHandler";
import * as PLAYER from "../entities/Player";

export class GameRoom extends Room<StateHandler> {
    maxClients = 8;

    onCreate (options) {
        this.setSimulationInterval(() => this.onUpdate());
        this.setState(new StateHandler());

        this.onMessage("key", (client, message) => {
            this.state.players.get(client.sessionId).pressedKeys = message;
        });
    }

    onJoin (client) {
        const player = new PLAYER.Player();
        player.name = `Player ${ this.clients.length }`;
        player.id = this.clients.length;
        player.position.x = player.id == 1 ? -1 : 1;
        player.position.y = 0;
        player.position.z = 0;

        this.state.players.set(client.sessionId, player);
    }

    onUpdate () {
		//this.state.tick++;
        this.state.players.forEach((player, sessionId) => {
            player.position.x += player.pressedKeys.x * 0.1;

			if (player.pressedKeys.a == 1) {
				player.state = PLAYER.CharState.LowAttack;
			} else if (player.pressedKeys.b == 1) {
				player.state = PLAYER.CharState.HighAttack;
			//} else if (player.pressedKeys.y > 0) {
			//	player.state = PLAYER.CharState.Crouch;
			} else if (player.pressedKeys.y < 0) {
				player.state = PLAYER.CharState.JumpUp;
			} else {
				player.state = PLAYER.CharState.Idle;
			}
        });
    }

    onLeave (client: Client) {
        this.state.players.delete(client.sessionId);
    }

    onDispose () {
    }

}
