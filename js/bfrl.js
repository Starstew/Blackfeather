/* Blackfeather, a roguelike created initially for the 7DRL 2015
	Originally created by Ed Stastny (github.com/starstew)
	Requires: rot.js, jquery
*/
var BFRL = BFRL || {
    settings: {
        mapElement: "#map_display",
        mapFloorColor: "#aa7",
        mapFloorColors: ["#aa7", "#a1a171", "#999969"],
        mapWallColor: "#553",
        mapFloorColorHidden: "#222",
        mapWallColorHidden: "#111",
        fovBase: 5
    },

    //constants
    DISP_NEUTRAL: 0,
    DISP_FRIENDLY: 1,
    DISP_AGGRESSIVE: 2,

    DMGTYPE_SLASH: 0,
    DMGTYPE_BLUNT: 1,
    DMGTYPE_PIERCE: 2,
    DMGTYPE_HEAT: 3,
    DMGTYPE_PSIONIC: 4,
    DMGTYPE_COLD: 5,
    DMGTYPE_POISON: 6,

    EGRESS_ENTRANCE: 0,
    EGRESS_EXIT: 1,

    UIMODE_PLAYER_ACT: 0,
    UIMODE_INVENTORY: 1,
    UIMODE_GAMEOVER: 2,
    UIMODE_TARGETING: 3,

    KEY_SHOOT: 83, // 's'
    KEY_WAIT: 32, // space
    KEY_CYCLE_NEXT: 68, // 'd'
    KEY_CYCLE_PREV: 65, // 'a'
    KEY_NOOP: 999,

    // keymap
    keyMap: {
        '38': 0,
        '33': 1,
        '39': 2,
        '34': 3,
        '40': 4,
        '35': 5,
        '37': 6,
        '36': 7
     },

    // vars
    game: null, // "Game" currently in progress
    npcManifest: {}, // JSON of monsters/npc definitions
    weaponManifest: {}, // JSON of all p(laceable)objs definitions
    npcTypes: [], // list of all npc object constructors (built from defs)
    weaponTypes: [], // list of all weapon constructors (built from defs)
    display: {}, // ROT.Display for game
    worldPobjs: {}, // various pobj types in the world
    uiMode: 0,

    // functions
    init: function() {
        // set up the display
        this.display = new ROT.Display();
        this.display.setOptions({
            fontSize: 16,
            forceSquareRatio: true
        });
        $(this.settings.mapElement).empty();
        $(this.settings.mapElement).append(this.display.getContainer());
        this.parseMonsterManual();
        this.parseArmory();
        this.startNewGame();
    },

    handleMessage: function(message, publisher, data) {
        switch (message) {
            case "log_message":
                this.curGame.addLogMessage(data);
                break;
            default:
                break;
        }
    },

    startNewGame: function() {
        this.curGame = new BFRL.game;
        this.curGame.start();
        BFRL.gui.showAlert("So begins your quest for the Black Feather...");
    },

    parseMonsterManual: function() {
        if (!MonsterManual) {
            return;
        }
        this.npcManifest = {};

        for (var i in MonsterManual) {
            var is_valid = false;

            var mon = MonsterManual[i];

            this.npcManifest[i] = new Function('x', 'y', 'BFRL.Being.call(this,x,y);');
            this.npcManifest[i].extend(BFRL.Being);
            this.npcManifest[i].prototype['definition'] = MonsterManual[i];
            this.npcTypes.push(this.npcManifest[i]);
        }
    },

    parseArmory: function() {
        if (!Armory) {
            return;
        }
        this.weaponManifest = {};

        for (var i in Armory) {
            var is_valid = false;

            var wep = Armory[i];

            this.weaponManifest[i] = new Function('x', 'y', 'notObj', 'BFRL.Weapon.call(this,x,y,notObj);');
            this.weaponManifest[i].extend(BFRL.Weapon);
            this.weaponManifest[i].prototype['definition'] = Armory[i];
            this.weaponTypes.push(this.weaponManifest[i]);
        }
    },

    setUiMode: function(m) {
        this.uiMode = m;
    },

    handleEvent: function(e) {
        var code = e.keyCode;
        var plyr = this.curGame.player;
        switch (this.uiMode) {
            /** Main mode of movement/acting **/
            case BFRL.UIMODE_PLAYER_ACT:
                switch(code) {
                    case BFRL.KEY_WAIT:
                        plyr.doRest();
                        break;
                    case BFRL.KEY_SHOOT:
                        plyr.showLosToNextTarget();
                        this.setUiMode(BFRL.UIMODE_TARGETING);
                        return;
                    case BFRL.KEY_NOOP:
                        break;
                    default:
                        // interpret as a move
                        if (!(code in BFRL.keyMap)) { return; }
                        plyr.tryMoveInDirection(BFRL.keyMap[code]);
                        break;
                }
                window.removeEventListener("keydown", this);
                this.curGame.engine.unlock();
                break;

            /** Targeting a shot/spell/throw **/
            case BFRL.UIMODE_TARGETING:
                switch(code) {
                    case BFRL.KEY_SHOOT:
                        // TODO: shoot readied projectile from player to target!
                        plyr.doShot();
                        this.setUiMode(BFRL.UIMODE_PLAYER_ACT); // switch back to regular action input
                        this.handleEvent({keyCode:BFRL.KEY_NOOP}); // tick time with a fake event
                        break;
                    case BFRL.KEY_CYCLE_NEXT:
                        plyr.showLosToNextTarget(1);
                        break;
                    case BFRL.KEY_CYCLE_PREV:
                        plyr.showLosToNextTarget(-1);
                        break;
                    default: // anything else passes through to act, cancels aiming
                        this.setUiMode(BFRL.UIMODE_PLAYER_ACT);
                        this.handleEvent(e); // pass it through
                        break;
                }
                break;
            default:
                break;
        }
    },

    waitForNextPlayerInput: function() {
        // stop the engine and wait for next input
        this.curGame.engine.lock();
        window.addEventListener("keydown",this);
    },

    doGameOver: function(msg) {
        this.curGame.engine.lock();
        this.display.clear();
        this.gui.showAlert(msg, 5, 5, 50, 3000);
        this.gui.isWaitingToRestart = true;
        return;
    }
};

/***
 * Add ons
 */

// pub-sub
;
(function() {
    var _subscribers = {};

    window.publish = function(message, publisher, data) {
            var subscribers = _subscribers[message] || [];
            subscribers.forEach(function(subscriber) {
                subscriber.handleMessage(message, publisher, data);
            });
        },

        window.subscribe = function(message, subscriber) {
            if (!(message in _subscribers)) {
                _subscribers[message] = [];
            }
            _subscribers[message].push(subscriber);
        },

        window.unsubscribe = function(message, subscriber) {
            var index = _subscribers[message].indexOf(subscriber);
            _subscribers[message].splice(index, 1);
        },

        window.removeSubscriber = function(subscriber) {
            var tempsubs = jQuery.extend(true, {}, _subscribers);
            for (var msg in tempsubs) {
                var len = tempsubs[msg].length;
                for (var s = 0; s < len; s++) {
                    var sub = tempsubs[msg][s];
                    if (sub == subscriber) {
                        window.unsubscribe(msg, sub);
                    }
                }
            }
        },
        window.clearSubscribers = function() {
            _subscribers = {};
        }
})();
