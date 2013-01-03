var parser = new DOMParser();
var my_games_list = {};
var table = null;
var page = 1;

chrome.extension.sendRequest({method: "getGames"}, main);
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
    links = $('a[href^="http://store.steampowered.com/app/"]', doc);
    rearrangeTable(table, links.closest("td"), 4, true);
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
            lineHeight: "136px",
            marginLeft: "-149px",
            marginTop: "-68px",
            textAlign: "center",
            zIndex: 100
        }).append($('<i class="icon-spinner icon-spin icon-4x"></i>').css("vertical-align", "middle"));
    }

    if (content !== undefined) {
        $("div.quickview.content").removeClass("tabella-forum").css("lineHeight", "inherit").empty().append(content).css({
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
    $.post($(this).attr("action"), {
        giveawayId: $(this).find("#giveawayId").val(),
        giveawayOp: $(this).find("#giveawayOp").val()
    }, function(data) {
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

function getNextPage() {
    window.onscroll = null;
    page += 1;
    td = $("<td>").css({
            verticalAlign: "middle",
            textAlign: "center"
        }).append($('<i class="icon-spinner icon-spin icon-4x"></i>'));
    rearrangeTable(table, td, 4, false);

    $.get("http://www.galagiveaways.com/home/" + page, function(data) {
        var doc = parser.parseFromString(data, "text/html");
        td.remove();
        if (hasLinks(doc)) {
            cleanUp(doc);
            lineUp(doc);
            quickEnter();
            window.onscroll = nextPageCheck;
        }
        $('a[href^="http://store.steampowered.com/app/"]').attr("target", "_blank");
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
        quickEnter();
        $('a[href^="http://store.steampowered.com/app/"]').attr("target", "_blank");

        window.onscroll = nextPageCheck;
    }
    else if (/^\/games\/\d+/.test(window.location.pathname)) {
        quickEnter();
    }
    else if (/^\/profile/.test(window.location.pathname)) {
        var GA = $('a[href^="/GA/"]').closest("td");
        pTable = GA.closest("table");

        GA.filter(function() {
            return (/status: Lost/).test(this.innerText);
        }).css('opacity', 0.3).addClass('lost').detach();

        rearrangeTable(pTable, GA.filter(':not(.lost)'), 4, true);
        rearrangeTable(pTable, GA.filter('.lost'), 4, false);

        $('img[src^="http://cdn.steampowered.com"]').click(function(){
            quickView();
            $.get($(this).siblings("a").attr("href"), quickLook);
        }).css({cursor: "pointer"});
    }
}