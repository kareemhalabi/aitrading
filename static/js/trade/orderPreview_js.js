/**
 * Created by KareemHalabi on 6/11/2017.
 */

// JSON representation of cash table
var cash = {
  "CAD": {
      "open": Number.NaN, // Default to NaN in case portfolio is not pulled
      "BUY": 0.00,
      "SELL": 0.00,
      "conversion": 0.00,
      "net": 0.00,
      "closing": 0.00
  },
  "USD": {
      "open": Number.NaN,
      "BUY": 0.00,
      "SELL": 0.00,
      "conversion": 0.00,
      "net": 0.00,
      "closing": 0.00
  }
};

var securities_error = "";
var cash_error = "", cash_warning = "";
var CASH_WARNING_THRESH = 0.1;
var OVERWEIGHT_WARNGING_THRESH = 0.1;

/**
 * Update the preview table when a new trade has been added.
 *
 * @param trade The newly added trade
 */
function updatePreview(trade) {

    // Clear previous errors
    $("#preview_error").text("").parent().hide();


    // Show the panel
    if (pending_trades.length === 1) {
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
                '<td data-th="Price">' + accounting.formatMoney(trade.price) + '</td>' +
                '<td data-th="MKT/LIMIT">' + trade.mkt_limit + '</td>' +
                '<td data-th="Order Type">' + trade.order_type + '</td>' +
                '<td data-th="Total">' + accounting.formatMoney(trade.total) + '</td>' +
                '<td data-th="Edit/Delete">' +
                    '<button type="button" class="btn btn-xs btn-success" onclick="editTrade($(this).closest(\'tr\'))">' +
                        '<span class="glyphicon glyphicon-pencil"></span>' +
                    '</button>&nbsp;'+
                    '<button type="button" class="btn btn-xs btn-success" onclick="deleteTrade($(this).closest(\'tr\'))">' +
                        '<span class="glyphicon glyphicon-remove"></span>' +
                    '</button>' +
                '</td>' +
    '</tr>';

    var $row = $.parseHTML(tr)[0];

    // Check for overweight buy trade
    var overweight_error;
    if (trade.buy_sell === "BUY" &&
    ((trade.currency === "CAD" && trade.total / portfolio_total_value > OVERWEIGHT_WARNGING_THRESH) ||
    (trade.currency === "USD" && trade.total * fxRate["USD->CAD"] / portfolio_total_value > OVERWEIGHT_WARNGING_THRESH))) {
        overweight_error = trade.sec_name + " ("+ trade.isin + ") accounts for more than " + (OVERWEIGHT_WARNGING_THRESH*100).toFixed(0) +
        "% of your total portfolio value. You must have prior authorization to execute this trade. ";
        $row.className += "warning";
    }

    // Update cash
    cash[trade.currency][trade.buy_sell] += trade.total;
    updateCashTable(overweight_error);

    // Add and show the row
    var $table = $("#preview_table");
    $table.append($row);
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
    if(pending_trades.length === 0) {
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
    if(pending_trades.length === 0) {
        $("#order_preview_container").slideUp();
    }

    // Update cash
    cash[trade.currency][trade.buy_sell] -= trade.total;
    updateCashTable();
}

/**
 * Input handler for a conversion request. Triggered on both value and currency change
 */
function convertCash() {

    var $baseCurrency = $("#base_currency");
    var $baseVal = $("#base_val");

    // Strip non-numeric for browsers without "tel" support
    $baseVal.val(function (i, oldval) {
        return oldval.replace(/[^0-9.]/,"");
    });

    var $targetVal = $("#target_val");
    var $targetCurrency = $("#target_currency");

    // Get base values and currency
    var baseVal = $baseVal.val();
    var baseCurrency = $baseCurrency.val();

    // Determine and set the target currency
    var targetCurrency;

    if (baseCurrency === "USD") {
        targetCurrency = "CAD";
    } else {
        targetCurrency = "USD";
    }
    $targetCurrency.text(targetCurrency);


    if (baseVal.length > 0) { // Non-empty base value


        if((/^\d+\.?\d{0,2}$/).test(baseVal)) { // Non-empty and valid base value

            cash[baseCurrency]["conversion"] = -parseFloat(baseVal);

            cash[targetCurrency]["conversion"]  = -cash[baseCurrency]["conversion"] * fxRate["" + baseCurrency + "->" + targetCurrency];
            $targetVal.text(accounting.formatMoney(cash[targetCurrency]["conversion"]));
            $targetCurrency.text(targetCurrency);

            $baseVal.parent().removeClass("has-error");


        } else { // Non-empty and invalid base value

            $targetVal.text("$0.00");
            $targetCurrency.text(targetCurrency);
            $baseVal.parent().addClass("has-error");
            cash[baseCurrency]["conversion"] = 0;
            cash[targetCurrency]["conversion"] = 0;
        }
    } else { // Empty base value

        $targetVal.text('$0.00');
        $targetCurrency.text(targetCurrency);
        $baseVal.parent().removeClass("has-error");
        cash[baseCurrency]["conversion"] = 0;
        cash[targetCurrency]["conversion"] = 0;
    }

    updateCashTable();
}

/**
 * Update the cash table calculating opening, total buys, sells, conversions
 * net and closing balances for all currencies. Displays trade and cash related
 * errors or warnings.
 */
function updateCashTable(cashWarning) {
    cash_warning = cashWarning || "";
    cash_error = "";
    var $cash_recap = $("#cash_recap");

    for (var currency in cash) {
        if (!cash.hasOwnProperty(currency)) continue;

        var $currency_row = $cash_recap.find("[id*='" + currency + "']");

        var buys = $currency_row.find("[data-th='Buys']");
        buys.text(accounting.formatMoney(-cash[currency]["BUY"]));

        $currency_row.find("[data-th='Sells']")
            .text(accounting.formatMoney(cash[currency]["SELL"]));

        $currency_row.find("[data-th='Conversion']")
            .text(accounting.formatMoney(cash[currency]["conversion"]));

        cash[currency]["net"] = (-cash[currency]["BUY"] + cash[currency]["SELL"] + cash[currency]["conversion"]);
        $currency_row.find("[data-th*='Net']").text(
            accounting.formatMoney(cash[currency]["net"])
        );

        cash[currency]["closing"] = cash[currency]["open"] + cash[currency]["net"];
        var closing_cell = $currency_row.find("[data-th='Closing']");

        closing_cell.text(
            accounting.formatMoney(cash[currency]["closing"])
        );

        // Disable checks if cash not pulled
        if (isNaN(cash[currency]["open"])) {

            cash_warning = "Could not get cash balances. Error checks have been disabled"

        } else {

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
                    "and confirming a sell order before buying. "

            } else {
                buys.removeClass("text-warning")
            }
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
 * Input handler for order reasoning field
 */
function orderReasoningInput() {
    orderSubmitCheck();
}

/**
 * Check if errors present and disable submit, otherwise enable 
 */
function orderSubmitCheck() {

    if (cash_error.length > 0 || securities_error.length > 0 ||
        $("#base_val").parent().hasClass("has-error") ||
        $("#order_reasoning").val().trim().length === 0) {

        $("#pre_submit_order").prop("disabled", true);
    } else {
        $("#pre_submit_order").prop("disabled", false);
    }

}

/**
 * Assembles the security and cash data to submit order by email
 */
function submitOrder() {

    var request = {
        trades: pending_trades,
        cash: cash,
        reasoning: $("#order_reasoning").val(),
        notes: $("#order_notes").val()
    };

    $("#submit_label").css("display", "none");
    $("#submit_loader").css("display", "inline-block");

    var $modal = $("#submit_modal");
    
    $.ajax({
        url: "submit_order/" + window.location.search,
        method: "POST",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify(request),
        timeout: 20000,
        headers: {"X-CSRFToken": $("[name=csrfmiddlewaretoken]").val()},
        success: function (response) {
            $modal.find(".modal-title").text("Success!");
            $modal.find(".modal-body").html("<p>Your Order has been submitted and a confirmation email has been sent " +
                "to the supervisors and all group members. <b>Please verify this email and notify the supervisors if any " +
                "information is missing or incorrect.</b></p>" +
                "<p>Thanks for using AI Trading!</p>");
            $modal.on('hidden.bs.modal', function () {
                $modal.modal("hide");
                location.reload();
            });
            $modal.modal("show");
        },
        error: function (error) {
            $modal.find(".modal-title").text("Oh Snap!");
            $modal.find(".modal-body").html("<p>An error occurred: " + error.status + " " + error.statusText + "</p>" +
                "<p>Please try again. Contact the supervisors if this issue persists.</p>");
            $modal.modal("show");
        },
        complete: function () {
            $("#submit_label").css("display", "inline");
            $("#submit_loader").css("display", "none");
        }
    });
}