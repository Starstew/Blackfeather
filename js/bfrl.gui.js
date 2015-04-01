BFRL.gui = {
    msgLog: [],

    showAlert: function(alertText, x, y, w, delay, autoContinue) {
        BFRL.curGame.engine.lock();
        // draw block
        x = x || 2;
        y = y || 2;
        w = w || 24;
        delay = delay || 0;
        var dispops = BFRL.display.getOptions();
        var xmax = dispops.width;
        var ymax = dispops.height;
        x = (xmax - x < w) ? xmax - w : x;
        BFRL.display.drawText(x, y, alertText, 24);

        if (delay > 0) {
            window.removeEventListener("keydown", BFRL.curGame.player);
        }
        if (autoContinue === true) {
            setTimeout(function() {
                window.addEventListener("keydown", BFRL.curGame.player);
                BFRL.curGame.engine.unlock();
            }, delay);
        } else {
            setTimeout(function() {
                window.addEventListener("keydown", BFRL.gui);
            }, delay);
        }
    },

    showGameOver: function(msg) {
        BFRL.curGame.engine.lock();
        BFRL.display.clear();
        this.showAlert(msg, 5, 5, 50, 3000);
        this.isWaitingToRestart = true;
        return;
    },

    handleEvent: function(e) {
        BFRL.curGame.engine.unlock();
        if (this.isWaitingToRestart) {
            this.isWaitingToRestart = false;
            BFRL.startNewGame();
        } else {
            window.addEventListener("keydown", BFRL.curGame.player);
        }
        window.removeEventListener("keydown", this);
    },

    refreshUi: function() {
        this.refreshStatusDisplay();
        this.refreshFovDisplay();
        this.refreshLogDisplay();
    },

    clearLogDisplay: function() {
        document.getElementById('msg_display')
            .innerHTML = "";
    },

    refreshLogDisplay: function() {
        if (!BFRL.curGame.statusMsg.length > 0) {
            return;
        }
        this.msgLog.push(BFRL.curGame.statusMsg);
        BFRL.curGame.statusMsg = '';

        var log_excerpt = "";
        var dlog = this.msgLog.slice(-5);
        var len = Math.min(dlog.length, 5);
        dlog.reverse();
        for (var i = 0; i < len; i++) {
            if (i == 0) {
                log_excerpt += "<b>" + dlog[i] + "</b><br>";
            } else {
                log_excerpt += dlog[i] + "<br>";
            }
        }
        document.getElementById('msg_display')
            .innerHTML = log_excerpt;
    },

    refreshStatusDisplay: function() {
        var player = BFRL.curGame.player;
        var newhtml = "<span class='player_name'>" + player._name +
            " <div class='levelxp'><div class='leveltext'>Lvl. " + player._xpLevel + "</div><div class='xpbar'></div></div></span>";
        newhtml += "<span class='hitpoints'>[" + player._hitpoints + "/" + player._hitpointsMax + "]</span>";
        newhtml += "<span class='weapon'>Wielding: " + player.weapon._name + "</span>";
        newhtml += "<span class='gold'>" + player._gold + "GP</span>";
        newhtml += "<span class='depth'>Depth: " + BFRL.curGame.depth + "</span>";
        document.querySelector('#status_display').innerHTML = newhtml;

        //update xpbar
        $('.levelxp .xpbar').css('width', player._nextLevelProgress + "%");
    },

    refreshFovDisplay: function() {
        var player = BFRL.curGame.player;
        $('#fov_display').empty();
        var len = player.fovPobjs.length;
        var displayed = 0;
        for (var i = 0; i < len; i++) {
            var po = player.fovPobjs[i];
            if (po instanceof BFRL.Being == false) {
                continue;
            } // skip non-Beings for this UI
            var po_html = $("<div class='fov_item'><span>" + po._glyph + ":" + po._name + "</span></div>");
            $('#fov_display').append(po_html);
            po_html.css('background-image', 'url("imgs/' + po._img + '")');
            displayed++;
        }
        var imgwidth = Math.floor($('#fov_display')
            .innerWidth() / Math.max(2, displayed)) - 2;;
        $('#fov_display .fov_item').css('width', imgwidth + 'px');
    }
};
