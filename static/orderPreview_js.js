/**
 * Created by KareemHalabi on 6/11/2017.
 */

var cash = {
  "CAD": {
      "open": 0.00,
      "BUY": 0.00,
      "SELL": 0.00
  },
  "USD": {
      "open": 0.00,
      "BUY": 0.00,
      "SELL": 0.00
  }
};

var conversions = {
    "CAD": 0.00,
    "USD": 0.00
};

var fxRate = {
    "CAD/USD": 0,
    "USD/CAD": 0,
    "date": ""
};

$(document).ready( function () {
    // Get the fx Rate
    $.ajax("https://api.fixer.io/latest?base=CAD&symbols=USD",{
        success: function (response) {
            fxRate["CAD/USD"] = response.rates.USD;
            fxRate["USD/CAD"] = parseFloat((1/response.rates.USD).toFixed(5));
            fxRate["date"] = response.date;
            $("#fx_info").html("As of " + fxRate["date"] + " 11:00 AM EST, &nbsp;" +
                "<b>CAD/USD = " + fxRate["CAD/USD"] + "</b> and <b>USD/CAD = " + fxRate["USD/CAD"] + "</b>")
        },
        error: function(error) {
            $("#fx_info").text("Could not get exchange rate: " + error.status + ": " + error.statusText);
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

function updatePreview(trade) {
    // Show the panel
    if (pending_trades.length == 1) {
        $("#order_preview_container").slideDown();
    }
    var tr = '<tr style="display: none">' +
                '<td data-th="Currency">'+ trade.currency +'</td>' +
                '<td data-th="ISIN">' + trade.isin + '</td>' +
                '<td data-th="Ticker">' + trade.ticker + '</td>' +
                '<td data-th="Security Name">' + trade.sec_name + '</td>' +
                '<td data-th="Buy/Sell">' + trade.buy_sell + '</td>' +
                '<td data-th="Shares">' + trade.shares + '</td>' +
                '<td data-th="Price">$' + trade.price + '</td>' +
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

function editTrade($row) {
    var index = $row.index() - 1;
    var trade = pending_trades[index];
    pending_trades.splice(index, 1);

    populateTradeForm(trade);
    $row.hide("slow", function (){$row.remove()});
    if(pending_trades.length == 0) {
        $("#order_preview_container").slideUp();
    }

    // Update cash
    cash[trade.currency][trade.buy_sell] -= trade.total;
    updateCashTable();
}

function deleteTrade($row) {
    var index = $row.index() - 1;
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

function convertCash($source, base, target) {

    // Strip non-numeric for browsers without "tel" support
    $source.val(function (i, oldval) {
        return oldval.replace(/[^\-0-9.]/,"");
    });

    var $targetInput = $("#cash_recap").find("input[id*='"+ target +"']");
    var sourceString = $source.val();
    if (sourceString.length > 0) {
        if((/^-?\d+\.?\d{0,2}$/).test(sourceString)) {
            conversions[base] = parseFloat(sourceString);
            conversions[target] = -1 * conversions[base] * fxRate["" + base + "/" + target];

            $targetInput.val(conversions[target].toFixed(2));
            $source.parent().removeClass("has-error");
        } else {
            $targetInput.val('');
            $source.parent().addClass("has-error");
            conversions[base] = 0;
            conversions[target] = 0;
        }
    } else {
        $targetInput.val('');
        $source.parent().removeClass("has-error");
        conversions[base] = 0;
        conversions[target] = 0;
    }

    updateCashTable();
}

function updateCashTable() {

    var $cash_recap = $("#cash_recap");

    for (var currency in cash) {
        if (!cash.hasOwnProperty(currency)) continue;

        var $currency_row = $cash_recap.find("[id*='"+currency+"']");

        $currency_row.find("[data-th='Buys']")
                .text((-cash[currency]["BUY"]).toLocaleString("en-US", {style: "currency", currency: "USD"}));
        $currency_row.find("[data-th='Sells']")
                .text(cash[currency]["SELL"].toLocaleString("en-US", {style: "currency", currency: "USD"}));

        var net = (-cash[currency]["BUY"] + cash[currency]["SELL"] + conversions[currency]);
        $currency_row.find("[data-th*='Net']").text(
            net.toLocaleString("en-US", {style: "currency", currency: "USD"})
        );

        var closing = cash[currency]["open"] + net;
        $currency_row.find("[data-th='Closing']").text(
            closing.toLocaleString("en-US", {style: "currency", currency: "USD"})
        );
    }
}