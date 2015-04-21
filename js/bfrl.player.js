/* Player (Being) */
BFRL.Player = function(x,y) {
	BFRL.Being.call(this,x,y);

	// player-specific stuff
	this._gold = 0;
	this._name = "Wombat";
	this._speed = 1; // ROT.js scheduler speed
	this._targetCycleOffset = 0; // for cycling through targets of ranged attack
	this._target = {};

	// equip
	var sword =	new BFRL.weaponManifest.Sword(0,0,true);
	var bow = new BFRL.weaponManifest.Bow(0,0,true);
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
	"glyphColor":"#ff0",
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
	if (this._hitpoints <= 0) {
		var msg = "You have been killed by " + this._lastDamagedBy._name + "'s " +
			this._lastDamagedBy.weapon._name + "!\nDepth: " +
			this._game.depth+"\nGold: " + this._gold;

		BFRL.doGameOver(msg);
		return;
	}

	// get everything in order to draw the player's fov
	this._game.map.updateObjectMap();
	this.drawFov();
	this.updateFovPobjs();
	this._draw();

	// update the UI
	BFRL.gui.refreshUi();

	BFRL.waitForNextPlayerInput();
};

BFRL.Player.prototype.drawFov = function() {
	this.scanFov();
	this._game.fovMapCells = this.fovMapCells;
	for (var i in this.fovMapCells) {
		if (typeof this.fovMapCells[i] == 'function') { continue; }
		var mc = this.fovMapCells[i];
		if (mc) {
			if (mc == ".") {
				mc = ' ';
			}
		} else {
			mc = '';
		}
		//mc = (mc ? ' ':'');
		this._game.seenMapCells[i] = mc;
		this._game.fovMapCells[i] = mc;
	}
	this._game.drawVisibleMap();
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
	var colo_objs = this._game.map.getObjectsAtLoc(x,y,this);
	var len = colo_objs.length;
	for (var i = 0; i < len; i++) {
		var cobj = colo_objs[i];
		if (cobj.onPickup) {
			cobj.onPickup(this);
		}
		if (cobj == this._game.map.exit) {
			this._game.delveDeeper();
		}
	}
};

BFRL.Player.prototype.showLosToNextTarget = function(offset) {
	// only if something's in FOV
	if (this.fovPobjs.length > 0) {
		offset = offset || 0;
		var fov_len = this.fovPobjs.length;
		this._targetCycleOffset = Math.abs((this._targetCycleOffset + offset)%fov_len);
		var fxy = [this.getX(),this.getY()];
		var target = this.fovPobjs[this._targetCycleOffset];
		this._target = target; // remember our target for ranged attack purposes
		var txy = [target.getX(),target.getY()];
		var atk_range = 10; // TODO ... get from weapon + modifiers
		this.drawFov();
		BFRL.curGame.map.showLineOfSight(fxy,txy,atk_range);
	}
};

BFRL.Player.prototype.tryMoveInDirection = function(md) {
	var diff = ROT.DIRS[8][md];
	var newX = this._x + diff[0];
	var newY = this._y + diff[1];
	var newKey = newX + "," + newY;

	var moveResult = this._game.getMoveResult(this,newX,newY);
	if (moveResult.isOpen !== true) {
		console.log(moveResult);
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