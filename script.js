var parser = new DOMParser();
var my_games_list = {};
var my_wishlist = {};
var my_steam_name = null;
var table = null;
var page = 1;
var shouldScroll = true;

var GamesWithMultipleIds = {
    '39530': 'Painkiller: Black Edition',
    '3200': 'Painkiller: Black Edition',
    'Painkiller: Black Edition': [39530, 3200]
};

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


function getLinks(doc) {
    return $('td:not(.tabella-features1, tabella-features2) > a[href^="/GA/"]:has(img)', doc);
}

function getIdFromLink(elem) {
    td = $(elem).closest("td");
    var match = (/(?:apps|subs)\/(\d+)/).exec(td.attr("style"));
    return match[1];
}


function hasLinks(doc) {
    return getLinks(doc).length > 0;
}

function cleanUp(doc) {
    var links = getLinks(doc);

    links.each(function(){
        if (getIdFromLink(this) in my_games_list) {
            $(this).closest("td").remove();
        }
        if (getIdFromLink(this) in GamesWithMultipleIds) {
            game_ids = GamesWithMultipleIds[GamesWithMultipleIds[getIdFromLink(this)]];
            for (var x in game_ids) {
                if (game_ids[x] in my_games_list) {
                    $(this).closest("td").remove();
                }
            }
        }
    });
}

function lineUp(doc) {
    var links = getLinks(doc);
    rearrangeTable(table, links.closest("td"), 4, true);
}

function showWishlist(doc) {
    var hilite = chrome.extension.getURL("wishlist.png");
    var links = getLinks(doc);

    links.each(function (){
        if (getIdFromLink(this) in my_wishlist) {
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
    
    if ($("div.quickview.waiting").length === 0) {
        $("<div>").addClass("quickview waiting tabella-forum").appendTo("body").css({
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
        }).append($('<i class="icon-spinner icon-spin icon-4x"></i>')).hide();
    }

    if ($("div.quickview.content").length === 0) {
        $("<div>").addClass("quickview content").appendTo("body").css({
            opacity: 1,
            position: "fixed",
            top: "50%",
            left: "50%",
            textAlign: "center",
            zIndex: 100
        }).hide();
    }

    $("div.quickview.overlay").show();
    if (content !== undefined) {
        handleSteamLinks(content);
        $("div.quickview.waiting").hide();
        $("div.quickview.content").show().empty().append(content).css({
            width: $(content).width(),
            height: $(content).height(),
            marginLeft: -($(content).width() / 2),
            marginTop: -($(content).height() / 2)
        });
    } else {
        $("div.quickview.waiting").show();
        $("div.quickview.content").hide();
    }
}

function handleSteamLinks(doc) {
    $('a[href^="http://store.steampowered.com/app/"]', doc).attr("target", "_blank");
}

function cleanHeader(doc) {
    var table = $("table.header", doc);

    // Remove Privacy Policy link?
    //table.find("td:nth-child(10)").remove();

    // Remove the text around points, we know what they are
    var points = table.find("td:eq(8)");
    var match = /([0-9,]+)/.exec(points.text());
    points.text(match[1]);

    // Remove Profile entry, we'll make the user image link to profile
    var cell = table.find("td:nth-child(5)");
    var link = cell.find("a").text("");
    cell.remove();
    
    // Move Logout to the end
    table.find("td:nth-child(6)").detach().appendTo(table.find("tr")).find("a").text("Logout");

    // Add Create GA link under points
    cell = table.find("td:nth-child(5)");
    var ga = cell.find("a");
    cell.remove();

    // Move profile image/points to the front
    table.find("td:nth-child(5), td:nth-child(6)").detach().prependTo(table.find("tr"))
        .filter(':last').append("<br>").append(ga).end() // Add create GA link under points
        .filter(':first').css("width", 32).find('img').wrap(link); // Link image to profile
}

function updateHeader(doc) {
    // Updated the table basedon changes in the table.
    cleanHeader(doc);
    $('table.header').replaceWith($('table.header', doc)).find("tr:last").remove();
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

        updateHeader(resp);
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
        if ($(_table).length === 0) {
            _table = $('a[href^="/GA/"]', doc).closest('table:not(.riga3,.riga)').addClass("tabella-forum").css({
                padding: 5
            });
            if ($(_table).length !== 0) {
                quickEnter(_table);
            }
        }
    }
    quickView(_table);
}

function quickEnter(doc) {
    entry = $('a[href^="/GA/"]:has(b > u):not(.quick)', doc).addClass('quick');

    td = $("<td>").css({
        textAlign: "center"
    }).appendTo($(entry).closest("tr").prev("tr"));

    $('<i class="icon-info-sign"></i>').click(function(event) {
        event.preventDefault();
        window.open("http://store.steampowered.com/app/" + getIdFromLink($(this).closest(".riga")));
    }).append("&nbsp;").appendTo(td);

    $('<i class="icon-search"></i>').click(function(){
        event.preventDefault();
        quickView();
        $.get("http://www.galagiveaways.com/games/" + getIdFromLink($(this).closest(".riga")), quickLook);
    }).append("&nbsp;").appendTo(td);

    $('<i class="icon-bolt"></i>').click(function(event) {
        event.preventDefault();
        quickView();
        $.get($(this).closest("tr").next("tr").find("a").attr("href"), quickLook);
    }).appendTo(td);
}

function cleanGameList(doc) {
    if (hasLinks(doc)) {
        cleanUp(doc);
        showWishlist(doc);
        handleSteamLinks(doc);
        quickEnter(doc);
        // this needs to be the last line as it attachs stuff to the actual view
        lineUp(doc);
        shouldScroll = true;
    }
}

function getNextPage() {
    page += 1;
    shouldScroll = false;
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

    cleanHeader(document);
    
    $(window).scroll(function(event) {
        if (window.pageYOffset >= 1) {
            $("div#iges_header").append($("table.header")).show();
        }
        else {
            $("table.header").prependTo("body");
            $("div#iges_header").hide();
        }

        if (window.innerHeight + window.pageYOffset >= (document.height - $("table:last").height()) && shouldScroll) {
            getNextPage();
        }
    });

    if (/^\/home/.test(window.location.pathname)) {
        // Store the table we are about to fuck up
        table = getLinks(document).closest("table");
        cleanGameList(document);
    }
    else if (/^\/games\/\d+/.test(window.location.pathname)) {
        quickEnter(document);
    }
    else if (/^\/profile/.test(window.location.pathname)) {
        $('a[href^="/GA/"] img').click(function(event){
            event.preventDefault();
            quickView();
            $.get($(this).closest("a").attr("href"), quickLook);
        });
    }
    else if (/^\/topic\/[a-f0-9]+/.test(window.location.pathname)) {
    }
}