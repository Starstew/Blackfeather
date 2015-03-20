/* Being (Pobj) */
var Being = function(x,y) {
	Pobj.call(this,x,y);
	this.fovMapCells = [];
	this.fovPobjs = [];
	this._lastDamagedBy = null;

	this.pathTo = [];
	this.locMemory = [];
	this.disposition = Game.DISP_NEUTRAL;

	var def = this.definition; // definition from prototype

	this._hitpointsMax = Math.ceil(ROT.RNG.getUniform() * (def.hitpointsRange[1] - def.hitpointsRange[0])) + def.hitpointsRange[0];
	this._hitpoints = this._hitpointsMax;
	this._difficulty = def.difficulty;
	this._name = def.species;
	this._img = def.img;
	this._glyph = def.glyph;
	this._glyphColor = def.glyphColor;
	this._pickWeapon(def.weaponPool);
	this.fovRange = def.fovFactor * Game.fovBase;

	var loot_choices = Object.keys(def.lootPool);
	var loot_key = loot_choices.random();
	var loot_mod = def.lootPool[loot_key];
	this.loot = {type:window[loot_key], modifier:loot_mod};

	this.aggressionTarget = Game.player; // temp for expediency, TODO:dynamic targets
};

Being.extend(Pobj);

Being.prototype.scanFov = function() {
	this.fovMapCells = [];
	var lightPasses = function(x, y) {
	    var key = x+","+y;
	    if (key in Game.map.cells) { // is part of the map
	    	return (Game.map.cells[key].length > 0);
	    }
	    return false;
	}
	var fov = new ROT.FOV.RecursiveShadowcasting(lightPasses);
	var tbfov = this.fovMapCells;
	fov.compute(this.getX(), this.getY(), this.fovRange, function(x, y, r, visibility) {
		var key = x+","+y;
	    tbfov[key] = Game.map.cells[key];
	});
};

Being.prototype.updateFovPobjs = function() {
	this.fovPobjs = [];
	// loop through map's pobjs, compare to fov map points
	var len = Game.map.pobjList.length;
	for (var i = 0; i < len; i++) {
		var po = Game.map.pobjList[i];
		var key = po.getX() + "," + po.getY();
		if(this.fovMapCells[key] && !this.fovPobjs[key] && this != po) {
			this.fovPobjs.push(po)
		}
	}
}

Being.prototype.receiveDamage = function(dmg, dmgType, dmgInflictor) {
	// for now, just take damage (nuances, resistances, etc TODO)
	this._hitpoints -= dmg;
	this._lastDamagedBy = dmgInflictor;
	Game.addLogMessage(this._name + " takes " + dmg + " damage from " + dmgInflictor._name + "'s " + dmgInflictor.weapon._name);
}

Being.prototype.act = function() {
	if (this._hitpoints <= 0) {
		this.resolveDeath();
	}
	this.scanFov();
	this.doTurn();
}

Being.prototype.moveToward = function() {
	var path = Game.map.getPath(this._x,this._y,this.pathTo[0],this.pathTo[1],4);

	// now check if we bump before actually moving
	if (path.length < 1) { return; }

	x = path[0][0];
	y = path[0][1];
	var moveResult = Game.getMoveResult(this,x,y);
	if (moveResult.isOpen != true) {
		if (moveResult.bumpedEntity != null) {
			var be = moveResult.bumpedEntity;
			if (this.resolveBump) { this.resolveBump(be); }
			Game.map.updateObjectMap();
		}
	} else {
		this.relocate(x,y);
	}
}

Being.prototype.resolveDeath = function() {
	Game.addLogMessage(this._name + " slain by " + this._lastDamagedBy._name);
	this.doTurn = function(){}; // empty it out to make sure it doesn't do any last gasp stuff
	this.dropLoot();
	Game.removePobj(this);
}

Being.prototype.doTurn = function() {
	// stub
}

Being.prototype._pickWeapon = function(wpool) {
	var weapon_choices = Object.keys(wpool);
	var rnd_weapon = weapon_choices.random();
	if (rnd_weapon == "WeaponArbitrary") {
		var args = wpool[rnd_weapon];
		this.weapon = new WeaponArbitrary(args[0],args[1],Game['DMGTYPE_' + args[2]],args[3]);
	} else {
		this.weapon = new Game.armory[weapon_choices.random()](0,0,true);
	}
}

Being.prototype.dropLoot = function() {
	if (this.loot && this.loot.type) {
		var l = new this.loot.type(this._x,this._y,this.loot.modifier);
		Game.addLogMessage(this._name + " dropped a " + l._name);
		l.isLoot = true;
		l._isPassable = true;
	}
}

Being.prototype.doTurn = function() {
	// check view object for player
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

Being.prototype.resolveBump = function(be) {
	// TODO generalize to be able to attack whatever is enemy/target
	if (be == this.aggressionTarget) {
		this.weapon.inflictDamage(be,this);
	}
}
