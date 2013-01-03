chrome.extension.sendRequest({method: "getGames"}, main);
var my_games_list = {};
var table = null;
var page = 1;

function findTable() {
    return jQuery('a[href^="http://store.steampowered.com/app/"]:last').closest("table");
}

function cleanUp(doc) {
    var links = $('a[href^="http://store.steampowered.com/app/"]:not(.clean)', doc);

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
    $.get("http://www.galagiveaways.com/home/" + page, function(data) {
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
        table = $('a[href^="http://store.steampowered.com/app/"]:last').closest("table");
        cleanUp(document);
        lineUp(document);

        window.onscroll = function() {
            if (window.innerHeight + window.pageYOffset == document.height) {
                getNextPage();
            }
        };
    }
}