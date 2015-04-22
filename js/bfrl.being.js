/* Being (Pobj) */
BFRL.Being = function(x,y) {
	BFRL.Pobj.call(this,x,y);

	// init variables
	this.fov_cells_list = []; // map cells in field of view
	this.fov_pobjs = []; // pobjs in field of view
	this.path_target = []; // target xy this being is moving toward
	this.path_target_location_lastseen = []; // remember location where target seen
	this.disposition = BFRL.DISP_NEUTRAL;
	this.equipment = {};

	// set variables based on definition
	var def = this.definition; // definition from prototype
	this.last_damaged_by = null;
	this.hitpoints_max = Math.ceil(ROT.RNG.getUniform() * (def.hitpointsRange[1] - def.hitpointsRange[0])) + def.hitpointsRange[0];
	this.hitpoints = this.hitpoints_max;
	this.difficulty_rating = def.difficulty;
	this.display_name = def.species;
	this.display_image_file = def.img;
	this.glyph = def.glyph;
	this.glyph_color = def.glyph_color;
	this.scheduler_speed = def.speed || 1;
	this.fov_range = def.fovFactor * BFRL.settings.fovBase;

	this.pickWeapon(def.weaponPool);
	this.pickLoot(def.lootPool);
	this.unpackTraits(def.traits);

	this.aggressionTarget = this.related_game.player; // temp for expediency, TODO:dynamic targets
	
	this.subscribeToMessages();
};

BFRL.Being.extend(BFRL.Pobj);

BFRL.Being.prototype.subscribeToMessages = function() {
	window.subscribe('dmg_'+this.objectId, this);
};

BFRL.Being.prototype.getSpeed = function() {
	return this.scheduler_speed;
};

BFRL.Being.prototype.scanFov = function() {
	this.fov_cells_list = [];
	var lightPasses = function(x, y) {
		var key = x+","+y;
		if (key in BFRL.current_game.map.cells) { // is part of the map
			return (BFRL.current_game.map.cells[key].length > 0);
		}
		return false;
	};
	var fov = new ROT.FOV.RecursiveShadowcasting(lightPasses);
	var tbfov = this.fov_cells_list;
	fov.compute(this._x, this._y, this.fov_range, function(x, y, r, visibility) {
		var key = x+","+y;
	 	tbfov[key] = BFRL.current_game.map.cells[key];
	});
};

BFRL.Being.prototype.updateFovPobjs = function() {
	this.fov_pobjs = [];
	// loop through map's pobjs, compare to fov map points
	var len = this.related_game.map.pobjList.length;
	for (var i = 0; i < len; i++) {
		var po = this.related_game.map.pobjList[i];
		var key = po.getX() + "," + po.getY();
		if(this.fov_cells_list[key] && !this.fov_pobjs[key] && this != po) {
			this.fov_pobjs.push(po);
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
	this.hitpoints -= dmg;
	this.last_damaged_by = dmgInflictor;
	weapon_name = weapon_name || dmgInflictor.weapon.display_name || 'attack';
	window.publish('log_message',this,this.display_name + " takes " + dmg + " damage from " + dmgInflictor.display_name + "'s " + weapon_name);
};

BFRL.Being.prototype.gainHitpoints = function(hpgain,msg) {
	var true_gain = Math.min(hpgain,this.hitpoints_max - this.hitpoints);
	this.hitpoints += true_gain;
	window.publish('log_message', this, this.display_name + " gains " + true_gain + " life " + (msg || ""));
};

BFRL.Being.prototype.act = function() {
	if (this.hitpoints <= 0) {
		this.resolveDeath();
	}
	this.scanFov();
	this.doTurn();
};

BFRL.Being.prototype.moveToward = function() {
	var path = this.related_game.map.getPath(this._x,this._y,this.path_target[0],this.path_target[1],4);

	// now check if we bump before actually moving
	if (path.length < 1) { return; }

	x = path[0][0];
	y = path[0][1];
	var moveResult = this.related_game.getMoveResult(this,x,y);
	if (moveResult.isOpen !== true) {
		if (moveResult.bumpedEntity !== null) {
			var be = moveResult.bumpedEntity;
			if (this.resolveBump) { this.resolveBump(be); }
			this.related_game.map.updateObjectMap();
		}
	} else {
		this.relocate(x,y);
	}
};

BFRL.Being.prototype.resolveDeath = function() {
	window.publish('log_message',this,this.display_name + " slain by " + this.last_damaged_by.display_name);
	this.doTurn = function(){}; // empty it out to make sure it doesn't do any last gasp stuff
	this.dropLoot();
	this.related_game.removePobj(this);
};

BFRL.Being.prototype.unpackTraits = function(trait_list) {
	this.traits = {};
	if (trait_list) {
		for (var t in trait_list) {
			if (BFRL.Traits[t]) {
				this.traits[t] = trait_list[t];
				if (BFRL.Traits[t].config) {
					BFRL.Traits[t].config(this, trait_list[t]);
				}
			}
		}
	}
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

BFRL.Being.prototype.pickLoot = function (lpool) {
	var loot_choice = (lpool && lpool.length > 0) ? lpool.random() : null;
	this.loot = (loot_choice) ? {type:BFRL.worldPobjs[loot_choice[0]], modifier:loot_choice[1]} : null;
};

BFRL.Being.prototype.dropLoot = function() {
	if (this.loot && this.loot.type) {
		var l = new this.loot.type(this._x,this._y,this.loot.modifier);
		window.publish('log_message',this,this.display_name + " dropped a " + l.display_name);
	}
};

BFRL.Being.prototype.doTurn = function() {
	// check view object for "aggressionTarget"
	this.updateFovPobjs();
	var xy;
	for (var i = 0; i < this.fov_pobjs.length; i++) {
		var fovobj = this.fov_pobjs[i];
		if (fovobj == this.aggressionTarget) {
			xy = [fovobj.getX(),fovobj.getY()];
			this.path_target_location_lastseen[fovobj.objectId] = [fovobj,xy];
			break;
		}
	}
	// go toward last known position of player (if ever seen)
	var gpid = this.aggressionTarget.objectId;
	if (this.path_target_location_lastseen[gpid]) {
		xy = this.path_target_location_lastseen[gpid][1];
		this.path_target = [xy[0],xy[1]];
		this.moveToward();
	}
};

BFRL.Being.prototype.resolveBump = function(be) {
	// TODO generalize to be able to attack whatever is enemy/target
	if (be == this.aggressionTarget) {
		var dmg = this.weapon.inflictDamage(be,this);
		window.publish("atk_" + this.objectId, this, {'dmg':dmg,'wielder':this}); // pubsub event for an attack taking place
		window.publish("dmg_" + be.objectId, this, {'dmg':dmg, 'dmgType':this.weapon.damageType, 'weapon_name':this.weapon.display_name}); // pubsub for damage being done
	}
};

BFRL.Being.prototype.doRangedAttack = function() {
	if (!this._target || !this._target.hitpoints) {
		return;
	}

	if (this.equipment.ranged && this.equipment.ranged !== null) {
		// TODO: discern what type of ranged attack is happening (bow vs. sling vs. staff vs. throw, etc.)
		var missile = new BFRL.weaponManifest.Arrow(0,0,true);
		var dmg = missile.inflictDamage(this._target,this);
		window.publish("dmg_" + this._target.objectId, this, {'dmg':dmg, 'dmgType':missile.damageType,'weapon_name':missile.display_name}); // pubsub for damage being done
		this.resolveAttack(this._target);
	}
};
