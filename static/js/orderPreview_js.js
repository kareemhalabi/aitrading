/**
 * Created by KareemHalabi on 6/11/2017.
 */

// JSON representation of cash table
var cash = {
  "CAD": {
      "open": 10000.00,
      "BUY": 0.00,
      "SELL": 0.00,
      "conversion": 0.00,
      "net": 0.00,
      "closing": 0.00
  },
  "USD": {
      "open": 10000.00,
      "BUY": 0.00,
      "SELL": 0.00,
      "conversion": 0.00,
      "net": 0.00,
      "closing": 0.00
  }
};

var fxRate = {
    "CAD/USD": 0,
    "USD/CAD": 0,
    "date": ""
};

var autoConvertEnabled = true;

var securities_error = "";
var cash_error = "", cash_warning = "";
var CASH_WARNING_THRESH = 0.05;

$(document).ready( function () {
    // Get the fx Rate
    $.ajax("https://api.fixer.io/latest?base=CAD&symbols=USD",{
        success: function (response) {
            fxRate["CAD/USD"] = response.rates.USD;
            fxRate["USD/CAD"] = parseFloat((1/response.rates.USD).toFixed(5));
            fxRate["date"] = response.date;
            $("#fx_info").html("As of " + fxRate["date"] + " 11:00 AM EST, " +
                "<b>1 CAD= " + fxRate["CAD/USD"] + " USD</b> and <b>1 USD = " + fxRate["USD/CAD"] + " CAD</b>")
        },
        error: function(error) {
            $("#fx_info").text("Could not get exchange rate, input conversions manually: " + error.status + ": " + error.statusText);
            autoConvertEnabled = false;
        }
    });


    $("#fx_info").text("As of " + fxRate["date"] + " 11:00 AM, 1 CAD = " + fxRate["CAD/USD"] + " USD");

    // Set the opening balances
    for (currency in cash) {
        if(cash.hasOwnProperty(currency)) {
            $("#cash_recap").find("[id*='"+currency+"']").find("[data-th='Opening']")
                .text(cash[currency]["open"].toLocaleString("en-US", {style: "currency", currency: "USD"}));
        }
    }
});

/**
 * Update the preview table when a new trade has been added.
 *
 * @param trade The newly added trade
 */
function updatePreview(trade) {

    // Clear previous errors
    $("#preview_error").text("").parent().hide();


    // Show the panel
    if (pending_trades.length == 1) {
        $("#order_preview_container").slideDown();
    }

    // Format trade row
    var tr = '<tr style="display: none">' +
                '<td data-th="Currency">'+ trade.currency +'</td>' +
                '<td data-th="Ticker">' + trade.ticker + '</td>' +
                '<td data-th="ISIN">' + trade.isin + '</td>' +
                '<td data-th="Security Name">' + trade.sec_name + '</td>' +
                '<td data-th="Buy/Sell">' + trade.buy_sell + '</td>' +
                '<td data-th="Shares">' + trade.shares + '</td>' +
                '<td data-th="Price">' + trade.price.toLocaleString("en-US", {style: "currency", currency: "USD"}) + '</td>' +
                '<td data-th="MKT/LIMIT">' + trade.mkt_limit + '</td>' +
                '<td data-th="Order Type">' + trade.order_type + '</td>' +
                '<td data-th="Total">' + trade.total.toLocaleString("en-US", {style: "currency", currency: "USD"}) + '</td>' +
                '<td data-th="Edit/Delete">' +
                    '<button type="button" class="btn btn-xs btn-success" onclick="editTrade($(this).closest(\'tr\'))">' +
                        '<span class="glyphicon glyphicon-pencil"></span>' +
                    '</button>&nbsp;'+
                    '<button type="button" class="btn btn-xs btn-success" onclick="deleteTrade($(this).closest(\'tr\'))">' +
                        '<span class="glyphicon glyphicon-remove"></span>' +
                    '</button>' +
                '</td>' +
        '</tr>';

    // Update cash
    cash[trade.currency][trade.buy_sell] += trade.total;
    updateCashTable();

    // Add and show the row
    var $table = $("#preview_table");
    $table.append(tr);
    $table.find("tr").show("slow");
}

/**
 * Removes a trade from the preview and repopulates the trade form with the details
 * to be edited.
 *
 * @param $row The row object to be edited
 */
function editTrade($row) {
    // Find index in trade list and remove
    var index = $row.index();
    var trade = pending_trades[index];
    pending_trades.splice(index, 1);

    populateTradeForm(trade);
    $row.hide("slow", function (){$row.remove()});

    // Hide preview if no trades remain
    if(pending_trades.length == 0) {
        $("#order_preview_container").slideUp();
    }

    // Update cash
    cash[trade.currency][trade.buy_sell] -= trade.total;
    updateCashTable();

    // Scroll to trade details
    $("html, body").animate({
       scrollTop: $("#trade_form").offset().top
    }, 1000);
}

/**
 * Removes a trade from the preview
 *
 * @param $row The row object to be edited
 */
function deleteTrade($row) {
    // Find index in trade list and remove
    var index = $row.index();
    var trade = pending_trades[index];
    pending_trades.splice(index, 1);

    $row.hide("slow", function (){$row.remove()});
    if(pending_trades.length == 0) {
        $("#order_preview_container").slideUp();
    }

    // Update cash
    cash[trade.currency][trade.buy_sell] -= trade.total;
    updateCashTable();
}

/**
 * Input handler for a conversion request.
 *
 * @param $source The input field triggering the handler
 * @param base The base currency
 * @param target The target currency
 */
function convertCash($source, base, target) {

    // Strip non-numeric for browsers without "tel" support
    $source.val(function (i, oldval) {
        return oldval.replace(/[^\-0-9.]/,"");
    });

    var $targetInput = $("#cash_recap").find("input[id*='"+ target +"']");
    var sourceString = $source.val();

    if (sourceString.length > 0) {

        if((/^-?\d+\.?\d{0,2}$/).test(sourceString)) {
            // Non-empty and valid conversion value

            cash[base]["conversion"] = parseFloat(sourceString);

            // Only modify target input if auto-convert is enabled
            if(autoConvertEnabled) {
                cash[target]["conversion"]  = -1 * cash[base]["conversion"] * fxRate["" + base + "/" + target];
                $targetInput.val(cash[target]["conversion"].toFixed(2));
            }

            $source.parent().removeClass("has-error");

        } else {
            // Non-empty and invalid conversion value

            $targetInput.val('');
            $source.parent().addClass("has-error");
            cash[base]["conversion"] = 0;
            cash[target]["conversion"] = 0;
        }
    } else {
        // Empty conversion value

        $targetInput.val('');
        $source.parent().removeClass("has-error");
        cash[base]["conversion"] = 0;
        cash[target]["conversion"] = 0;
    }

    updateCashTable();
}

/**
 * Update the cash table calculating opening, total buys, sells, conversions
 * net and closing balances for all currencies. Displays and cash related
 * errors or warnings.
 */
function updateCashTable() {

    cash_error = "";
    cash_warning = "";
    var $cash_recap = $("#cash_recap");

    for (var currency in cash) {
        if (!cash.hasOwnProperty(currency)) continue;

        var $currency_row = $cash_recap.find("[id*='" + currency + "']");

        var buys = $currency_row.find("[data-th='Buys']");
        buys.text((-cash[currency]["BUY"]).toLocaleString("en-US", {style: "currency", currency: "USD"}));

        $currency_row.find("[data-th='Sells']")
            .text(cash[currency]["SELL"].toLocaleString("en-US", {style: "currency", currency: "USD"}));

        cash[currency]["net"] = (-cash[currency]["BUY"] + cash[currency]["SELL"] + cash[currency]["conversion"]);
        $currency_row.find("[data-th*='Net']").text(
            cash[currency]["net"].toLocaleString("en-US", {style: "currency", currency: "USD"})
        );

        cash[currency]["closing"] = cash[currency]["open"] + cash[currency]["net"];
        var closing_cell = $currency_row.find("[data-th='Closing']");

        closing_cell.text(
            cash[currency]["closing"].toLocaleString("en-US", {style: "currency", currency: "USD"})
        );

        // Check for negative or low balance
        if (cash[currency]["closing"] < 0) {

            closing_cell.attr("class", "text-danger");
            cash_error += "Cannot have negative " + currency + " balance. ";

        } else if (cash[currency]["closing"] < CASH_WARNING_THRESH * cash[currency]["open"]) {

            closing_cell.attr("class", "text-warning");
            cash_warning += "Low on " + currency + ". ";

        } else {
            closing_cell.removeClass("text-danger text-warning")
        }

        // Check if enough cash to cover buys
        if (cash[currency]["BUY"] > cash[currency]["open"] + cash[currency]["conversion"] && cash[currency]["closing"] > 0) {

            buys.addClass("text-warning");
            cash_warning += "Insufficient opening " + currency + " to cover buys. Consider a conversion or executing " +
                "and confirming a sell order(s) before buying. "

        } else {
            buys.removeClass("text-warning")
        }

    }

    // Update cash errors or warnings if present
    if (cash_error.length > 0 || securities_error.length > 0) {
        $("#preview_error").text(securities_error + "\n" + cash_error).parent().show();
    } else {
        $("#preview_error").parent().hide();
    }

    if (cash_warning.length > 0) {
        $("#preview_warning").text(cash_warning).parent().show();
    } else {
        $("#preview_warning").parent().hide();
    }
    
    orderSubmitCheck();
}

/**
 * Check if errors present and disable submit, otherwise enable 
 */
function orderSubmitCheck() {

    if (cash_error.length > 0 || securities_error.length > 0 ||
        $("[data-th='Conversion']").children(".has-error").length > 0) {

        $("#submit_order").prop("disabled", true);
    } else {
        $("#submit_order").prop("disabled", false);
    }

}

function submitOrder() {

    var request = {
        trades: pending_trades,
        cash: cash,
        notes: $("#order_notes").val()
    };
    
    $.ajax({
        url: "submit_order/",
        method: "POST",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify(request),
        timeout: 20000,
        headers: {"X-CSRFToken": $("[name=csrfmiddlewaretoken]").val()},
        success: function (response) {
            console.log(response)
        },
        error: function (error, errorType) {
            
        },
        complete: function () {
            
        }
    });
}