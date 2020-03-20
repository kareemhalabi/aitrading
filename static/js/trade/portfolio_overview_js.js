/**
 * Created by KareemHalabi on 10/9/2017.
 */

// Global variable for portfolio

var portfolio;
var as_of_date;
var portfolio_total_value;
var fxRate = {
    "CAD->USD": 0,
    "USD->CAD": 0
};

$(document).ready( function () {
    $.ajax({url: "get_portfolio/" + window.location.search, timeout: 30000,
        headers: {"X-CSRFToken": $("[name=csrfmiddlewaretoken]").val()},
        success: function(response) {

            if(response.length !== 0) {

                // Set variables
                portfolio = response["securities"];
                cash["CAD"]["open"] = response["CAD_cash"];
                cash["USD"]["open"] = response["USD_cash"];

                fxRate["USD->CAD"] = response["fx_rate"];
                fxRate["CAD->USD"] = parseFloat((1/fxRate["USD->CAD"]).toFixed(5));

                as_of_date = (new Date(response["as_of_date"])).toLocaleDateString("en-CA");

                // Set fields
                $(".fx_info").html("As of " + as_of_date +
                    ", <b>1 USD= " + fxRate["USD->CAD"] + " CAD</b> and <b>1 CAD = " + fxRate["CAD->USD"] + " USD</b>");

                $("#portfolio-update-date").html("<b> Data as of: " + as_of_date + "</b>");

                // Set the opening balances
                for (currency in cash) {
                    if(cash.hasOwnProperty(currency)) {

                        $("#cash_recap").find("[id*='"+currency+"']").find("[data-th='Opening']")
                            .text(accounting.formatMoney(cash[currency]["open"]));

                        $("#%s_recap" % currency).find("[data-th=Opening]")
                            .text(accounting.formatMoney(cash[currency]["open"]));
                    }
                }

            } else {
                $("#portfolio-update-date").text("Could not get portfolio data");
            }

        },
        error: function (error) {
            $("#portfolio-update-date").text("Could not get portfolio data. Error "+ error.status + ": " + error.statusText);
        }, complete: function() {
            populatePortfolio();
        }
    });

});


/**
 * Populates the portfolio container with data from BNY Mellon
 */
function populatePortfolio() {

    var $table = $("#portfolio-table");
    var security_totals = {
        "CAD": 0.00,
        "USD": 0.00
    };

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

        // Add to appropriate total
        security_totals[security["currency"]] += security["total"];
    }
    $table.show("slow");

    // Update security totals
    $("#security-CAD").text(accounting.formatMoney(security_totals["CAD"]));
    $("#security-USD").text(accounting.formatMoney(security_totals["USD"]));

    // Update cash
    $("#portfolio-CAD").text(accounting.formatMoney(cash["CAD"]["open"]));
    $("#portfolio-USD").text(accounting.formatMoney(cash["USD"]["open"]));

    // Update total and weights

    portfolio_total_value = security_totals["CAD"] + cash["CAD"]["open"] +
                            (security_totals["USD"] + cash["USD"]["open"])*fxRate["USD->CAD"];

    $("#portfolio-total").text(accounting.formatMoney(portfolio_total_value));

    var weight;
    weight = (security_totals["CAD"] / portfolio_total_value) * 100;
    $("#security-CAD-portion").attr("data-original-title", "CAD Securities: " + weight.toFixed(2) + "%").width(weight + "%");

    weight = (security_totals["USD"]*fxRate["USD->CAD"] / portfolio_total_value) * 100;
    $("#security-USD-portion").attr("data-original-title", "USD Securities: " + weight.toFixed(2) + "%").width(weight + "%");

    weight = (cash["CAD"]["open"] / portfolio_total_value) * 100;
    $("#cash-CAD-portion").attr("data-original-title", "CAD Cash: " + weight.toFixed(2) + "%").width(weight + "%");

    weight = (cash["USD"]["open"]*fxRate["USD->CAD"] / portfolio_total_value) * 100;
    $("#cash-USD-portion").attr("data-original-title", "USD Cash: " + weight.toFixed(2) + "%").width(weight + "%");

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