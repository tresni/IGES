var storage = chrome.storage.local;
var settings = null;

storage.get(["SteamGames", "SteamUser", "SteamWishlist"], function(s) {
    settings = s;
});

function getSomethingFromSteam(steamCallback, fullCallback) {
    if ("SteamUser" in settings && settings.SteamUser !== null) {
        console.log("Using username: " + settings.SteamUser);
        steamCallback(fullCallback);
    }
    else {
        console.log("Fetching username...");
        getSteamIdFromGala(function(){
            if (settings.SteamUser !== null) {
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
        "http://steamcommunity.com/id/" + settings.SteamUser + "/wishlist?xml=1" + "&cachebreaker=" + Math.random(),
        function(data) {
            games = [];
            $(".wishlistRow .gameLogo a[href^='http://steamcommunity.com/app/']", data).each(function() {
                games.push({
                    id: /\d+$/.exec($(this).attr("href"))[0],
                    name: $(this).closest(".wishlistRow").find("h4").text()
                });
            });
            console.log("Got a bunch of wishlist items", games.length);
            storage.set({SteamWishlist: games});
            callback({wishlist: games});
        }
    ).error(function() {
        callback({wishlist: []});
    });
}

function requestGamesFromSteam(callback) {
    console.log("Requesting games from Steam");
    $.get(
        "http://steamcommunity.com/id/" + settings.SteamUser + "/games?tab=all&xml=1" + "&cachebreaker=" + Math.random(),
        function(data) {
            games = [];
            $("game", data).each(function() {
                games.push({
                    id: $("appID", this).text(),
                    name: $("name", this).text()
                });
            });
            console.log("Got a bunch of games", games.length);
            storage.set({SteamGames: games});
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
                settings.SteamUser = null;
                storage.remove("SteamUser");
            } else {
                console.log("Steam user: " + user[1]);
                storage.set({SteamUser: user[1]});
                settings.SteamUser = user[1];
            }
            callback({user: settings.SteamUser});
        }
    ).error(function() {
        callback({user: null});
    });
}

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    if (request.method == "getGames") {
        if ("SteamGames" in settings) {
            console.log("Using cached games");
            sendResponse({games: settings.SteamGames});
        }
        else {
            getGamesFromSteam(sendResponse);
        }
    }
    if (request.method == "getSteamName") {
        if ("SteamUser" in settings) {
            console.log("Using cached username");
            sendResponse({user: settings.SteamUser});
        }
        else {
            getSteamIdFromGala(sendResponse);
        }
    }
    else if (request.method == "getWishlist") {
        if ("SteamWishlist" in settings) {
            console.log("Using cached wishlist");
            sendResponse({wishlist: settings.SteamWishlist});
        }
        else {
            getWishlistFromSteam(sendResponse);
        }
    }
    else if (request.method == "updateGames") {
        getGamesFromSteam(sendResponse);
    }
    else if(request.method == "updateWishlist") {
        getWishlistFromSteam(sendResponse);
    }
});