/**
* Traits
* Capabilities of objects to do things, added through definitions
*/

BFRL.Traits = {
	"ATK_DRAINLIFE" : {
		type: "ATK_DRAINLIFE",
		config: function(targetObj, configObject) {
			window.subscribe("atk_" + targetObj.objectId, targetObj.traits[this.type]);

			/** 
			* data == {dmg:[int],wielder:[Being]}
			*/
			targetObj.traits[this.type].handleMessage = function(msg, publisher, data) {
				var dmg = parseInt(data['dmg']);
				var wielder = data['wielder'];
				if (wielder instanceof BFRL.Being) {
					var actual_gain = Math.min(dmg, wielder._hitPointsMax - dmg);
					wielder.gainHitpoints(dmg,"by Drain Life");
				}
			}
		}
	}
}