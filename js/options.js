$(function() {
    for (var i in Settings.keys()) {
        console.log(i, Settings.get(i));
        if ($("#" + i).is('[type=checkbox]')) {
            $("#" + i).prop("checked", Settings.get(i));
        }
    }

    $('input[type=checkbox]').change(function() {
        console.log(this.id, $(this).is(':checked'));
        Settings.set(this.id, $(this).is(':checked'));
    });
});