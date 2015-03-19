// Blackfeather 7DRL 2015
// requires: rot.js, jquery

/* Game */
	var Game = {
		mapFloorColor: "#aa7",
		mapWallColor: "#553",
		mapFloorColorHidden: "#222",
		mapWallColorHidden: "#111",
		fovBase: 6,

		monsterTypes: [],

		DISP_NEUTRAL: 0,
		DISP_FRIENDLY: 1,
		DISP_AGGRESSIVE: 2,

		DMGTYPE_SLASH: 0,
		DMGTYPE_BLUNT: 1,
		DMGTYPE_PIERCE: 2,
		DMGTYPE_HEAT: 3,
		DMGTYPE_PSIONIC: 4,
		DMGTYPE_COLD: 5,
		DMGTYPE_POISON: 6,

		EGRESS_ENTRANCE: 0,
		EGRESS_EXIT: 1
	}

	Game.init = function() {
		// blank all state vars
		this.fovMapCells = [];
		this.seenMapCells = [];
		this._log = [];
		this.map = {};
		this.engine = null;
		this.display = null;
		this.player = null;
		this._scheduler = null;
		this._statusMsg = '';
		document.querySelector('#map_display').innerHTML = "";
		Game.clearLogDisplay();

		this.monsterTypes = [];
		this.parseMonsterManual();

		// set up the display
		this.display = new ROT.Display();
		this.display.setOptions({
			fontSize: 16
		});
		document.querySelector('#map_display').appendChild(this.display.getContainer());
		
		this._scheduler = new ROT.Scheduler.Simple();

		// go to first map
		this.depth = 0;
		this.delveDeeper();
		
	    this.engine = new ROT.Engine(this._scheduler);
	    this.engine.start();
	}

	Game._generateMap = function() {
		this.map = new Map();
		this.map._addEntranceAndExit();
	}

	Game.delveDeeper = function() {
		if (this.engine) {
			this.engine.lock();
		}
		this._scheduler.clear();
		this.seenMapCells = [];
		this.fovMapCells = [];

		// increment depth
		this.depth += 1;

		// create new map
		this._generateMap();

		// place player
		if (!this.player) {
			this.player = this.spawnAndPlaceBeing(Player, this.map.freeCells);
		} else {
			var index = Math.floor(ROT.RNG.getUniform() * this.map.freeCells.length);
		 	var key = this.map.freeCells.splice(index, 1)[0];
		 	var parts = key.split(",");
		 	var x = parseInt(parts[0]);
		 	var y = parseInt(parts[1]);
			this.player.relocate(x,y);
		}
		this.player.addToPobjList();
		var relo = [parseInt(this.map.entrance._x),parseInt(this.map.entrance._y)];
		this.player.relocate(relo[0],relo[1]);
		this._scheduler.add(this.player, true);
		
		// populate with items
		// populate with npcs
		this.populateMonsters(this.depth * 8);//var difficulty_quota = this.depth * 5;
		
		if (this.engine) {
			this.engine.start();
		}
	}

	Game.populateMonsters = function(difficulty_quota) {
		var maxTries = 1000;
		// keep adding monsters until quota is exceeded (or we reach 1000 tries)
		var diffcount = 0;
		for (var i = 0; i < maxTries; i++) {
			var mt = this.monsterTypes.random();
			var remaining = difficulty_quota - diffcount;
			var mt_diff = mt.prototype.definition.difficulty;
			if (mt_diff > (remaining*1.5)) {
				continue;
			}
			var mon = this.spawnAndPlaceBeing(mt,this.map.freeCells);
			this._scheduler.add(mon, true);
			diffcount += mon._difficulty;
			if (diffcount >= difficulty_quota) {
				break;
			} 
		}
	}

	Game.drawVisibleMap = function() {
		this.display.clear();
		for (var key in this.seenMapCells) {
			var parts = key.split(",");
			var x = parseInt(parts[0]);
			var y = parseInt(parts[1]);
			var fgcolor = "#fff";
			var bgcolor = (this.seenMapCells[key] == '' ? this.mapWallColorHidden : this.mapFloorColorHidden);
			this.display.draw(x,y,this.seenMapCells[key],fgcolor,bgcolor);
		}
		for (var key in this.fovMapCells) {
			var parts = key.split(",");
			var x = parseInt(parts[0]);
			var y = parseInt(parts[1]);
			var fgcolor = "#fff";
			var bgcolor = (this.fovMapCells[key] == '' ? this.mapWallColor : this.mapFloorColor);
			//this.display.draw(x,y,this.fovMapCells[key],fgcolor,bgcolor);
			this.display.draw(x,y,this.map.cells[key],fgcolor,bgcolor);

			// pobj on it?
			var pkey = x+","+y;
			if (this.map.pobjCells[pkey]) {
				var pobj = this.map.pobjCells[pkey][0];
				pobj._draw();
			}
		}
	}

	Game.spawnAndPlaceBeing = function(what, freeCells) {
	 	var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
	 	var key = freeCells.splice(index, 1)[0];
	 	var parts = key.split(",");
	 	var x = parseInt(parts[0]);
	 	var y = parseInt(parts[1]);
	 	return new what(x,y);
	}

	/* remove object from map and scheduler */
	Game.removePobj = function(pobj) {
		if (this._scheduler) {
			this._scheduler.remove(pobj);
		}
		for (var i in this.map.pobjList) {
			if (this.map.pobjList[i] == pobj) {
				this.map.pobjList.splice(i,1);
			}
		}
		this.map.updateObjectMap();
	}

	
	Game.getMoveResult = function(pobj,x,y) {
		var newKey = x + "," + y;
		var e_array = this.map.pobjCells[newKey];
		var ae = undefined;
		if (e_array && e_array.length > 0) {
			var len = e_array.length;
			for (var i = len - 1; i >= 0; i--) { // go in reverse to get "top" entity
				if (e_array[i]._isPassable == false) {
					ae = e_array[i];
					break;
				}
			}
		}
		
		if (ae) {
			return ({isOpen:false, bumpedEntity:ae});
		}
		
		if (!(newKey in Game.map.cells)) { 
			return({isOpen:false, bumpedEntity:null}); 
		}; // can't move to that coord
		
		return({isOpen:true});
	}

	Game.addLogMessage = function(msg) {
		if (this._statusMsg.length > 0) {
			this._statusMsg += "; ";
		}
		this._statusMsg += msg;
	}
	
	Game.clearLogDisplay = function() {
		document.getElementById('msg_display').innerHTML = "";
	}

	Game.refreshLogDisplay = function() {
		if (!this._statusMsg.length > 0) {
			return;
		}
		this._log.push(this._statusMsg);
		this._statusMsg = '';

		var log_excerpt = "";
		var dlog = this._log.slice(-5);
		var len = Math.min(dlog.length,5);
		dlog.reverse();
		for (var i = 0; i < len; i++) {
			if (i == 0) {
				log_excerpt += "<b>"+dlog[i]+"</b><br>";
			} else {
				log_excerpt += dlog[i] + "<br>";
			}
		}
		document.getElementById('msg_display').innerHTML = log_excerpt;
	}

	Game.refreshUi = function() {
		this.refreshStatusDisplay();
		this.refreshFovDisplay();
		this.refreshLogDisplay();
	}

	Game.refreshStatusDisplay = function() {
		var newhtml = "<span class='player_name'>" + this.player._name + " [Lvl. "+this.player._xpLevel+"]</span>";
		newhtml += "<span class='hitpoints'>[" + this.player._hitpoints + "/" + this.player._hitpointsMax + "]</span>";
		newhtml += "<span class='weapon'>Wielding: " + this.player.weapon._name + "</span>";
		newhtml += "<span class='gold'>" + this.player._gold + "GP</span>";
		newhtml += "<span class='depth'>Depth: " + this.depth + "</span>";
		document.querySelector('#status_display').innerHTML = newhtml;
	}

	Game.refreshFovDisplay = function() {
		$('#fov_display').empty();
		var len = this.player.fovPobjs.length;
		var displayed = 0;
		for (var i = 0; i < len; i++){
			var po = this.player.fovPobjs[i];
			if (po instanceof Being == false) { continue; } // skip non-Beings for this UI
			var po_html = $("<div class='fov_item'><span>" + po._glyph + ":" + po._name +"</span></div>");
			$('#fov_display').append(po_html);
			po_html.css('background-image','url("imgs/'+po._img+'")');
			displayed++;
		}
		var percent = Math.min(50,Math.floor(100/displayed))-3;
		$('#fov_display .fov_item').css('min-width',percent+'%').css('max-width',percent+'%');
	}

	Game.parseMonsterManual = function() {
		if (!MonsterManual) { return; }
		Game.monsterManual = {};

		for (var i in MonsterManual) {
			var is_valid = false;

			var mon = MonsterManual[i];

			Game.monsterManual[i] = new Function('x','y','Being.call(this,x,y);');
			Game.monsterManual[i].extend(Being);
			Game.monsterManual[i].prototype['definition'] = MonsterManual[i];
			Game.monsterTypes.push(Game.monsterManual[i]);
		}
	}

/* MonsterManual */
	var MonsterManual = {
		"Artist" : {
			"glyph":"a",
			"glyphColor":"#333",
			"species":"Artist",
			"hitpointsRange":[4,13],
			"difficulty":1,
			"fovFactor":1,
			"weaponPool": {
				"WeaponArbitrary" : [7,8,'HEAT','Thingy']
			},
			"lootPool": {
				"GoldPile": 10,
				"GoldPile": 30,
				"GoldPile": 2,
			},
			"img": "gu.jpg"
		},

		"Kobold" : {
			"glyph":"k",
			"glyphColor":"#330",
			"species":"Kobold",
			"hitpointsRange":[4,13],
			"difficulty":2,
			"fovFactor":1.2,
			"weaponPool": {
				"Sword": 3,
				"Club": 2,
				"Dagger":1
			},
			"lootPool": {
				"GoldPile": 10,
				"GoldPile": 20,
				"GoldPile": 2,
			},
			"img": "kobold.jpg"
		},

		"Orq" : {
			"glyph":"o",
			"glyphColor":"#330",
			"species":"Orq",
			"hitpointsRange":[25,45],
			"difficulty":6,
			"fovFactor":1,
			"weaponPool": {
				"Sword": 3,
				"Club": 2,
				"Dagger":1
			},
			"lootPool": {
				"GoldPile": 20,
				"GoldPile": 50,
				"GoldPile": 5
			},
			"img": "orq.jpg"
		},

		"Halfling" : {
			"glyph":"h",
			"glyphColor":"#151",
			"species":"Hipster Halfling",
			"hitpointsRange":[11,30],
			"difficulty":4,
			"fovFactor":1.5,
			"weaponPool": {
				"Club": 2,
				"Dagger":1
			},
			"lootPool": {
				"GoldPile": 10,
				"GoldPile": 20,
				"Mushroom": 5
			},
			"img": "halfling.jpg"
		},

		"Bob" : {
			"glyph":"b",
			"glyphColor":"#005",
			"species":"Bob",
			"hitpointsRange":[12,36],
			"difficulty":8,
			"fovFactor":2,
			"weaponPool": {
				"Club": 2,
				"WeaponArbitrary" : [6,18,'BLUNT','Baudy Puppet']
			},
			"lootPool": {
				"GoldPile": 10,
				"GoldPile": 20,
				"Mushroom": 5
			},
			"img": "bob.jpg"
		},

		"Goblin" : {
			"glyph":"g",
			"glyphColor":"#050",
			"species":"Goblin",
			"hitpointsRange":[5,30],
			"difficulty":4,
			"fovFactor":2,
			"weaponPool": {
				"Club": 2,
				"Dagger":1,
			},
			"lootPool": {
				"GoldPile": 10,
				"GoldPile": 20,
				"GoldPile": 5,
				"Mushroom": 5
			},
			"img": "goblin.jpg"
		},

		"TreeGnome" : {
			"glyph":"t",
			"glyphColor":"#555",
			"species":"Tree Gnome",
			"hitpointsRange":[10,40],
			"difficulty":10,
			"fovFactor":1.2,
			"weaponPool": {
				"Club": 2,
				"Dagger":1,
				"Sword":1
			},
			"lootPool": {
				"GoldPile": 10,
				"Mushroom": 20
			},
			"img": "gnome.jpg"
		},

		"Minotaur" : {
			"glyph":"m",
			"glyphColor":"#444",
			"species":"Minotaur",
			"hitpointsRange":[30,60],
			"difficulty":20,
			"fovFactor":3,
			"weaponPool": {
				"WeaponArbitrary" : [12,30,'SLASH','Axe'],
				"WeaponArbitrary" : [15,25,'PIERCE','Horny Gore']
			},
			"lootPool": {
				"GoldPile": 50,
				"GoldPile": 150,
				"GoldPile": 70,
				"Mushroom": 10
			},
			"img": "minotaur.jpg"
		},

		"Grell" : {
			"glyph":"G",
			"glyphColor":"#000",
			"species":"Grell",
			"hitpointsRange":[80,120],
			"difficulty":70,
			"fovFactor":3,
			"weaponPool": {
				"WeaponArbitrary" : [22,60,'HEAT','Thwippy Tentacle']
			},
			"lootPool": {
				"GoldPile": 40,
				"GoldPile": 80,
				"GoldPile": 120,
				"Mushroom": 100,
				"BlackFeather": 1
			},
			"img": "grell.jpg"
		},

		"Cyclops" : {
			"glyph":"C",
			"glyphColor":"#922",
			"species":"Cyclops",
			"hitpointsRange":[45,75],
			"difficulty":40,
			"fovFactor":5,
			"weaponPool": {
				"WeaponArbitrary" : [22,60,'HEAT','Gaze']
			},
			"lootPool": {
				"GoldPile": 100,
				"Mushroom": 50
			},
			"img": "cyclops.jpg"
		},

		"Demon" : {
			"glyph":"D",
			"glyphColor":"#922",
			"species":"Demon",
			"hitpointsRange":[60,100],
			"difficulty":55,
			"fovFactor":4,
			"weaponPool": {
				"WeaponArbitrary" : [35,75,'HEAT','Hellstank']
			},
			"lootPool": {
				"GoldPile": 100,
				"Mushroom": 50
			},
			"img": "demon.jpg"
		}
	}
