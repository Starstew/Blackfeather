/* Pobj 
	A "placeable" object. */

var Pobj = function(x,y) {
	this._x = x;
	this._y = y;
	if (this.addToPobjList) {
		this.addToPobjList();
	}
}

Pobj.prototype = {
	isPassable: false,
	inventory: [],
	objectId: undefined,
	_draw: function() {
		Game.display.draw(this._x, this._y, this._glyph, this._glyphColor, Game.mapFloorColor);
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

		Game.map.updateObjectMap();
	},

	addToPobjList : function() {
		Game.map.pobjList.push(this);
		this.objectId = 'pobj_' + Game.map.pobjCounter++;
	}

	// resolveBump, resolveColocation, onTouch, onPickup, onDrop, onThrow, onUse <-- functions that infer actions

}

/* random/temp pobjs */
/* Egress */
var Egress = function(x,y,et) {
	Pobj.call(this,x,y);
	this.egressType = et;
	this.isPassable = true;
	this._glyph = (et == Game.EGRESS_ENTRANCE) ? "<" : ">";
	this._glyphColor = "#000";
	this._name = (et == Game.EGRESS_ENTRANCE) ? "Up" : "Down";
}
Egress.extend(Pobj);


/* GoldPile */
var GoldPile = function(x,y,amount) {
	Pobj.call(this,x,y);
	this._glyph = "*";
	this._glyphColor = "#ff0";
	this._name = "Pile of Gold";
	this.amount = amount;
	this.isLoot = true;
	this.isPassable = true;
}
GoldPile.extend(Pobj);
GoldPile.prototype.onPickup = function(pickerUpper) {
	pickerUpper._gold = Math.max(0,pickerUpper._gold);
	pickerUpper._gold += this.amount;
	Game.addLogMessage("Picked up " + this.amount + " gold");
	Game.removePobj(this);
}

var BlackFeather = function(x,y,factor) {
	Pobj.call(this,x,y);
	this._glyphColor = "#dd0"
	this._glyph = "~";
	this._name = "Black Feather";
	this.isLoot = true;
	this.isPassable = true;
}
BlackFeather.extend(Pobj);
BlackFeather.prototype.onPickup = function(pickerUpper) {
	if (pickerUpper == Game.player) {
		alert ("YOU FOUND THE BLACK FEATHER!\nIs it all you'd hoped for?\nAnyway, you did what you came here to do.\nTake your " + Game.player._gold + " gold and get out of here.");
		Game.init();
		return;
	}
}

var Mushroom = function(x,y,factor) {
	Pobj.call(this,x,y);
	this._glyphColor = "#337"
	this._glyph = "^";
	this._name = "Mushroom";
	this.isLoot = true;
	this.isPassable = true;
	this.power = factor;
}
Mushroom.extend(Pobj);
Mushroom.prototype.onPickup = function(pickerUpper) {
	pickerUpper._hitpointsMax += 1;
	pickerUpper._hitpoints += this.power;
	pickerUpper._hitpoints = Math.min(pickerUpper._hitpointsMax,pickerUpper._hitpoints);
	Game.addLogMessage(pickerUpper._name + " feels healthier after eating a " + this._name);
	Game.removePobj(this);
}