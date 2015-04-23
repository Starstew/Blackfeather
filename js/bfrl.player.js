/* Player (Being) */
BFRL.Player = function(x,y) {
	BFRL.Being.call(this,x,y);

	// player-specific stuff
	this.gold_pieces = 0;
	this.display_name = "Wombat";
	this.scheduler_speed = 1; // ROT.js scheduler speed
	this.target_cycle_offset = 0; // for cycling through targets of ranged attack
	this.ranged_target = {};

	// equip
	var sword =	new BFRL.weapon_manifest.Sword(0,0,true);
	var bow = new BFRL.weapon_manifest.Bow(0,0,true);
	this.equipment = {
		ranged: bow,
		melee: sword,
		body:{}, // armor
		head:{}, // armor
		feet:{}, // armor
		arms:{},
		ringLeft:{},
		ringRight:{}
	};
};
BFRL.Player.extend(BFRL.Being);

BFRL.Player.prototype.definition = {
	"glyph":"@",
	"glyph_color":"#ff0",
	"species":"Player",
	"hitpointsRange":[100,100],
	"difficulty":1,
	"fovFactor":1,
	"weaponPool": [
		["Sword", 1]
	],
	"lootPool": [],
	"img": "gu.jpg"
};

BFRL.Player.prototype.doRest = function() {
	// intentionally do nothing to burn a turn, TODO: rest?
};

BFRL.Player.prototype.act = function() {
	if (this.hitpoints <= 0) {
		var msg = "You have been killed by " + this.last_damaged_by.display_name + "'s " +
			this.last_damaged_by.weapon.display_name + "!\nDepth: " +
			this.related_game.depth+"\nGold: " + this.gold_pieces;

		BFRL.doGameOver(msg);
		return;
	}

	// get everything in order to draw the player's fov
	this.related_game.map.updateObjectMap();
	this.drawFov();
	this.updateFovPobjs();
	this._draw();

	// update the UI
	BFRL.gui.refreshUi();

	BFRL.waitForNextPlayerInput();
};

BFRL.Player.prototype.drawFov = function() {
	this.scanFov();
	this.related_game.fov_cells_list = this.fov_cells_list;
	for (var i in this.fov_cells_list) {
		if (typeof this.fov_cells_list[i] == 'function') { continue; }
		var mc = this.fov_cells_list[i];
		if (mc) {
			if (mc == ".") {
				mc = ' ';
			}
		} else {
			mc = '';
		}
		this.related_game.seen_cells_list[i] = mc;
		this.related_game.fov_cells_list[i] = mc;
	}
	this.related_game.drawVisibleMap();
};

BFRL.Player.prototype.resolveBump = function(pobj) {
	// attack everything (TODO: non-violent tactics)
	if (this.equipment.melee && this.equipment.melee !== null) {
		var w = this.equipment.melee;
		var dmg = w.inflictDamage(pobj,this);
		window.publish("atk_" + this.objectId, this, {'dmg':dmg,'wielder':this}); // pubsub event for an attack taking place
		window.publish("dmg_" + pobj.objectId, this, {'dmg':dmg, 'dmgType':w.damageType}); // pubsub for damage being done
		this.resolveAttack(pobj);
	}
};

BFRL.Player.prototype.resolveAttack = function(pobj) {
};

BFRL.Player.prototype.resolveColocation = function() {
	// check the space we're standing on for ispassable items we might want to pick up, or get trapped by, etc.
	var x = this._x;
	var y = this._y;
	var colo_objs = this.related_game.map.getObjectsAtLoc(x,y,this);
	var len = colo_objs.length;
	for (var i = 0; i < len; i++) {
		var cobj = colo_objs[i];
		if (cobj.onPickup) {
			cobj.onPickup(this);
		}
		if (cobj == this.related_game.map.exit) {
			this.related_game.delveDeeper();
		}
	}
};

BFRL.Player.prototype.showLosToNextTarget = function(offset) {
	// only if something's in FOV
	var fov_len = (this.fov_pobjs) ? this.fov_pobjs.length : 0;
	if (fov_len > 0) {
		// create list of things that are targetable
		var is_targetable_list = [];
		for (var i=0; i<fov_len; i++) {
			if (this.fov_pobjs[i] && this.fov_pobjs[i].hitpoints) {
				is_targetable_list.push(this.fov_pobjs[i]);
			}
		}

		// if anything is targetable, show LOS to next on list (determined by offset)
		var itl_len = is_targetable_list.length;
		if (itl_len > 0) {
			offset = offset || 0;
			this.target_cycle_offset = Math.abs((this.target_cycle_offset + offset) % itl_len);
			var target = is_targetable_list[this.target_cycle_offset];
			this.ranged_target = target; // remember our target for ranged attack purposes
			var from_xy = [this.getX(),this.getY()];
			var to_xy = [target.getX(), target.getY()];
			var atk_range = 10; // TODO ... get from weapon + modifiers
			this.drawFov();
			BFRL.current_game.map.showLineOfSight(from_xy, to_xy, atk_range);
		}
	}
};

BFRL.Player.prototype.tryMoveInDirection = function(md) {
	var diff = ROT.DIRS[8][md];
	var newX = this._x + diff[0];
	var newY = this._y + diff[1];
	var newKey = newX + "," + newY;

	var moveResult = this.related_game.getMoveResult(this,newX,newY);
	if (moveResult.isOpen !== true) {
		if (moveResult.bumpedEntity !== null) {
		    this.resolveBump(moveResult.bumpedEntity);
		} else {
		    return false;
		}
	} else {
		this.relocate(newX,newY);
		this.resolveColocation();
	}
	return true;
};