
var snapshots;
var dateToSnapshotMap = {};

$(document).ready(function () {

    $.ajax({url: "get_snapshots/", timeout: 30000,
        headers: {"X-CSRFToken": $("[name=csrfmiddlewaretoken]").val()},
        success: function (response) {

            if(response.length !== 0) {

                snapshots = response["snapshots"];
                generateDateToSnapshotMap();

                // Loads the default selected snapshot
                loadSnapshot();
            } else {
                console.log("No snapshots available");
            }

        }
    });

});

function generateDateToSnapshotMap() {

    snapshots.forEach(function (current, index) {
        var dateElements = current["as_of_date"].split('/'); // MM/DD/YYYY
        var year = dateElements[2];
        var month = dateElements[0];
        var day = dateElements[1];

        // Create the year's dict if it does not yet exist
        if(!(dateToSnapshotMap.hasOwnProperty(year)))
            dateToSnapshotMap[year] = {};

        // Create the month's dict if it does not yet exist
        if(!(dateToSnapshotMap[year].hasOwnProperty(month)))
                dateToSnapshotMap[year][month] = {};

        // Map the date to snapshot index
        dateToSnapshotMap[year][month][day] = index;
    });

    // Build snapshot year select items
    var $snapshotYearSelect = $('#snapshot_year');
    $snapshotYearSelect.empty();
    for(var year in dateToSnapshotMap) {
        if(dateToSnapshotMap.hasOwnProperty(year)) {
            $snapshotYearSelect.append('<option value="'+year+'">'+year+'</option>')
        }
    }

    // Sets latest year by default
    $snapshotYearSelect.val($snapshotYearSelect.children().last().val());

    // Initial call to populate default year selection
    snapshotYearHandler();
}

function snapshotYearHandler() {

    var selectedYear = $('#snapshot_year').val();

    // Build the month select items
    var $snapshotMonthSelect = $('#snapshot_month');
    $snapshotMonthSelect.empty();
    for(var month in dateToSnapshotMap[selectedYear]) {
        if(dateToSnapshotMap[selectedYear].hasOwnProperty(month)) {
            $snapshotMonthSelect.append('<option value="'+month+'">'+month+'</option>')
        }
    }

    // Sets latest month by default
    $snapshotMonthSelect.val($snapshotMonthSelect.children().last().val());

    snapshotMonthHandler();
}

function snapshotMonthHandler() {

    var selectedYear = $('#snapshot_year').val();
    var selectedMonth = $('#snapshot_month').val();
    var $snapshotDaySelect = $('#snapshot_day');

    $snapshotDaySelect.empty();

    // Can't do forEach() since dateToSnapshotMap is a dictionary
    for(var day in dateToSnapshotMap[selectedYear][selectedMonth]) {
        if(dateToSnapshotMap[selectedYear][selectedMonth].hasOwnProperty(day)) {
            $snapshotDaySelect.append('<option value="'+day+'">'+day+'</option>')
        }
    }

    // Sets latest day by default
    $snapshotDaySelect.val($snapshotDaySelect.children().last().val());

}

function loadSnapshot() {

    var selectedYear = $('#snapshot_year').val();
    var selectedMonth = $('#snapshot_month').val();
    var selectedDay = $('#snapshot_day').val();

    var selectedSnapshot = snapshots[dateToSnapshotMap[selectedYear][selectedMonth][selectedDay]];

    // Set cash values

    $("#snapshot_CAD_cash").text(accounting.formatMoney(selectedSnapshot["CAD_cash"]));
    $("#snapshot_USD_cash").text(accounting.formatMoney(selectedSnapshot["USD_cash"]));

    // FX stuff
    var fxRate = selectedSnapshot["fx_rate"];
    $("#fx_info").html("On " + selectedSnapshot["as_of_date"] +
                    ", <b>1 USD= " + fxRate + " CAD</b> and <b>1 CAD = " + (1/fxRate).toFixed(5) + " USD</b>");

    var cadSecurityTotal = 0, usdSecurityTotal = 0;

    var $snapshotTable = $("#snapshot_table");
    $snapshotTable.hide().empty();
    selectedSnapshot["securities"].forEach(function (security) {
        $snapshotTable.append(
            '<tr>' +
                    '<td data-th="Currency">' + security["currency"] + '</td>' +
                    '<td data-th="Ticker">' + security["ticker"] + '</td>' +
                    '<td data-th="ISIN">' + security["isin"] + '</td>' +
                    '<td data-th="Name">' + security["sec_name"] + '</td>' +
                    '<td data-th="Asset Category">' + security["asset_category"] + '</td>' +
                    '<td data-th="Sector">' + security["sector_name"] + '</td>' +
                    '<td data-th="Shares">' + security["shares"] + '</td>' +
                    '<td data-th="Price">' + accounting.formatMoney(security["price"]) + '</td>' +
                    '<td data-th="Total">' + accounting.formatMoney(security["total"]) + '</td>' +
            '</tr>'
        );

        if(security["currency"] === "USD")
            usdSecurityTotal += security["total"];
        else if (security["currency"] === "CAD")
            cadSecurityTotal += security["total"];

    });
    $snapshotTable.show('slow');

    // Update other totals
    $("#snapshot_CAD_security").text(accounting.formatMoney(cadSecurityTotal));
    $("#snapshot_USD_security").text(accounting.formatMoney(usdSecurityTotal));

    $("#snapshot_portfolio_total").text(accounting.formatMoney(
        selectedSnapshot["CAD_cash"] + cadSecurityTotal + fxRate*(selectedSnapshot["USD_cash"] + usdSecurityTotal)
    ));

}