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
        fovBase: 6
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
    currentGame: null, // "Game" currently in progress
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
        document.querySelector(this.settings.mapElement)
            .innerHTML = "";
        document.querySelector(this.settings.mapElement)
            .appendChild(this.display.getContainer());
        this.parseMonsterManual();
        this.parseArmory();
        this.startNewGame();
    },

    handleMessage: function(message, publisher, data) {
        switch (message) {
            case "log_message":
                this.currentGame.addLogMessage(data);
                break;
            default:
                break;
        }
    },

    startNewGame: function() {
        this.currentGame = new this.game();
        this.currentGame.start();
        BFRL.Gui.showAlert("So begins your quest for the Black Feather...");
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

    game: function() {
        // blank all state vars
        window.clearSubscribers();
        this.fovMapCells = [];
        this.seenMapCells = [];
        this._log = [];
        this.map = {};
        this.engine = null;
        this.player = null;
        this._scheduler = null;
        this._statusMsg = '';

        this.clearLogDisplay();
    }
};

BFRL.game.prototype = {
    start: function() {
        this._scheduler = new ROT.Scheduler.Speed();

        // go to first map
        this.depth = 0;
        this.delveDeeper();

        this.engine = new ROT.Engine(this._scheduler);
        this.engine.start();
    },


    _generateMap: function() {
        this.map = new BFRL.Map();
        this.map._addEntranceAndExit();
    },

    delveDeeper: function() {
        window.clearSubscribers();
        if (this.engine) {
            this.engine.lock();
        }

        this._scheduler.clear();
        this.seenMapCells = [];
        this.fovMapCells = [];

        // increment depth
        this.depth += 1;

        // create new map
        this._generateMap();

        // place player
        if (!this.player) {
            this.player = this.spawnAndPlaceBeing(BFRL.Player, this.map.freeCells);
        } else {
            this.player.subscribeToMessages();
            var index = Math.floor(ROT.RNG.getUniform() * this.map.freeCells.length);
            var key = this.map.freeCells.splice(index, 1)[0];
            var parts = key.split(",");
            var x = parseInt(parts[0]);
            var y = parseInt(parts[1]);
            this.player.relocate(x, y);
            this.player.addToPobjList();
        }
        var relo = [parseInt(this.map.entrance._x), parseInt(this.map.entrance._y)];
        this.player.relocate(relo[0], relo[1]);
        this._scheduler.add(this.player, true);

        // populate with items
        // TODO

        // populate with npcs
        this.populateMonsters((this.depth * 8) + 20);

        // attach subscribers
        window.subscribe('log_message', BFRL);

        // start it back up
        if (this.engine) {
            this.engine.start();
        }
    },

    populateMonsters: function(difficulty_quota) {
        var maxTries = 1000;
        var halfquota = Math.floor(difficulty_quota * 0.5);
        // keep adding monsters until quota is exceeded (or we reach 1000 tries)
        var diffcount = 0;
        for (var i = 0; i < maxTries; i++) {
            var mt = BFRL.npcTypes.random();
            var remaining = difficulty_quota - diffcount;
            var mt_diff = mt.prototype.definition.difficulty;
            if (mt_diff > (remaining * 1.5) || mt.prototype.definition.difficulty > halfquota) {
                continue;
            }
            var mon = this.spawnAndPlaceBeing(mt, this.map.freeCells);
            this._scheduler.add(mon, true);
            diffcount += mon._difficulty;
            if (diffcount >= difficulty_quota) {
                break;
            }
        }
    },

    drawVisibleMap: function() {
        BFRL.display.clear();
        for (var key in this.seenMapCells) {
            var parts = key.split(",");
            var x = parseInt(parts[0]);
            var y = parseInt(parts[1]);
            var fgcolor = "#fff";
            var bgcolor = (this.seenMapCells[key] == '' ? BFRL.settings.mapWallColorHidden : BFRL.settings.mapFloorColorHidden);
            BFRL.display.draw(x, y, this.seenMapCells[key], fgcolor, bgcolor);
        }
        for (var key in this.fovMapCells) {
            var parts = key.split(",");
            var x = parseInt(parts[0]);
            var y = parseInt(parts[1]);
            var fgcolor = "#fff";
            var bgcolor = (this.fovMapCells[key] == '' ? BFRL.settings.mapWallColor : BFRL.settings.mapFloorColors.random());
            BFRL.display.draw(x, y, this.fovMapCells[key], fgcolor, bgcolor);

            // pobj on it?
            if (this.map.pobjCells[key]) {
                var pobj = this.map.pobjCells[key][0]; // draw the first one on the list
                pobj._draw();
            }
        }
    },

    spawnAndPlaceBeing: function(what, freeCells) {
        var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
        var key = freeCells.splice(index, 1)[0];
        var parts = key.split(",");
        var x = parseInt(parts[0]);
        var y = parseInt(parts[1]);
        return new what(x, y);
    },

    /* remove object from map, scheduler, and pubsub */
    removePobj: function(pobj) {
        if (!pobj) {
            return;
        }

        // remove from scheduling
        if (this._scheduler) {
            this._scheduler.remove(pobj);
        }

        // filter from list of objects
        for (var i in this.map.pobjList) {
            if (this.map.pobjList[i] == pobj) {
                this.map.pobjList.splice(i, 1);
                break;
            }
        }

        // update the map
        this.map.updateObjectMap();
    },

    /* Get what would be the result of a move of 'pobj' into coordinate 'x,y'
		Returns object that has property 'isOpen' (Boolean) and an optional 'bumpedEntity' */
    getMoveResult: function(pobj, x, y) {
        var newKey = x + "," + y;
        var e_array = this.map.pobjCells[newKey];
        var ae = undefined;
        if (e_array && e_array.length > 0) {
            var len = e_array.length;
            for (var i = len - 1; i >= 0; i--) { // go in reverse to get "top" entity
                if (e_array[i].isPassable == false) {
                    ae = e_array[i];
                    break;
                }
            }
        }

        if (ae) {
            return ({
                isOpen: false,
                bumpedEntity: ae
            });
        }

        if (!(newKey in this.map.cells)) {
            return ({
                isOpen: false,
                bumpedEntity: null
            });
        }; // can't move to that coord

        return ({
            isOpen: true
        });
    },

    addLogMessage: function(msg) {
        if (this._statusMsg.length > 0) {
            this._statusMsg += "; ";
        }
        this._statusMsg += msg;
    },

    clearLogDisplay: function() {
        document.getElementById('msg_display')
            .innerHTML = "";
    },

    refreshLogDisplay: function() {
        if (!this._statusMsg.length > 0) {
            return;
        }
        this._log.push(this._statusMsg);
        this._statusMsg = '';

        var log_excerpt = "";
        var dlog = this._log.slice(-5);
        var len = Math.min(dlog.length, 5);
        dlog.reverse();
        for (var i = 0; i < len; i++) {
            if (i == 0) {
                log_excerpt += "<b>" + dlog[i] + "</b><br>";
            } else {
                log_excerpt += dlog[i] + "<br>";
            }
        }
        document.getElementById('msg_display')
            .innerHTML = log_excerpt;
    },

    refreshUi: function() {
        this.refreshStatusDisplay();
        this.refreshFovDisplay();
        this.refreshLogDisplay();
    },

    refreshStatusDisplay: function() {
        var newhtml = "<span class='player_name'>" + this.player._name +
            " <div class='levelxp'><div class='leveltext'>Lvl. " + this.player._xpLevel + "</div><div class='xpbar'></div></div></span>";
        newhtml += "<span class='hitpoints'>[" + this.player._hitpoints + "/" + this.player._hitpointsMax + "]</span>";
        newhtml += "<span class='weapon'>Wielding: " + this.player.weapon._name + "</span>";
        newhtml += "<span class='gold'>" + this.player._gold + "GP</span>";
        newhtml += "<span class='depth'>Depth: " + this.depth + "</span>";
        document.querySelector('#status_display')
            .innerHTML = newhtml;

        //update xpbar
        $('.levelxp .xpbar')
            .css('width', this.player._nextLevelProgress + "%");
    },

    refreshFovDisplay: function() {
        $('#fov_display')
            .empty();
        var len = this.player.fovPobjs.length;
        var displayed = 0;
        for (var i = 0; i < len; i++) {
            var po = this.player.fovPobjs[i];
            if (po instanceof BFRL.Being == false) {
                continue;
            } // skip non-Beings for this UI
            var po_html = $("<div class='fov_item'><span>" + po._glyph + ":" + po._name + "</span></div>");
            $('#fov_display')
                .append(po_html);
            po_html.css('background-image', 'url("imgs/' + po._img + '")');
            displayed++;
        }
        var imgwidth = Math.floor($('#fov_display')
            .innerWidth() / Math.max(2, displayed)) - 2;;
        $('#fov_display .fov_item')
            .css('width', imgwidth + 'px');
    }
}

BFRL.Gui = {
    showAlert: function(alertText, x, y, w, delay, autoContinue) {
        BFRL.currentGame.engine.lock();
        // draw block
        x = x || 2;
        y = y || 2;
        w = w || 24;
        delay = delay || 0;
        var dispops = BFRL.display.getOptions();
        var xmax = dispops.width;
        var ymax = dispops.height;
        x = (xmax - x < w) ? xmax - w : x;
        BFRL.display.drawText(x, y, alertText, 24);

        if (delay > 0) {
            window.removeEventListener("keydown", BFRL.currentGame.player);
        }
        if (autoContinue === true) {
            setTimeout(function() {
                window.addEventListener("keydown", BFRL.currentGame.player);
                BFRL.currentGame.engine.unlock();
            }, delay);
        } else {
            setTimeout(function() {
                window.addEventListener("keydown", BFRL.Gui);
            }, delay);
        }
    },
    showGameOver: function(msg) {
        BFRL.currentGame.engine.lock();
        BFRL.display.clear();
        this.showAlert(msg, 5, 5, 50, 3000);
        this.isWaitingToRestart = true;
        return;
    },

    handleEvent: function(e) {
        BFRL.currentGame.engine.unlock();
        if (this.isWaitingToRestart) {
            this.isWaitingToRestart = false;
            BFRL.startNewGame();
        } else {
            window.addEventListener("keydown", BFRL.currentGame.player);
        }
        window.removeEventListener("keydown", this);
    }
}


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
