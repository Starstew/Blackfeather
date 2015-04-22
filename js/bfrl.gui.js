BFRL.gui = {
    message_log: [],

    showAlert: function(alertText, x, y, w, delay, autoContinue) {
        BFRL.current_game.engine.lock();
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
            window.removeEventListener("keydown", BFRL);
        }
        if (autoContinue === true) {
            setTimeout(function() {
                window.addEventListener("keydown", BFRL);
                BFRL.current_game.engine.unlock();
            }, delay);
        } else {
            setTimeout(function() {
                window.addEventListener("keydown", BFRL.gui);
            }, delay);
        }
    },

    handleEvent: function(e) {
        BFRL.current_game.engine.unlock();
        if (this.isWaitingToRestart) {
            this.isWaitingToRestart = false;
            BFRL.startNewGame();
        } else {
            window.addEventListener("keydown", BFRL);
        }
        window.removeEventListener("keydown", this);
    },

    refreshUi: function() {
        this.refreshStatusDisplay();
        this.refreshFovDisplay();
        this.refreshLogDisplay();
    },

    clearLogDisplay: function() {
        document.getElementById('msg_display').innerHTML = "";
    },

    refreshLogDisplay: function() {
        if (BFRL.current_game.status_message.length <= 0) {
            return;
        }
        this.message_log.push(BFRL.current_game.status_message);
        BFRL.current_game.status_message = '';

        var log_excerpt = "";
        var dlog = this.message_log.slice(-5);
        var len = Math.min(dlog.length, 5);
        dlog.reverse();
        for (var i = 0; i < len; i++) {
            if (i === 0) {
                log_excerpt += "<b>" + dlog[i] + "</b><br>";
            } else {
                log_excerpt += dlog[i] + "<br>";
            }
        }
        document.getElementById('msg_display').innerHTML = log_excerpt;
    },

    refreshStatusDisplay: function() {
        var player = BFRL.current_game.player;
        var new_html = "<span class='player_name'>" + player.display_name + "</span>";
        new_html += "<span class='hitpoints'>[" + player.hitpoints + "/" + player.hitpoints_max + "]</span>";
        new_html += "<span class='weapon'>Wielding: " + player.weapon.display_name + "</span>";
        new_html += "<span class='gold'>" + player.gold_pieces + "GP</span>";
        new_html += "<span class='depth'>Depth: " + BFRL.current_game.depth + "</span>";
        document.querySelector('#status_display').innerHTML = new_html;
    },

    refreshFovDisplay: function() {
        var player = BFRL.current_game.player;
        $('#fov_display').empty();
        var len = player.fov_pobjs.length;
        var displayed = 0;
        for (var i = 0; i < len; i++) {
            var po = player.fov_pobjs[i];
            if (po instanceof BFRL.Being === false) {
                continue;
            } // skip non-Beings for this UI
            var po_html = $("<div class='fov_item'><span>" + po.glyph + ":" + po.display_name + "</span></div>");
            $('#fov_display').append(po_html);
            po_html.css('background-image', 'url("imgs/' + po.display_image_file + '")');
            displayed++;
        }
        var imgwidth = Math.floor($('#fov_display')
            .innerWidth() / Math.max(2, displayed)) - 2;
        $('#fov_display .fov_item').css('width', imgwidth + 'px');
    }
};
