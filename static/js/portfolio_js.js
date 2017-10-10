/**
 * Created by KareemHalabi on 10/9/2017.
 */

// Global variable for portfolio

var portfolio;
var as_of_date;

$(document).ready( function () {
    $.ajax({url: "get_portfolio/", timeout: 30000,
        headers: {"X-CSRFToken": $("[name=csrfmiddlewaretoken]").val()},
        success: function(response) {

            if(response.length !== 0) {

                // Set variables
                portfolio = response["securities"];
                cash["CAD"]["open"] = response["CAD_cash"];
                cash["USD"]["open"] = response["USD_cash"];

                // Set fields
                as_of_date = response["as_of_date"];
                $("#portfolio-update-date").html("<b> Data as of: " + as_of_date + "</b>");
                $("#CAD_recap").find("[data-th=Opening]").text(accounting.formatMoney(cash["CAD"]["open"]));
                $("#USD_recap").find("[data-th=Opening]").text(accounting.formatMoney(cash["USD"]["open"]));
                populatePortfolio();

            } else {
                $("#portfolio-update-date").text("Could not get portfolio data");
            }

        },
        error: function (error) {
            $("#portfolio-update-date").text("Could not get portfolio data. Error "+ error.status + ": " + error.statusText);
        }
        });
});

/**
 * Populates the portfolio container with data from BNY Mellon
 */
function populatePortfolio() {

    var $table = $("#portfolio-table");

    // Update portfolio table
    for(var i = 0; i < portfolio.length; i++) {

        security = portfolio[i];
        var tr = '<tr>' +
                    '<td data-th="Currency">' + security["currency"] + '</td>' +
                    '<td data-th="Ticker">' + security["ticker"] + '</td>' +
                    '<td data-th="ISIN">' + security["isin"] + '</td>' +
                    '<td data-th="Name">' + security["sec_name"] + '</td>' +
                    '<td data-th="Shares">' + security["shares"] + '</td>' +
                    '<td data-th="Price">' + accounting.formatMoney(security["price"]) + '</td>' +
                    '<td data-th="Total">' + accounting.formatMoney(security["total"]) + '</td>' +
                    '<td data-th="Sell">' +
                        '<button type=\"button\" class=\"btn btn-xs btn-info\" onclick="sellSecurity($(this).closest(\'tr\'))">Sell</button>' +
                    '</td>' +
                '</tr>';
        $table.append(tr);
    }

    // Update cash
    $("#portfolio-CAD").text(accounting.formatMoney(cash["CAD"]["open"]));
    $("#portfolio-USD").text(accounting.formatMoney(cash["USD"]["open"]));
}

/**
 * On click listener for sell button to populate trade form
 * @param $row The row where the button was pressed
 */
function sellSecurity($row) {

    var index = $row.index();
    var security = portfolio[index];

    // Populate trade form (null passed as source, since portfolio has no error field)
    populateTradeForm(security, null);

    // Set 'side' to sale
    var $sell_select = $("#buy_sell");
    $sell_select.val("SELL");
    selectHandler($sell_select);

    // Scroll to trade details
    $("html, body").animate({
       scrollTop: $("#trade_form").offset().top
    }, 1000);
}