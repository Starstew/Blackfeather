/* Weapon */
var Weapon = function(x,y,notObj) {
	if (notObj != true) {
		Pobj.call(this,x,y); // only make a proper object out of it if needed
	}
	//this.damageType = Game.DMGTYPE_SLASH;
	//this.damageRange = [1,10];
}
Weapon.extend(Pobj);
Weapon.prototype.inflictDamage = function(targetPobj,wielder) {
	var dmg = Math.floor((ROT.RNG.getUniform() * (this.damageRange[1] - this.damageRange[0])) + this.damageRange[0]);
	if (wielder._xpLevel) {
		dmg += wielder._xpLevel * 2;
	}
	if (targetPobj.receiveDamage) {
		targetPobj.receiveDamage(dmg,this.damageType,wielder);
	}
}

/* Sword */
var Sword = function(x,y,notObj) {
	Weapon.call(this,x,y,notObj);
	this.damageType = Game.DMGTYPE_SLASH;
	this.damageRange = [6,12];
	this._glyph = "/";
	this._name = "Sword";
}
Sword.extend(Weapon);

/* Dagger */
var Dagger = function(x,y,notObj) {
	Weapon.call(this,x,y,notObj);
	this.damageType = Game.DMGTYPE_SLASH;
	this.damageRange = [2,8];
	this._glyph = "'";
	this._name = "Dagger";
}
Dagger.extend(Weapon);

/* Club */
var Club = function(x,y,notObj) {
	Weapon.call(this,x,y,notObj);
	this.damageType = Game.DMGTYPE_BLUNT;
	this.damageRange = [1,6];
	this._name = "Club";
}
Club.extend(Weapon);

/* Arbitrary (innate/hand-to-hand) */
var WeaponArbitrary = function(dmgMin,dmgMax,dmgType,wpName) {
	// for when we just want to give a monster or something an innate weapon
	this.damageType = dmgType;
	this.damageRange = [dmgMin,dmgMax];
	this._name = wpName;
}
WeaponArbitrary.prototype.inflictDamage = Weapon.prototype.inflictDamage;


/* Armory (weapon data) */