/* Being (Pobj) */
BFRL.Being = function(x,y) {
	BFRL.Pobj.call(this,x,y);
	this.fovMapCells = [];
	this.fovPobjs = [];
	this._lastDamagedBy = null;

	this.pathTo = [];
	this.locMemory = [];
	this.disposition = BFRL.DISP_NEUTRAL;

	var def = this.definition; // definition from prototype

	this._hitpointsMax = Math.ceil(ROT.RNG.getUniform() * (def.hitpointsRange[1] - def.hitpointsRange[0])) + def.hitpointsRange[0];
	this._hitpoints = this._hitpointsMax;
	this._difficulty = def.difficulty;
	this._name = def.species;
	this._img = def.img;
	this._glyph = def.glyph;
	this._glyphColor = def.glyphColor;
	this._pickWeapon(def.weaponPool);
	this._speed = def.speed || 1;
	this.fovRange = def.fovFactor * BFRL.settings.fovBase;

	var loot_choices = Object.keys(def.lootPool);
	var loot_key = loot_choices.random();
	var loot_mod = def.lootPool[loot_key];
	this.loot = {type:BFRL.worldPobjs[loot_key], modifier:loot_mod};

	this.aggressionTarget = this._game.player; // temp for expediency, TODO:dynamic targets
	
	// config traits
	this.traits = {};
	if (def.traits) {
		for (var t in def.traits) {
			if (BFRL.BeingTraits[t]) {
				this.traits[t] = def.traits[t];
				if (BFRL.BeingTraits[t].config) {
					BFRL.BeingTraits[t].config(this,def.traits[t]);
				}
			}
		}
	}

	// subscribe to events
	window.subscribe('dmg_'+this.objectId, this);
};

BFRL.Being.extend(BFRL.Pobj);

BFRL.Being.prototype.getSpeed = function() {
	return this._speed;
}

BFRL.Being.prototype.scanFov = function() {
	this.fovMapCells = [];
	var lightPasses = function(x, y) {
		var key = x+","+y;
		if (key in BFRL.currentGame.map.cells) { // is part of the map
			return (BFRL.currentGame.map.cells[key].length > 0);
		}
		return false;
	}
	var fov = new ROT.FOV.RecursiveShadowcasting(lightPasses);
	var tbfov = this.fovMapCells;
	fov.compute(this._x, this._y, this.fovRange, function(x, y, r, visibility) {
		var key = x+","+y;
	 	tbfov[key] = BFRL.currentGame.map.cells[key];
	});
};

BFRL.Being.prototype.updateFovPobjs = function() {
	this.fovPobjs = [];
	// loop through map's pobjs, compare to fov map points
	var len = this._game.map.pobjList.length;
	for (var i = 0; i < len; i++) {
		var po = this._game.map.pobjList[i];
		var key = po.getX() + "," + po.getY();
		if(this.fovMapCells[key] && !this.fovPobjs[key] && this != po) {
			this.fovPobjs.push(po);
		}
	}
}

BFRL.Being.prototype.handleMessage = function(message, publisher, data) {
	var msgtype = message.split("_")[0];
	switch(msgtype) {
		case "dmg":
			this.receiveDamage(data['dmg'],data['dmgType'],publisher);
			break;
	}
};

BFRL.Being.prototype.receiveDamage = function(dmg, dmgType, dmgInflictor) {
	// for now, just take damage (nuances, resistances, etc TODO)
	this._hitpoints -= dmg;
	this._lastDamagedBy = dmgInflictor;
	this._game.addLogMessage(this._name + " takes " + dmg + " damage from " + dmgInflictor._name + "'s " + dmgInflictor.weapon._name);
}

BFRL.Being.prototype.gainHitpoints = function(hpgain) {
	this._hitpoints = Math.min(this._hitpoints + hpgain, this._hitpointsMax);
}

BFRL.Being.prototype.act = function() {
	if (this._hitpoints <= 0) {
		this.resolveDeath();
	}
	this.scanFov();
	this.doTurn();
}

BFRL.Being.prototype.moveToward = function() {
	var path = this._game.map.getPath(this._x,this._y,this.pathTo[0],this.pathTo[1],4);

	// now check if we bump before actually moving
	if (path.length < 1) { return; }

	x = path[0][0];
	y = path[0][1];
	var moveResult = this._game.getMoveResult(this,x,y);
	if (moveResult.isOpen != true) {
		if (moveResult.bumpedEntity != null) {
			var be = moveResult.bumpedEntity;
			if (this.resolveBump) { this.resolveBump(be); }
			this._game.map.updateObjectMap();
		}
	} else {
		this.relocate(x,y);
	}
}

BFRL.Being.prototype.resolveDeath = function() {
	this._game.addLogMessage(this._name + " slain by " + this._lastDamagedBy._name);
	this.doTurn = function(){}; // empty it out to make sure it doesn't do any last gasp stuff
	this.dropLoot();
	this._game.removePobj(this);
}

BFRL.Being.prototype._pickWeapon = function(wpool) {
	var weapon_choices = Object.keys(wpool);
	var rnd_weapon = weapon_choices.random();
	if (rnd_weapon == "WeaponArbitrary") {
		var args = wpool[rnd_weapon];
		this.weapon = new BFRL.WeaponArbitrary(args[0],args[1], BFRL['DMGTYPE_' + args[2]],args[3]);
	} else {
		this.weapon = new BFRL.weaponManifest[rnd_weapon]();
	}
}

BFRL.Being.prototype.dropLoot = function() {
	if (this.loot && this.loot.type) {
		var l = new this.loot.type(this._x,this._y,this.loot.modifier);
		this._game.addLogMessage(this._name + " dropped a " + l._name);
	}
}

BFRL.Being.prototype.doTurn = function() {
	// check view object for "aggressionTarget"
	this.updateFovPobjs();
	for (var i = 0; i < this.fovPobjs.length; i++) {
		var fovobj = this.fovPobjs[i];
		if (fovobj == this.aggressionTarget) {
			var xy = [fovobj.getX(),fovobj.getY()];
			this.locMemory[fovobj.objectId] = [fovobj,xy];
			break;
		}
	}
	// go toward last known position of player (if ever seen)
	var gpid = this.aggressionTarget.objectId;
	if (this.locMemory[gpid]) {
		var xy = this.locMemory[gpid][1];
		this.pathTo = [xy[0],xy[1]];
		this.moveToward();
	}
}

BFRL.Being.prototype.resolveBump = function(be) {
	// TODO generalize to be able to attack whatever is enemy/target
	if (be == this.aggressionTarget) {
		var dmg = this.weapon.inflictDamage(be,this);
		window.publish("atk_" + this.objectId, this, {'dmg':dmg}); // pubsub event for an attack taking place
		window.publish("dmg_" + be.objectId, this, {'dmg':dmg, 'dmgType':this.weapon.damageType}); // pubsub for damage being done
	}
}
