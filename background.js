var storage = chrome.storage.local;
var settings = null;
var init = false;

storage.get(["SteamGames", "SteamUser"], function(s) {
    settings = s;
});

function makeRequest(url, method, callback) {
    var req = new XMLHttpRequest();
    req.onreadystatechange = callback;
    req.open(method, url, true);
    req.send(null);
}

function getSteamIdFromGala(callback) {
    makeRequest("http://www.galagiveaways.com/profile", "GET",
        function() {
            if (this.readyState == 4 && this.status == 200) {
                var user = /http:\/\/steamcommunity.com\/id\/([^\/]+)/.exec(this.responseText);
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
        });
}

function requestGamesFromSteam(callback) {
    console.log("Requesting games from Steam");
    makeRequest(
        "http://steamcommunity.com/id/" + settings.SteamUser + "/games?tab=all&xml=1",
        "GET",
        function() {
            if (this.readyState == 4 && this.status == 200) {
                gamesXML = this.responseXML.getElementsByTagName("game");
                games = [];
                for (var idx = 0; idx < gamesXML.length; idx++) {
                    games.push({
                        id: gamesXML[idx].getElementsByTagName("appID")[0].childNodes[0].nodeValue,
                        name: gamesXML[idx].getElementsByTagName("name")[0].childNodes[0].nodeValue
                    });
                }
                console.log("Got the following games", games);
                storage.set({ SteamGames: games});
                callback({games: games});
            }
        }
    );
}

function getGamesFromSteam(callback) {
    if ("SteamUser" in settings && settings.SteamUser !== null) {
        console.log("Using username: " + settings.SteamUser);
        requestGamesFromSteam(callback);
    }
    else {
        console.log("Fetching username...");
        getSteamIdFromGala(function(){
            if (settings.SteamUser !== null) {
                requestGamesFromSteam(callback);
            }
            else {
                callback({});
            }
        });
    }
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
    else if (request.method == "updateGames") {
        getGamesFromSteam(sendResponse);
    }
});