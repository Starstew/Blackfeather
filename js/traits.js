/**
* Traits
* Capabilities of objects to do things, added through definitions
*/

BFRL.BeingTraits = {
	"ATK_DRAINLIFE" : {
		type: "ATK_DRAINLIFE",
		traitname: "Drain Life Attack",
		config: function(targetBeing, configObject) {
			// target being (one with the drainlife trait) subscribes to its own attacks, then takes damage and adds to own HP
			window.subscribe("atk_" + targetBeing.objectId, targetBeing.traits[this.type]);
			targetBeing.traits[this.type].handleMessage = function(msg,publisher,data) {
				BFRL.currentGame.addLogMessage(publisher._name + " drains life!");
				if (data['dmg'] && data['dmg'] > 1) {
					publisher.gainHitpoints(parseInt(data['dmg']));
				}
			}
		}
	}
}

BFRL.ObjectTraits = {
	// these as a separate set?
}