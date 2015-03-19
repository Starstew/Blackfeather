/* Npc (Being) */
	var Npc = function(x,y) {
		Being.call(this,x,y);
		this._x = x;
		this._y = y;
		this.pathTo = [];
		this.locMemory = [];
		this.disposition = Game.DISP_NEUTRAL;
	}
	Npc.extend(Being);
	Npc.prototype.act = function() {
		if (this._hitpoints <= 0) {
			this.resolveDeath();
		}
		this.scanFov();
		this.doTurn();
	}
	Npc.prototype.dropLoot = function() {
	}
	Npc.prototype.moveToward = function() {
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
	
	Npc.prototype.resolveDeath = function() {
		Game.addLogMessage(this._name + " slain by " + this._lastDamagedBy._name);
		this.doTurn = function(){}; // empty it out to make sure it doesn't do any last gasp stuff
		this.dropLoot();
		Game.removePobj(this);
	}
	Npc.prototype.doTurn = function() {
		// stub
		//console.log("Npc.doTurn");
	}