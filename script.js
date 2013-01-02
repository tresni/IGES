chrome.extension.sendRequest({method: "getGames"}, main);
var my_games_list = {};
var table = null;
var page = 1;

(function(DOMParser) {
    "use strict";

    var DOMParser_proto = DOMParser.prototype,
        real_parseFromString = DOMParser_proto.parseFromString;

    // Firefox/Opera/IE throw errors on unsupported types
    try {
        // WebKit returns null on unsupported types
        if ((new DOMParser()).parseFromString("", "text/html")) {
            // text/html parsing is natively supported
            return;
        }
    } catch (ex) {}

    DOMParser_proto.parseFromString = function(markup, type) {
        if (/^\s*text\/html\s*(?:;|$)/i.test(type)) {
            var
              doc = document.implementation.createHTMLDocument("")
            ;

            doc.body.innerHTML = markup;
            return doc;
        } else {
            return real_parseFromString.apply(this, arguments);
        }
    };
}(DOMParser));

function findTable() {
    return jQuery('a[href^="http://store.steampowered.com/app/"]:last').closest("table");
}

function cleanUp(doc) {
    var links = jQuery('a[href^="http://store.steampowered.com/app/"]:not(.clean)', doc);

    links.each(function(){
        id = /\d+/.exec($(this).attr("href"));
        if (id in my_games_list) {
           $(this).closest("td").remove();
        }
    });
}

function lineUp(doc) {
    links = jQuery('a[href^="http://store.steampowered.com/app/"]', doc);
    links.closest("td:not(.clean)").each(function() {
        $(this).detach();
        var row = $("> tbody > tr", table).filter(function() {
            return $(this).children("td").length < 4;
        }).first();

        if (row.length === 0) {
            row = $("<tr>").appendTo(table);
        }

        row.append($(this));
        $(this).addClass("clean");
    }).addClass("clean");
}

function getNextPage() {
    page += 1;
    console.log("Getting page " + page);
    jQuery.get("http://www.galagiveaways.com/home/" + page, function(data) {
        console.log("Retrived " + this);
        var parser = new DOMParser();
        var doc = parser.parseFromString(data, "text/html");
        cleanUp(doc);
        lineUp(doc);
    });
}

function main(settings) {
    games = settings.games;
    if ( games === undefined ) {
        games = {};
    }

    for (var i = 0; i < games.length; i++) {
        my_games_list[games[i].id] = true;
    }

    if (/^\/home/.test(window.location.pathname)) {
        // Store the table we are about to fuck up
        table = findTable();
        cleanUp(document);
        lineUp(document);

        window.onscroll = function() {
            if (window.innerHeight + window.pageYOffset == document.height) {
                getNextPage();
            }
        };
    }
}