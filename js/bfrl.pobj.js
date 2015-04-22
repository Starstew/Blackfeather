/* Pobj 
	A "placeable" object. */

BFRL.Pobj = function(x,y) {
	this._x = x;
	this._y = y;
	this.related_game = BFRL.current_game;

	if (this.addToPobjList) {
		this.addToPobjList();
	}
};

BFRL.Pobj.prototype = {
	isPassable: false,
	inventory: [],
	objectId: undefined,
	damageModifiers: {},
	_draw: function() {
		BFRL.display.draw(this.getX(), this.getY(), this.glyph, this.glyph_color, BFRL.settings.mapFloorColor);
	},
	getX: function() { return parseInt(this._x); },
	getY: function() { return parseInt(this._y); },
	getCoord: function() { return this.getX() + "," + this.getY(); },

	relocate: function(tx,ty) {
		// assumes destination is pre-validated
		// from-space
		var fx = this.getX();
		var fy = this.getY();

		// update item's coordinates
		this._x = parseInt(tx);
		this._y = parseInt(ty);

		this.related_game.map.updateObjectMap();
	},

	addToPobjList : function() {
		this.related_game.map.pobjList.push(this);
		this.objectId = 'pobj_' + this.related_game.map.pobjCounter++;
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
};

/***
* Specific objects
*/

/* Egress */
BFRL.worldPobjs.Egress = function(x,y,et) {
	BFRL.Pobj.call(this,x,y);
	this.isPassable = true;
	this.glyph = (et == BFRL.EGRESS_ENTRANCE) ? "<" : ">";
	this.glyph_color = "#111";
	this.display_name = (et == BFRL.EGRESS_ENTRANCE) ? "Up" : "Down";
};
BFRL.worldPobjs.Egress.extend(BFRL.Pobj);


/* GoldPile */
BFRL.worldPobjs.GoldPile = function(x,y,amount) {
	BFRL.Pobj.call(this,x,y);
	this.glyph = "*";
	this.glyph_color = "#ff0";
	this.display_name = "Pile of Gold";
	this.amount = amount;
	this.isPassable = true;
};
BFRL.worldPobjs.GoldPile.extend(BFRL.Pobj);
BFRL.worldPobjs.GoldPile.prototype.onPickup = function(pickerUpper) {
	pickerUpper._gold = Math.max(0,pickerUpper._gold);
	pickerUpper._gold += this.amount;
	window.publish("log_message",this,"Picked up " + this.amount + " gold");
	this.related_game.removePobj(this);
};

BFRL.worldPobjs.BlackFeather = function(x,y,factor) {
	BFRL.Pobj.call(this,x,y);
	this.glyph_color = "#dd0";
	this.glyph = "~";
	this.display_name = "Black Feather";
	this.isPassable = true;
};
BFRL.worldPobjs.BlackFeather.extend(BFRL.Pobj);
BFRL.worldPobjs.BlackFeather.prototype.onPickup = function(pickerUpper) {
	if (pickerUpper == this.related_game.player) {
		var msg = "YOU FOUND THE BLACK FEATHER!\nIs it all you'd hoped for?\nAnyway, you did what you came here to do.\nTake your " + 
			this.related_game.player._gold + " gold and get out of here.";
		BFRL.gui.showGameOver(msg);
		return;
	}
};

BFRL.worldPobjs.Mushroom = function(x,y,factor) {
	BFRL.Pobj.call(this,x,y);
	this.glyph_color = "#337";
	this.glyph = "^";
	this.display_name = "Mushroom";
	this.isPassable = true;
	this.power = factor;
};
BFRL.worldPobjs.Mushroom.extend(BFRL.Pobj);
BFRL.worldPobjs.Mushroom.prototype.onPickup = function(pickerUpper) {
	pickerUpper.hitpoints_max += Math.floor(this.power * 0.1);
	pickerUpper.gainHitpoints(this.power,"by eating a yummy mushroom");
	this.related_game.removePobj(this);
};

BFRL.worldPobjs.Tooth = function(x,y,factor) {
	BFRL.Pobj.call(this,x,y);
	this.glyph_color = "#fff";
	this.glyph = "=";
	this.display_name = "Tooth";
	this.isPassable = true;
};
BFRL.worldPobjs.Tooth.extend(BFRL.Pobj);
BFRL.worldPobjs.Tooth.prototype.onPickup = function(pickerUpper) {
	window.publish("log_message",this, pickerUpper.display_name + " found a tooth.");
	this.related_game.removePobj(this);
};
