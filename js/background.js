function getSomethingFromSteam(steamCallback, fullCallback) {
    if (Settings.has("SteamUser")) {
        console.log("Using username: " + Settings.get('SteamUser'));
        steamCallback(fullCallback);
    }
    else {
        console.log("Fetching username...");
        getSteamIdFromGala(function(){
            if (Settings.get('SteamUser') !== null) {
                steamCallback(fullCallback);
            }
            else {
                fullCallback({});
            }
        });
    }
}

function getWishlistFromSteam(callback) {
    getSomethingFromSteam(requestWishlistFromSteam, callback);
}

function getGamesFromSteam(callback) {
    getSomethingFromSteam(requestGamesFromSteam, callback);
}

function requestWishlistFromSteam(callback) {
    console.log("Requesting wishlist from Steam");
    $.get(
        "http://steamcommunity.com/id/" + Settings.get('SteamUser') + "/wishlist?xml=1",
        function(data) {
            games = [];
            $(".wishlistRow .gameLogo a[href^='http://steamcommunity.com/app/']", data).each(function() {
                games.push({
                    id: /\d+$/.exec($(this).attr("href"))[0],
                    name: $(this).closest(".wishlistRow").find("h4").text()
                });
            });
            console.log("Got a bunch of wishlist items", games.length);
            Settings.set('SteamWishlist', games);
            callback({wishlist: games});
        }
    ).error(function() {
        callback({wishlist: []});
    });
}

function requestGamesFromSteam(callback) {
    console.log("Requesting games from Steam");
    $.get(
        "http://steamcommunity.com/id/" + Settings.get('SteamUser') + "/games?tab=all&xml=1",
        function(data) {
            games = [];
            $("game", data).each(function() {
                games.push({
                    id: $("appID", this).text(),
                    name: $("name", this).text()
                });
            });
            console.log("Got a bunch of games", games.length);
            Settings.set('SteamGames', games);
            callback({games: games});
        }
    ).error(function() {
        callback({games: []});
    });
}

function getSteamIdFromGala(callback) {
    $.get("http://www.galagiveaways.com/profile",
        function(data) {
            var user = /http:\/\/steamcommunity.com\/id\/([^\/]+)/.exec(data);
            if (user === null || user.length === 0) {
                console.log("no user :(");
                Settings.del('SteamUser');
            } else {
                console.log("Steam user: " + user[1]);
                Settings.set('SteamUser', user[1]);
            }
            callback({user: Settings.get('SteamUser')});
        }
    ).error(function() {
        callback({user: null});
    });
}

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    if (request.method == "getGames") {
        if (Settings.has('SteamGames')) {
            console.log("Using cached games");
            sendResponse({games: Settings.get('SteamGames')});
        }
        else {
            getGamesFromSteam(sendResponse);
        }
    }
    if (request.method == "getSteamName") {
        if (Settings.has('SteamUser')) {
            console.log("Using cached username");
            sendResponse({user: Settings.get('SteamUser')});
        }
        else {
            getSteamIdFromGala(sendResponse);
        }
    }
    else if (request.method == "getWishlist") {
        if (Settings.has('SteamWishlist')) {
            console.log("Using cached wishlist");
            sendResponse({wishlist: Settings.get('SteamWishlist')});
        }
        else {
            getWishlistFromSteam(sendResponse);
        }
    }
    else if (request.method == "getSettings") {
        sendResponse({'settings': Settings});
    }
    else if (request.method == "updateGames") {
        getGamesFromSteam(sendResponse);
    }
    else if(request.method == "updateWishlist") {
        getWishlistFromSteam(sendResponse);
    }
});