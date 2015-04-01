/* Pobj 
	A "placeable" object. */

BFRL.Pobj = function(x,y) {
	this._x = x;
	this._y = y;
	this._game = BFRL.curGame;

	if (this.addToPobjList) {
		this.addToPobjList();
	}
}

BFRL.Pobj.prototype = {
	isPassable: false,
	inventory: [],
	objectId: undefined,
	damageModifiers: {},
	_draw: function() {
		BFRL.display.draw(this.getX(), this.getY(), this._glyph, this._glyphColor, BFRL.settings.mapFloorColor);
	},
	getX: function() { return parseInt(this._x); },
	getY: function() { return parseInt(this._y); },
	getCoord: function() { return this.getX() + "," + this.getY()},

	relocate: function(tx,ty) {
		// assumes destination is pre-validated
		// from-space
		var fx = this.getX();
		var fy = this.getY();

		// update item's coordinates
		this._x = parseInt(tx);
		this._y = parseInt(ty);

		this._game.map.updateObjectMap();
	},

	addToPobjList : function() {
		this._game.map.pobjList.push(this);
		this.objectId = 'pobj_' + this._game.map.pobjCounter++;
	},

	addTrait: function(traitName, traitConfig) {
		this.traits = this.traits || {};
		this.traits[traitName] = traitConfig;
	},

	cleanupBeforeRemove: function() {
		// traits might be subscribing, clean them out
		if (this.traits) {
			for (var t in this.traits) {
				window.removeSubscriber(this.traits[t]);
			}
		}
	}
}

/***
* Specific objects
*/

/* Egress */
BFRL.worldPobjs.Egress = function(x,y,et) {
	BFRL.Pobj.call(this,x,y);
	this.isPassable = true;
	this._glyph = (et == BFRL.EGRESS_ENTRANCE) ? "<" : ">";
	this._glyphColor = "#111";
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
	this.isPassable = true;
}
BFRL.worldPobjs.GoldPile.extend(BFRL.Pobj);
BFRL.worldPobjs.GoldPile.prototype.onPickup = function(pickerUpper) {
	pickerUpper._gold = Math.max(0,pickerUpper._gold);
	pickerUpper._gold += this.amount;
	window.publish("log_message",this,"Picked up " + this.amount + " gold");
	this._game.removePobj(this);
}

BFRL.worldPobjs.BlackFeather = function(x,y,factor) {
	BFRL.Pobj.call(this,x,y);
	this._glyphColor = "#dd0"
	this._glyph = "~";
	this._name = "Black Feather";
	this.isPassable = true;
}
BFRL.worldPobjs.BlackFeather.extend(BFRL.Pobj);
BFRL.worldPobjs.BlackFeather.prototype.onPickup = function(pickerUpper) {
	if (pickerUpper == this._game.player) {
		var msg = "YOU FOUND THE BLACK FEATHER!\nIs it all you'd hoped for?\nAnyway, you did what you came here to do.\nTake your " + 
			this._game.player._gold + " gold and get out of here.";
		BFRL.gui.showGameOver(msg);
		return;
	}
}

BFRL.worldPobjs.Mushroom = function(x,y,factor) {
	BFRL.Pobj.call(this,x,y);
	this._glyphColor = "#337"
	this._glyph = "^";
	this._name = "Mushroom";
	this.isPassable = true;
	this.power = factor;
}
BFRL.worldPobjs.Mushroom.extend(BFRL.Pobj);
BFRL.worldPobjs.Mushroom.prototype.onPickup = function(pickerUpper) {
	pickerUpper._hitpointsMax += 1;
	pickerUpper.gainHitpoints(this.power,"by eating a yummy mushroom");
	this._game.removePobj(this);
}

BFRL.worldPobjs.Tooth = function(x,y,factor) {
	BFRL.Pobj.call(this,x,y);
	this._glyphColor = "#fff"
	this._glyph = "=";
	this._name = "Tooth";
	this.isPassable = true;
}
BFRL.worldPobjs.Tooth.extend(BFRL.Pobj);
BFRL.worldPobjs.Tooth.prototype.onPickup = function(pickerUpper) {
	window.publish("log_message",this, pickerUpper._name + " found a tooth.");
	this._game.removePobj(this);
}