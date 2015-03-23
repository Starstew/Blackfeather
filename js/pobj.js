/* Pobj 
	A "placeable" object. */

BFRL.Pobj = function(x,y) {
	this._x = x;
	this._y = y;
	this._game = BFRL.currentGame;
	if (this.addToPobjList) {
		this.addToPobjList();
	}
}

BFRL.Pobj.prototype = {
	isPassable: false,
	inventory: [],
	objectId: undefined,
	_draw: function() {
		BFRL.display.draw(this._x, this._y, this._glyph, this._glyphColor, BFRL.settings.mapFloorColor);
	},
	getX: function() { return this._x + 0; },
	getY: function() { return this._y + 0; },

	relocate: function(tx,ty) {
		// assumes destination is pre-validated
		// from-space
		var fx = this._x;
		var fy = this._y;

		// update item's coordinates
		this._x = tx;
		this._y = ty;

		this._game.map.updateObjectMap();
	},

	addToPobjList : function() {
		this._game.map.pobjList.push(this);
		this.objectId = 'pobj_' + this._game.map.pobjCounter++;
	}

	// resolveBump, resolveColocation, onTouch, onPickup, onDrop, onThrow, onUse <-- functions that infer actions

}

/* random/temp pobjs */
/* Egress */
BFRL.worldPobjs.Egress = function(x,y,et) {
	BFRL.Pobj.call(this,x,y);
	this.egressType = et;
	this.isPassable = true;
	this._glyph = (et == BFRL.EGRESS_ENTRANCE) ? "<" : ">";
	this._glyphColor = "#000";
	this._name = (et == BFRL.EGRESS_ENTRANCE) ? "Up" : "Down";
}
BFRL.worldPobjs.Egress.extend(BFRL.Pobj);


/* GoldPile */
BFRL.worldPobjs.GoldPile = function(x,y,amount) {
	BFRL.Pobj.call(this,x,y);
	this._glyph = "*";
	this._glyphColor = "#ff0";
	this._name = "Pile of Gold";
	this.amount = amount;
	this.isLoot = true;
	this.isPassable = true;
}
BFRL.worldPobjs.GoldPile.extend(BFRL.Pobj);
BFRL.worldPobjs.GoldPile.prototype.onPickup = function(pickerUpper) {
	pickerUpper._gold = Math.max(0,pickerUpper._gold);
	pickerUpper._gold += this.amount;
	this._game.addLogMessage("Picked up " + this.amount + " gold");
	this._game.removePobj(this);
}

BFRL.worldPobjs.BlackFeather = function(x,y,factor) {
	BFRL.Pobj.call(this,x,y);
	this._glyphColor = "#dd0"
	this._glyph = "~";
	this._name = "Black Feather";
	this.isLoot = true;
	this.isPassable = true;
}
BFRL.worldPobjs.BlackFeather.extend(BFRL.Pobj);
BFRL.worldPobjs.BlackFeather.prototype.onPickup = function(pickerUpper) {
	if (pickerUpper == this._game.player) {
		alert ("YOU FOUND THE BLACK FEATHER!\nIs it all you'd hoped for?\nAnyway, you did what you came here to do.\nTake your " + 
			this._game.player._gold + " gold and get out of here.");
		BFRL.startNewGame();
		return;
	}
}

BFRL.worldPobjs.Mushroom = function(x,y,factor) {
	BFRL.Pobj.call(this,x,y);
	this._glyphColor = "#337"
	this._glyph = "^";
	this._name = "Mushroom";
	this.isLoot = true;
	this.isPassable = true;
	this.power = factor;
}
BFRL.worldPobjs.Mushroom.extend(BFRL.Pobj);
BFRL.worldPobjs.Mushroom.prototype.onPickup = function(pickerUpper) {
	pickerUpper._hitpointsMax += 1;
	pickerUpper._hitpoints += this.power;
	pickerUpper._hitpoints = Math.min(pickerUpper._hitpointsMax,pickerUpper._hitpoints);
	this._game.addLogMessage(pickerUpper._name + " feels healthier after eating a " + this._name);
	this._game.removePobj(this);
}

BFRL.worldPobjs.Tooth = function(x,y,factor) {
	BFRL.Pobj.call(this,x,y);
	this._glyphColor = "#fff"
	this._glyph = "=";
	this._name = "Tooth";
	this.isLoot = true;
	this.isPassable = true;
}
BFRL.worldPobjs.Tooth.extend(BFRL.Pobj);
BFRL.worldPobjs.Tooth.prototype.onPickup = function(pickerUpper) {
	this._game.addLogMessage(pickerUpper._name + " found a tooth.");
	this._game.removePobj(this);
}