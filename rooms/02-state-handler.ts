import { Room, EntityMap, Client, nosync } from "colyseus";
import { listenerCount } from "cluster";


export class State {
    players: EntityMap<Player> = {};
    phase: EntityMap<number> = {id: 1};
    placedBallColors = [];
    guessedBallColors = [];
    guesserWon: boolean = null;
    
    @nosync
    something = "This attribute won't be sent to the client-side";

    getOtherPlayer(id: string) {
        if (Object.keys(this.players).length === 2) {
            return this.players[Object.keys(this.players).filter(k => k !== id)[0]]
        }
    }

    createPlayer (id: string) {
        this.players[ id ] = new Player();
        if (Object.keys(this.players).length === 2) {
            this.players[ id ].role = 2;
        }
    }

    removePlayer (id: string) {
        delete this.players[ id ];
    }

    updatePlayer (id: string, update: any) {
        if (update.takePlayer) {
            this.players[ id ].taken = true;
            console.log("takePlayer triggered:", this.players[ id ])
        } else if (update.placed) {
            if (this.players[ id ].role === 1 && this.phase.id === 1) {
                this.players[ id ].placedBallColors.push(update.placed);
                this.placedBallColors.push(update.placed);
            }
            
        } else if (update.guessed) {
            if (this.players[ id ].role === 2 && this.phase.id === 2) {
                this.players[ id ].guessedBallColors.push(update.guessed);
                this.guessedBallColors.push(update.guessed);
            }
        
        } else if (update.donePlacing) {
            this.phase.id = 2;
            for (let key in this.players) {
                this.players[key].winner = null;
            }

        } else if (update.doneGuessing) {
            this.phase.id = 1;
            
            this.guesserWon = this.guessedBallColors === this.placedBallColors;

            for (let key in this.players) {
                this.players[key].role = this.players[key].role === 2 ? 1 : 2;
                this.players[key].placedBallColors = [];
                this.players[key].guessedBallColors = [];
            }

        } else if (update.popPlaced) {
            if (this.players[ id ].role === 1 && this.phase.id === 1) {
                this.players[ id ].placedBallColors.pop();
                this.placedBallColors.pop();
            }
            console.log(this.placedBallColors);
        
        } else if (update.popGuessed) {
            if (this.players[ id ].role === 2 && this.phase.id === 2) {
                this.players[ id ].guessedBallColors.pop();
                this.guessedBallColors.pop();
            }
            console.log(this.guessedBallColors);
        
        }
    }
}

export class Player {
    placedBallColors = [];
    guessedBallColors = [];
    taken: boolean = false;
    role: number = 1;
    winner: boolean = null;
}

export class StateHandlerRoom extends Room<State> {
    maxClients = 2;
    onInit (options) {
        console.log("StateHandlerRoom created!", options);
        this.setState(new State());
        console.log(this.state);
    }

    onJoin (client) {
        this.state.createPlayer(client.sessionId);
    }

    onLeave (client) {
        this.state.removePlayer(client.sessionId);
    }

    onMessage (client, data) {
        console.log("StateHandlerRoom received message from", client.sessionId, ":", data);
        this.state.updatePlayer(client.sessionId, data);
    }

    onDispose () {
        console.log("Dispose StateHandlerRoom");
    }

}