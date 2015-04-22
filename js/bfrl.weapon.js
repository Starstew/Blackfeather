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

	this.setWeaponType(def.weaponType); // sets damageType and attackMode
	this.damageRange = def.damageRange;
	this.range = (def.range ? def.range : 1); // 1 == melee

	this.glyph = def.glyph;
	this.display_name = def.label;
};
BFRL.Weapon.extend(BFRL.Pobj);

/* setWeaponType
*  Keys on weapon type to set damageType and attackMode
*/
BFRL.Weapon.prototype.setWeaponType = function(wt) {
	this.weaponType = wt;
	switch(wt) {
		case BFRL.WEAPONTYPE_SWORD:
			this.damageType = BFRL.DMGTYPE_SLASH;
			break;
		case BFRL.WEAPONTYPE_CLUB:
		case BFRL.WEAPONTYPE_STAFF:
			this.damageType = BFRL.DMGTYPE_BLUNT;
			break;
		case BFRL.WEAPONTYPE_BOW:
			this.damageType = BFRL.DMGTYPE_NONE; // doesn't do damage itself
			break;
		case BFRL.WEAPONTYPE_ARROW:
			this.damageType = BFRL.DMGTYPE_PIERCE;
			break;
	}

	// flag it as ranged, melee, or ammo
	switch(wt) {
		case BFRL.WEAPONTYPE_BOW:
			this.attackMode = BFRL.ATTACKMODE_RANGED;
			break;
		case BFRL.WEAPONTYPE_ARROW:
			this.attackMode = BFRL.ATTACKMODE_AMMO;
			break;
		default:
			this.attackMode = BFRL.ATTACKMODE_MELEE;
			break;
	}
};

BFRL.Weapon.prototype.inflictDamage = function(targetPobj, wielder) {
	var dmg = Math.floor((ROT.RNG.getUniform() * (this.damageRange[1] - this.damageRange[0])) + this.damageRange[0]);
	window.publish("atk_" + this.objectId, this, {'dmg':dmg,'wielder':wielder});
	return dmg; 
};

/* Arbitrary - to be used for monsters' natural weaponry (claws, pokers, thwippy tentacles) */
BFRL.WeaponArbitrary = function(dmgMin,dmgMax,dmgType,wpName) {
	// for when we just want to give a monster or something an innate weapon
	this.damageType = dmgType;
	this.damageRange = [dmgMin,dmgMax];
	this.display_name = wpName;
};
BFRL.WeaponArbitrary.prototype.inflictDamage = BFRL.Weapon.prototype.inflictDamage;
