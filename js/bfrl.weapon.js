/* Weapon */
BFRL.Weapon = function(x,y) {
	BFRL.Pobj.call(this,x,y);

	var def = this.definition;
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

	this.damageType = def.damageType;
	this.damageRange = def.damageRange;
	this._glyph = def.glyph;
	this._name = def.label;
	this.range = (def.range ? def.range : 1); // 1 == melee
}
BFRL.Weapon.extend(BFRL.Pobj);
BFRL.Weapon.prototype.inflictDamage = function(targetPobj, wielder) {
	var dmg = Math.floor((ROT.RNG.getUniform() * (this.damageRange[1] - this.damageRange[0])) + this.damageRange[0]);
	if (wielder._xpLevel) {
		dmg += wielder._xpLevel * 2;
	}
	window.publish("atk_" + this.objectId, this, {'dmg':dmg,'wielder':wielder});
	return dmg; 
}

/* Arbitrary - to be used for monsters' natural weaponry (claws, pokers, thwippy tentacles) */
BFRL.WeaponArbitrary = function(dmgMin,dmgMax,dmgType,wpName) {
	// for when we just want to give a monster or something an innate weapon
	this.damageType = dmgType;
	this.damageRange = [dmgMin,dmgMax];
	this._name = wpName;
}
BFRL.WeaponArbitrary.prototype.inflictDamage = BFRL.Weapon.prototype.inflictDamage;
