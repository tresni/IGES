var parser = new DOMParser();
var my_games_list = {};
var my_wishlist = {};
var my_steam_name = null;
var table = null;
var page = 1;

function getGames(callback, forceupdate) {
    chrome.extension.sendRequest({method: (forceupdate === true) ? "updateGames" : "getGames"}, function(settings) {
        games = settings.games;
        if ( games === undefined ) {
            games = {};
        }

        for (var i = 0; i < games.length; i++) {
            my_games_list[games[i].id] = true;
        }

        if (typeof callback == "function") {
            callback();
        }
    });
}

function getWishlist(callback, forceupdate) {
    chrome.extension.sendRequest({method: (forceupdate === true) ? "updateWishlist" : "getWishlist"}, function(settings) {
        wishlist = settings.wishlist;
        if (wishlist === undefined) {
            wishlist = {};
        }

        for (var i = 0; i < wishlist.length; i++) {
            my_wishlist[wishlist[i].id] = true;
        }

        if (typeof callback == "function") {
            callback();
        }
    });
}

function getUser(callback) {
    chrome.extension.sendRequest({method: "getSteamName"}, function(settings) {
        my_steam_name = settings.user;
        if (typeof callback == "function") {
            callback();
        }
    });
}

getUser(function() {
    getWishlist(function() {
        getGames(main);
    });
});

$("head").append('<link href="//netdna.bootstrapcdn.com/font-awesome/3.0/css/font-awesome.css" rel="stylesheet">');

function rearrangeTable(table, elements, desired_count, detach) {
    elements.each(function() {
        if (detach) {
            $(this).detach();
        }
        var row = $("> tbody > tr", table).filter(function() {
            return $(this).children("td").length < desired_count;
        }).first();

        if (row.length === 0) {
            row = $("<tr>").appendTo(table);
        }
        row.append($(this));
    });
}

function hasLinks(doc) {
    return $('a[href^="http://store.steampowered.com/app/"]').length > 0;
}

function cleanUp(doc) {
    var links = $('a[href^="http://store.steampowered.com/app/"]', doc);

    links.each(function(){
        id = /\d+/.exec($(this).attr("href"));
        if (id in my_games_list) {
           $(this).closest("td").remove();
        }
    });
}

function lineUp(doc) {
    var links = $('a[href^="http://store.steampowered.com/app/"]', doc);
    rearrangeTable(table, links.closest("td"), 4, true);
}

function showWishlist(doc) {
    var hilite = chrome.extension.getURL("wishlist.png");
    var links = $('a[href^="http://store.steampowered.com/app/"]', doc);
    links.each(function (){
        id = /\d+/.exec($(this).attr("href"));
        if (id in my_wishlist) {
            $("img", this).attr("src", hilite);
        }
    });
}

function quickView(content) {
    if ($("div.quickview.overlay").length === 0) {
        var div = $('<div>').appendTo("body").addClass("quickview overlay")
        .css({
            opacity: 0.4,
            backgroundColor: "black",
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 25
        }).click(function() {
            $(".quickview").remove();
        });
    }
    
    if ($("div.quickview.content").length === 0) {
        $("<div>").addClass("quickview content tabella-forum").appendTo("body").css({
            opacity: 1,
            position: "fixed",
            top: "50%",
            left: "50%",
            width: "297px",
            height: "136px",
            marginLeft: "-149px",
            marginTop: "-68px",
            textAlign: "center",
            zIndex: 100
        }).append($('<i class="icon-spinner icon-spin icon-4x"></i>'));
    }

    if (content !== undefined) {
        $("div.quickview.content").removeClass("tabella-forum").empty().append(content).css({
            width: $(content).width(),
            height: $(content).height(),
            marginLeft: -($(content).width() / 2),
            marginTop: -($(content).height() / 2)
        });
    }
}

function handleGiveawayForm(event) {
    $(this).find("button").attr("disabled", "disabled");
    $("#resp_message").remove();
    event.preventDefault();
    var form = event.target;
    $.post($(this).attr("action"), $(this).serialize(), function(data) {
        var resp = parser.parseFromString(data, "text/html");
        var respMsg = $("table ~ script", resp)[0].nextSibling.textContent;
        var div = $("<div id='resp_message'>").text(respMsg);
        
        if (/You entered this Giveaway/.exec(respMsg) ||
            /You left this Giveaway/.exec(respMsg)) {
            div.css("color", "green");
        }
        else {
            div.css("color", "red");
        }

        var newForm = $('table:has(form[action^="/enterGA"],form[action^="/leaveGA"]) form', resp);
        newForm.submit(handleGiveawayForm);
        $(form).after(div).replaceWith(newForm);
    });
}

function quickLook(data) {
    var doc = parser.parseFromString(data, "text/html");

    // Look for table with form (this means the giveaway is active)
    var _table = $('table:has(form[action^="/enterGA"],form[action^="/leaveGA"])', doc);
    if (_table.length !== 0) {
        $(_table).find("form").submit(handleGiveawayForm);
    }
    else {
        // Otherwise grab the info and the winner's list
        _table = $('table.tabella-forum:first, table.tabella-forum:last', doc);
        console.log(_table);
    }
    quickView(_table);
}

function quickEnter() {
    entry = $('a[href^="/GA/"]:has(b > u):not(.quick)').addClass('quick');

    $('<i class="icon-bolt"></i>').click(function(event) {
        event.preventDefault();
        quickView();
        $.get($(this).closest("a").attr("href"), quickLook);
    }).appendTo($("b", entry).append("&nbsp;"));
}

function nextPageCheck() {
    if (window.innerHeight + window.pageYOffset == document.height) {
        getNextPage();
    }
}

function cleanGameList(doc) {
    if (hasLinks(doc)) {
        cleanUp(doc);
        showWishlist(doc);
        // this needs to be the last line as it attachs stuff to the actual view
        lineUp(doc);
        quickEnter();
        window.onscroll = nextPageCheck;
        $('a[href^="http://store.steampowered.com/app/"]').attr("target", "_blank");
    }
}

function getNextPage() {
    window.onscroll = null;
    page += 1;
    td = $("<td class='spinner'>").css({
            verticalAlign: "middle",
            textAlign: "center"
        }).append($('<i class="icon-spinner icon-spin icon-4x"></i>'));
    rearrangeTable(table, td, 4, false);

    $.get("http://www.galagiveaways.com/home/" + page, function(data) {
        $('td.spinner').remove();
        cleanGameList(parser.parseFromString(data, "text/html"));
    });
}

function main() {
    var icon = $("<i class='icon-repeat'></i>").appendTo("body");

    icon.css({
        position: "fixed",
        top: $(window).innerHeight() - 21,
        left: $(window).innerWidth() - 21
    }).click(function(event){
        if ($(this).hasClass("icon-spin")) return;
        $(this).addClass('icon-spin');
        getGames(function() {
            getWishlist(function() {
                $(icon).removeClass('icon-spin');
                if (/^\/home/.test(window.location.pathname)) {
                    cleanGameList(document);
                }
            }, true);
        }, true);
    });

    $(window).resize(function() {
        icon.css({
            top: $(window).innerHeight() - 21,
            left: $(window).innerWidth() - 21
        });
    });

    $("<div id='iges_header'>").css({
        width: "100%",
        position: "fixed",
        backgroundImage: "url(http://1-ps.googleusercontent.com/x/s.galagive.appspot.com/www.galagiveaways.com/img/xslate.jpg.pagespeed.ic.K9-NSGsDLG.jpg)",
        top: 0,
        left: 0
    }).hide().appendTo("body");
    
    $(window).scroll(function(event) {
        if (window.pageYOffset >= 1) {
            $("div#iges_header").append($("table.header")).show();
        }
        else {
            $("table.header").prependTo("body");
            $("div#iges_header").hide();
        }
    });

    if (/^\/home/.test(window.location.pathname)) {
        // Store the table we are about to fuck up
        table = $('a[href^="http://store.steampowered.com/app/"]:last').closest("table");
        cleanGameList(document);
    }
    else if (/^\/games\/\d+/.test(window.location.pathname)) {
        quickEnter();
    }
    else if (/^\/profile/.test(window.location.pathname)) {
        var GA = $('a[href^="/GA/"]').closest("td");
        GA.filter(function() {
            return (/status: Lost/).test(this.innerText);
        }).css('opacity', 0.3).addClass('lost');//.detach();
        GA.filter(function() {
            return (/status: Won/).test(this.innerText);
        }).addClass('won');

        rearrangeTable(GA.filter(':not(.lost,.won)').closest("table"), GA.filter(':not(.lost,.won)'), 4, true);
        rearrangeTable(GA.filter('.lost').closest("table"), GA.filter('.lost'), 4, true);
        rearrangeTable(GA.filter('.won').closest("table"), GA.filter('.won'), 4, true);

        $('img', GA).click(function(event){
            event.preventDefault();
            quickView();
            $.get($(this).closest("a").attr("href"), quickLook);
        });
    }
    else if (/^\/topic\/[a-f0-9]+/.test(window.location.pathname)) {
        $('.tabella-forum:not(:first) tr:nth-child(2) td:last-child, .tabella-forum tr:nth-child(3) td:last')
            .each(function() {
                $(this).html($(this).html().replace(/(\S+:\/\/\S+)/g, "<u><a href='$1'>$1</a></u>"));
            });
    }
}