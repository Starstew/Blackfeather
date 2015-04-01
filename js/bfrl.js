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
        fovBase: 8
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

    // vars
    game: null, // "Game" currently in progress
    npcManifest: {}, // JSON of monsters/npc definitions
    weaponManifest: {}, // JSON of all p(laceable)objs definitions
    npcTypes: [], // list of all npc object constructors (built from defs)
    weaponTypes: [], // list of all weapon constructors (built from defs)
    display: {}, // ROT.Display for game
    worldPobjs: {}, // various pobj types in the world

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
        },
        window.showSubscribers = function() {
            console.log(_subscribers);
        }
})();
