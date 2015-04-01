/* Map  */
	BFRL.Map = function() {
		this.cells = [];
		this.freeCells = [];
		this.pobjCells = [];
		this.pobjList = [];
		this.pobjCounter = 0;

		this.entrance = '';
		this.exit = '';

		this._generateCells();
	}

	BFRL.Map.prototype = {
		_generateCells : function() {
			var digger = new ROT.Map.Uniform();
			digger.create(this._digCallback.bind(this));
		},

		_generateCaCells : function() {
			var camap = new ROT.Map.Cellular();

			/* cells with 1/2 probability */
			camap.randomize(0.9);
			/* generate and show four generations */
			for (var i=0; i<2; i++) {
			    camap.create(this._digCallback.bind(this));
			}
		},

		_digCallback : function (x, y, value) {
			if (value) { return; }
			var key = x+","+y;
			this.freeCells.push(key);
			this.cells[key] = ".";
		},

		updateObjectMap: function() {
			this.pobjCells = {};
			for (var i = 0; i < this.pobjList.length; i++) {
				var po = this.pobjList[i];
				var pkey = po._x + "," + po._y;
				this.pobjCells[pkey] = this.pobjCells[pkey] || [];
				this.pobjCells[pkey].push(po);
			}
		},

		getObjectById: function(id) {
			var len = this.pobjList.length;
			for (var i=0; i<len; i++) {
				if (this.pobjList[i].objectId == id) {
					return this.pobjList[i];
				}
			}
			return undefined;
		},

		/**
		* getObjectsAtLoc
		* ... specifically excluding (optionally) certain obj
		*/
		getObjectsAtLoc: function(x,y,exclude_po) {
			var pobjs = [];
			var xy = x+","+y;
			if (this.pobjCells && this.pobjCells[xy]) {
				var len = this.pobjCells[xy].length;
				if (exclude_po) {
					for (var i = 0; i < len; i++) {
						if (this.pobjCells[xy][i] != exclude_po) {
							pobjs.push(this.pobjCells[xy][i]); // TODO put Beings on top, or sort by 'zlayer' of some kind
						}
					}
				} else {
					pobjs = this.pobjCells[xy];
				}
			}
			return pobjs;
		},

		getPath: function(fx,fy,tx,ty,topo,ignoreIsPassable) {
			topo = (topo) ? topo : 8; // default to 8

			var passableCallback = function(x,y) {
				var xy_key = x+","+y;
				var map = BFRL.curGame.map;
				var canPass = (xy_key in map.cells); // is an actual map location
				
				if (canPass == true && map.pobjCells && map.pobjCells[xy_key]) { // can pass over all objects in that space
					for(var i in map.pobjCells[xy_key]) {
						var testpobj = map.pobjCells[xy_key][i];
						if (ignoreIsPassable != true) {
							if (testpobj.isPassable == false && (xy_key != fx +","+fy)) {
								canPass = false;
								break;
							}
						}
					}
				}
				return canPass;
			}

			var astar = new ROT.Path.AStar(tx,ty,passableCallback,{topology:topo});
			path = [];
			var pathCallback = function(x,y) {
				path.push([x,y]);
			}
			astar.compute(fx,fy,pathCallback);
			path.shift(); // remove starting point
			return path;
		},

		/**
		* showLineofSite
		* fxy - From X,Y [x,y]
		* txy - To X,Y [x,y]
		*/
		showLineOfSight: function(fxy,txy,range) {
			var range = range || 12;
			var isInFov = false;

			// check if in FOV
			this.fovMapCells = [];
			var lightPasses = function(x, y) {
				var key = x+","+y;
				if (key in BFRL.curGame.map.cells) { // is part of the map
					return (BFRL.curGame.map.cells[key].length > 0);
				}
				return false;
			}
			var fov = new ROT.FOV.RecursiveShadowcasting(lightPasses);
			var fov_cells = {};
			fov.compute(fxy[0], fxy[1], range, function(x, y, r, visibility) {
				var key = x+","+y;
				fov_cells[key] = BFRL.curGame.map.cells[key];
			 	if (key == txy) {
			 		isInFov = true;
			 	}
			});

			// create path
			if (isInFov == true) {
				var path = this.getPath(fxy[0],fxy[1],txy[0],txy[1],8,true);
				var len = path.length;
				for (var i = 0; i < len; i++) {
					var pxy = path[i][0] + "," + path[i][1];
					var glyph = ".";
					if (this.pobjCells && this.pobjCells[pxy]) {
						glyph = (this.pobjCells[pxy][0]._glyph || "*");
					}
					BFRL.display.draw(path[i][0], path[i][1], glyph, '#ff0', '#000');
				}
			}
		},

		_addEntranceAndExit: function() {
			// get list of walls
			var width = BFRL.display.getOptions().width;
			var height = BFRL.display.getOptions().height;
			var walls = [];
			var walls_for_egress = [];
			for (var w = 0; w < width; w++) {
				for (var h = 0; h < height; h++) {
					var cell = this.cells[w+","+h];
					if (cell == undefined) { // if nothing there
						// check for map spaces adjacent
						var up = Math.max(h-1,0);
						var rt = Math.min(w+1,width);
						var dn = Math.min(h+1,height);
						var lt = Math.max(w-1,0);

						var nw = [lt,up].join(",");
						var no = [w,up].join(",");
						var ne = [rt,up].join(",");
						var we = [lt,h].join(",");
						var ea = [rt,h].join(",");
						var sw = [lt,dn].join(",");
						var so = [w,dn].join(",");
						var se = [rt,dn].join(",");
						
						// want to match only one open side
						var matchcount = 0;
						var egresscount = 0;
						egresscount += (this.cells[nw]) ? 1 : 0;
						matchcount += (this.cells[no]) ? 1 : 0;
						egresscount += (this.cells[ne]) ? 1 : 0;
						matchcount += (this.cells[we]) ? 1 : 0;
						matchcount += (this.cells[ea]) ? 1 : 0;
						egresscount += (this.cells[sw]) ? 1 : 0;
						matchcount += (this.cells[so]) ? 1 : 0;
						egresscount += (this.cells[se]) ? 1 : 0;

						if (matchcount == 1) {
							walls.push(w+","+h);
							if (egresscount == 1) {
								walls_for_egress.push(w+","+h);
							}
						}
					}
				}
			}
			// place entrance randomly
			if (walls_for_egress.length < 1) { walls_for_egress = walls; } // just in case no egressy walls available
			var index = Math.floor(ROT.RNG.getUniform() * walls_for_egress.length);
	 		var key = walls_for_egress.splice(index, 1)[0];
	 		
	 		var xy = key.split(",");
			this.entrance = new BFRL.worldPobjs.Egress(xy[0],xy[1], BFRL.EGRESS_ENTRANCE);
			this.cells[key] = "<";

			// place exit randomly, but at minimum path-length from entrance
			var index = Math.floor(ROT.RNG.getUniform() * walls.length);
	 		var key = walls.splice(index, 1)[0];
	 		var xy = key.split(",");
			this.exit = new BFRL.worldPobjs.Egress(xy[0],xy[1], BFRL.EGRESS_EXIT);
			this.cells[key] = ">";
		}
	}
