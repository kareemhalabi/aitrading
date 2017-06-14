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
    "CAD/USD": Number.NaN,
    "date": "N/A"
};

$(document).ready( function () {
    // Get the fx Rate
    $.get("http://api.fixer.io/latest?base=CAD&symbols=USD", function (data, status) {
        if(status == "success") {
            fxRate["CAD/USD"] = data.rates.USD;
                fxRate["date"] = data.date;
        }
        $("#fx_info").text("As of " + fxRate["date"] + " 11:00 AM, 1 CAD = " + fxRate["CAD/USD"] + " USD");
    });

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

function convertCashCAD() {
    var $CAD = $("#cad_conv"), $USD = $("#usd_conv");
    // Strip non-numeric for browsers without "tel" support
    $CAD.val(function (i, oldval) {
        return oldval.replace(/[^\-0-9.]/,"");
    });

    var CADString = $CAD.val();
    if(CADString.length > 0) {
        if ((/^-?\d+\.?\d{0,2}$/).test(CADString)) {

            conversions.CAD = parseFloat(CADString);

            // sell CAD, buy USD
            if (conversions.CAD < 0) {
                conversions.USD = -1 * conversions.CAD * fxRate["CAD/USD"];
            }
            // buy CAD, sell USD
            else {
                conversions.USD = -1 * conversions.CAD / fxRate["CAD/USD"];
            }
            $USD.val(conversions.USD.toFixed(2));
            $CAD.removeClass("has-error")

        } else {
            $CAD.addClass("has-error");
            $USD.val('');
            conversions.CAD = 0;
            conversions.USD = 0;
        }
    } else {
        $CAD.removeClass("has-error");
        conversions.CAD = 0;
        $USD.val('');
        conversions.USD = 0;
    }

    updateCashTable();
}

function convertCashUSD() {
    var  $USD = $("#usd_conv"), $CAD = $("#cad_conv");
    // Strip non-numeric for browsers without "tel" support
    $USD.val(function (i, oldval) {
        return oldval.replace(/[^\-0-9.]/,"");
    });

    var USDString = $USD.val();
    if(USDString.length > 0) {
        if ((/^-?\d+\.?\d{0,2}$/).test(USDString)) {

            conversions.USD = parseFloat(USDString);

            // sell USD, buy CAD
            if (conversions.USD < 0) {
                conversions.CAD = -1 * conversions.USD / fxRate["CAD/USD"];
            }
            // buy USD, sell CAD
            else {
                conversions.CAD = -1 * conversions.USD * fxRate["CAD/USD"];
            }
            $CAD.val(conversions.CAD.toFixed(2));
            $USD.removeClass("has-error");

        } else {
            $USD.addClass("has-error");
            $CAD.val('');
            conversions.CAD = 0;
            conversions.USD = 0;
        }
    } else {
        $CAD.val('');
        conversions.CAD = 0;
        $USD.val('').removeClass("has-error");
        conversions.USD = 0;
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