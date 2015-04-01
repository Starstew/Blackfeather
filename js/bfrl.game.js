BFRL.game = function() {
	 // blank all state vars
        window.clearSubscribers();
        this.fovMapCells = [];
        this.seenMapCells = [];
        this.map = {};
        this.engine = null;
        this.player = null;
        this._scheduler = null;
        this.statusMsg = '';

        BFRL.gui.clearLogDisplay();
}

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
        if (this.statusMsg.length > 0) {
            this.statusMsg += "; ";
        }
        this.statusMsg += msg;
    }
}