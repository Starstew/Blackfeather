BFRL.Game = function() {
    window.clearSubscribers();

    // init variables
    this.fov_cells_list = [];
    this.seen_cells_list = [];
    this.map = {};
    this.engine = null;
    this.player = null;
    this.scheduler = null;
    this.status_message = '';

    BFRL.gui.clearLogDisplay();
};

BFRL.Game.prototype = {
    "start": function() {
        this.scheduler = new ROT.Scheduler.Speed();

        // go to first map
        this.depth = 0;
        this.delveDeeper();

        this.engine = new ROT.Engine(this.scheduler);
        this.engine.start();
    },

    "generateMap": function() {
        this.map = new BFRL.Map();
        this.map.addEntranceAndExit();
    },

    "delveDeeper": function() {
        window.clearSubscribers();
        if (this.engine) {
            this.engine.lock();
        }

        this.scheduler.clear();
        this.seen_cells_list = [];
        this.fov_cells_list = [];

        // increment depth
        this.depth += 1;

        // create new map
        this.generateMap();

        // place player
        if (!this.player) {
            this.player = this.spawnAndPlaceBeing(BFRL.Player, this.map.free_cells);
        } else {
            this.player.subscribeToMessages();
            var index = Math.floor(ROT.RNG.getUniform() * this.map.free_cells.length);
            var key = this.map.free_cells.splice(index, 1)[0];
            var parts = key.split(",");
            var x = parseInt(parts[0]);
            var y = parseInt(parts[1]);
            this.player.relocate(x, y);
            this.player.addToPobjList();
        }
        var relo = [parseInt(this.map.entrance._x), parseInt(this.map.entrance._y)];
        this.player.relocate(relo[0], relo[1]);
        this.scheduler.add(this.player, true);

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

    "populateMonsters": function(difficulty_quota) {
        var max_tries = 1000;
        var half_quota = Math.floor(difficulty_quota * 0.5);

        // keep adding monsters until quota is exceeded (or we reach 1000 tries)
        var diffcount = 0;
        for (var i = 0; i < max_tries; i++) {
            var mt = BFRL.npcTypes.random();
            var remaining = difficulty_quota - diffcount;
            var mt_diff = mt.prototype.definition.difficulty;
            if (mt_diff > (remaining * 1.5) || mt.prototype.definition.difficulty > half_quota) {
                continue; // keep the harder monsters from soaking up slots
            }
            var mon = this.spawnAndPlaceBeing(mt, this.map.free_cells);
            this.scheduler.add(mon, true);
            diffcount += mon.difficulty_rating;
            if (diffcount >= difficulty_quota) {
                break;
            }
        }
    },

    "drawVisibleMap": function() {
        BFRL.display.clear();
        var key, x, y, parts, fgcolor, bgcolor;
        for (key in this.seen_cells_list) {
            parts = key.split(",");
            x = parseInt(parts[0]);
            y = parseInt(parts[1]);
            fgcolor = "#fff";
            bgcolor = (this.seen_cells_list[key] === '' ? BFRL.settings.mapWallColorHidden : BFRL.settings.mapFloorColorHidden);
            BFRL.display.draw(x, y, this.seen_cells_list[key], fgcolor, bgcolor);
        }
        for (key in this.fov_cells_list) {
            parts = key.split(",");
            x = parseInt(parts[0]);
            y = parseInt(parts[1]);
            fgcolor = "#fff";
            bgcolor = (this.fov_cells_list[key] === '' ? BFRL.settings.mapWallColor : BFRL.settings.mapFloorColors.random());
            BFRL.display.draw(x, y, this.fov_cells_list[key], fgcolor, bgcolor);

            // pobj on it?
            if (this.map.pobj_cells[key]) {
                var pobj = this.map.pobj_cells[key][0]; // draw the first one on the list
                pobj._draw();
            }
        }
    },

    "spawnAndPlaceBeing": function(what, free_cells) {
        var index = Math.floor(ROT.RNG.getUniform() * free_cells.length);
        var key = free_cells.splice(index, 1)[0];
        var parts = key.split(",");
        var x = parseInt(parts[0]);
        var y = parseInt(parts[1]);
        return new what(x, y);
    },

    /* remove object from map, scheduler, and pubsub */
    "removePobj": function(pobj) {
        if (!pobj) {
            return;
        }

        // remove from scheduling
        if (this.scheduler) {
            this.scheduler.remove(pobj);
        }

        // filter from list of objects
        for (var i in this.map.pobj_list) {
            if (this.map.pobj_list[i] == pobj) {
                this.map.pobj_list.splice(i, 1);
                break;
            }
        }

        // update the map
        this.map.updateObjectMap();
    },

    /* Get what would be the result of a move of 'pobj' into coordinate 'x,y'
		Returns object that has property 'isOpen' (Boolean) and an optional 'bumpedEntity' */
    "getMoveResult": function(pobj, x, y) {
        var newKey = x + "," + y;
        var e_array = this.map.pobj_cells[newKey];
        var ae;
        if (e_array && e_array.length > 0) {
            var len = e_array.length;
            for (var i = len - 1; i >= 0; i--) { // go in reverse to get "top" entity
                if (e_array[i].isPassable === false) {
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
        } // can't move to that coord

        return ({
            isOpen: true
        });
    },

    "addLogMessage": function(msg) {
        if (this.status_message.length > 0) {
            this.status_message += "; ";
        }
        this.status_message += msg;
    }
};
