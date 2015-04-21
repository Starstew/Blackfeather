/* Being (Pobj) */
BFRL.Being = function(x,y) {
	BFRL.Pobj.call(this,x,y);
	this.fovMapCells = [];
	this.fovPobjs = [];
	this.pathTo = []; // xy this being is moving toward
	this.locMemory = []; // remember location where target seen
	this.disposition = BFRL.DISP_NEUTRAL;
	this.equipment = {};

	var def = this.definition; // definition from prototype

	this._lastDamagedBy = null;
	this._hitpointsMax = Math.ceil(ROT.RNG.getUniform() * (def.hitpointsRange[1] - def.hitpointsRange[0])) + def.hitpointsRange[0];
	this._hitpoints = this._hitpointsMax;
	this._difficulty = def.difficulty;
	this._name = def.species;
	this._img = def.img;
	this._glyph = def.glyph;
	this._glyphColor = def.glyphColor;
	this.pickWeapon(def.weaponPool);
	this._speed = def.speed || 1;
	this.fovRange = def.fovFactor * BFRL.settings.fovBase;
	var loot_choice = (def.lootPool && def.lootPool.length > 0) ? def.lootPool.random() : null;
	this.loot = (loot_choice) ? {type:BFRL.worldPobjs[loot_choice[0]], modifier:loot_choice[1]} : null;

	this.aggressionTarget = this._game.player; // temp for expediency, TODO:dynamic targets
	
	// config traits
	this.traits = {};
	if (def.traits) {
		for (var t in def.traits) {
			if (BFRL.Traits[t]) {
				this.traits[t] = def.traits[t];
				if (BFRL.Traits[t].config) {
					BFRL.Traits[t].config(this,def.traits[t]);
				}
			}
		}
	}

	this.subscribeToMessages();
};

BFRL.Being.extend(BFRL.Pobj);

BFRL.Being.prototype.subscribeToMessages = function() {
	window.subscribe('dmg_'+this.objectId, this);
};

BFRL.Being.prototype.getSpeed = function() {
	return this._speed;
};

BFRL.Being.prototype.scanFov = function() {
	this.fovMapCells = [];
	var lightPasses = function(x, y) {
		var key = x+","+y;
		if (key in BFRL.curGame.map.cells) { // is part of the map
			return (BFRL.curGame.map.cells[key].length > 0);
		}
		return false;
	};
	var fov = new ROT.FOV.RecursiveShadowcasting(lightPasses);
	var tbfov = this.fovMapCells;
	fov.compute(this._x, this._y, this.fovRange, function(x, y, r, visibility) {
		var key = x+","+y;
	 	tbfov[key] = BFRL.curGame.map.cells[key];
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
};

BFRL.Being.prototype.handleMessage = function(message, publisher, data) {
	var msgtype = message.split("_")[0];
	switch(msgtype) {
		case "dmg":
			this.receiveDamage(data.dmg, data.dmgType, publisher, data.weapon_name);
			break;
	}
};

BFRL.Being.prototype.receiveDamage = function(dmg, dmgType, dmgInflictor, weapon_name) {
	// for now, just take damage (nuances, resistances, etc TODO)
	this._hitpoints -= dmg;
	this._lastDamagedBy = dmgInflictor;
	weapon_name = weapon_name || dmgInflictor.weapon._name || 'attack';
	window.publish('log_message',this,this._name + " takes " + dmg + " damage from " + dmgInflictor._name + "'s " + weapon_name);
};

BFRL.Being.prototype.gainHitpoints = function(hpgain,msg) {
	var true_gain = Math.min(hpgain,this._hitpointsMax - this._hitpoints);
	this._hitpoints += true_gain;
	window.publish('log_message', this, this._name + " gains " + true_gain + " life " + (msg || ""));
};

BFRL.Being.prototype.act = function() {
	if (this._hitpoints <= 0) {
		this.resolveDeath();
	}
	this.scanFov();
	this.doTurn();
};

BFRL.Being.prototype.moveToward = function() {
	var path = this._game.map.getPath(this._x,this._y,this.pathTo[0],this.pathTo[1],4);

	// now check if we bump before actually moving
	if (path.length < 1) { return; }

	x = path[0][0];
	y = path[0][1];
	var moveResult = this._game.getMoveResult(this,x,y);
	if (moveResult.isOpen !== true) {
		if (moveResult.bumpedEntity !== null) {
			var be = moveResult.bumpedEntity;
			if (this.resolveBump) { this.resolveBump(be); }
			this._game.map.updateObjectMap();
		}
	} else {
		this.relocate(x,y);
	}
};

BFRL.Being.prototype.resolveDeath = function() {
	window.publish('log_message',this,this._name + " slain by " + this._lastDamagedBy._name);
	this.doTurn = function(){}; // empty it out to make sure it doesn't do any last gasp stuff
	this.dropLoot();
	this._game.removePobj(this);
};

BFRL.Being.prototype.pickWeapon = function(wpool) {
	var choice = wpool.random();
	var rnd_weapon = choice[0];
	if (rnd_weapon == "WeaponArbitrary") {
		var args = choice[1];
		this.weapon = new BFRL.WeaponArbitrary(args[0],args[1], BFRL['DMGTYPE_' + args[2]],args[3]);
	} else {
		this.weapon = new BFRL.weaponManifest[rnd_weapon]();
	}
	if (this.weapon.attackMode == BFRL.ATTACKMODE_RANGED) {
		this.equipment.ranged = this.weapon;
	} else if (this.weapon.attackMode == BFRL.ATTACKMODE_MELEE) {
		this.equipment.melee = this.weapon;
	}
};

BFRL.Being.prototype.dropLoot = function() {
	if (this.loot && this.loot.type) {
		var l = new this.loot.type(this._x,this._y,this.loot.modifier);
		window.publish('log_message',this,this._name + " dropped a " + l._name);
	}
};

BFRL.Being.prototype.doTurn = function() {
	// check view object for "aggressionTarget"
	this.updateFovPobjs();
	var xy;
	for (var i = 0; i < this.fovPobjs.length; i++) {
		var fovobj = this.fovPobjs[i];
		if (fovobj == this.aggressionTarget) {
			xy = [fovobj.getX(),fovobj.getY()];
			this.locMemory[fovobj.objectId] = [fovobj,xy];
			break;
		}
	}
	// go toward last known position of player (if ever seen)
	var gpid = this.aggressionTarget.objectId;
	if (this.locMemory[gpid]) {
		xy = this.locMemory[gpid][1];
		this.pathTo = [xy[0],xy[1]];
		this.moveToward();
	}
};

BFRL.Being.prototype.resolveBump = function(be) {
	// TODO generalize to be able to attack whatever is enemy/target
	if (be == this.aggressionTarget) {
		var dmg = this.weapon.inflictDamage(be,this);
		window.publish("atk_" + this.objectId, this, {'dmg':dmg,'wielder':this}); // pubsub event for an attack taking place
		window.publish("dmg_" + be.objectId, this, {'dmg':dmg, 'dmgType':this.weapon.damageType, 'weapon_name':this.weapon._name}); // pubsub for damage being done
	}
};

BFRL.Being.prototype.doRangedAttack = function() {
	if (!this._target || !this._target._hitpoints) {
		return;
	}

	if (this.equipment.ranged && this.equipment.ranged !== null) {
		// TODO: discern what type of ranged attack is happening (bow vs. sling vs. staff vs. throw, etc.)
		var missile = new BFRL.weaponManifest.Arrow(0,0,true);
		var dmg = missile.inflictDamage(this._target,this);
		window.publish("dmg_" + this._target.objectId, this, {'dmg':dmg, 'dmgType':missile.damageType,'weapon_name':missile._name}); // pubsub for damage being done
		this.resolveAttack(this._target);
	}
};
