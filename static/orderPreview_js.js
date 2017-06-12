/**
 * Created by KareemHalabi on 6/11/2017.
 */

function updatePreview(trade) {
    // Show the panel
    if (pending_trades.length == 1) {
        $("#order_preview_container").slideDown();
    }
    var tr = '<tr style="display: none">' +
                '<td data-th="Currency">'+ trade.currency +'</td>' +
                '<td data-th="ISIN">' + trade.ISIN + '</td>' +
                '<td data-th="Ticker">' + trade.ticker + '</td>' +
                '<td data-th="Security Name">' + trade.security + '</td>' +
                '<td data-th="Buy/Sell">' + trade.buy_sell + '</td>' +
                '<td data-th="Shares">' + trade.shares + '</td>' +
                '<td data-th="Price">$' + trade.price + '</td>' +
                '<td data-th="MKT/LIMIT">' + trade.mkt_limit + '</td>' +
                '<td data-th="Order Type">' + trade.order_type + '</td>' +
                '<td data-th="Total">' + trade.total.toLocaleString("en-US", {style: "currency", currency: "USD"}) + '</td>' +
                '<td data-th="Edit/Delete">' +
                    '<button type="button" class="btn btn-xs btn-success">' +
                        '<span class="glyphicon glyphicon-pencil"></span>' +
                    '</button>&nbsp;'+
                    '<button type="button" class="btn btn-xs btn-success">' +
                        '<span class="glyphicon glyphicon-remove"></span>' +
                    '</button>' +
                '</td>' +
        '</tr>';

    var $table = $("#preview_table");
    $table.append(tr);
    $table.find("tr").show("slow");
}