var bySecurityChart = AmCharts.makeChart("by_security_chart", {
    "type": "pie",
    "startDuration": 0,
    "theme": "light",
    "addClassNames": true,
    "innerRadius": "30%",
    "dataProvider": [],
    "labelRadius": 2,
    "valueField": "total",
    "titleField": "ticker",
    "balloonText": "[[title]] <span>$[[value]] &nbsp; ([[percents]]%)</span>",
    "export": {
        "enabled": true,
        "fileName": "snapshot_by_security"
    }
});

function loadBySecurityChart(snapshot) {

    var fxRate = snapshot["fx_rate"];

    var CADCashAndEquivalents = snapshot["CAD_cash"];
    var USDCashAndEquivalents = snapshot["USD_cash"];

    // This list will be passed to the chart
    var secuirtyList = [];

    snapshot["securities"].forEach(function (security) {

        if (security["currency"] === "CAD") {

            // Bundle the receivables and payables into cash item
            if (security["sec_name"] === "PAYABLE FOR INVESTMENTS PURCHASED " ||
                security["sec_name"] === "RECEIVABLE FOR INVESTMENTS SOLD ") {
                CADCashAndEquivalents += security["total"]
            }

            else {
                secuirtyList.push({ticker: security["ticker"], total: security["total"]});
            }

        }
        else if (security["currency"] === "USD") {

            // Bundle the receivables and payables into cash item
            if (security["sec_name"] === "PAYABLE FOR INVESTMENTS PURCHASED " ||
                security["sec_name"] === "RECEIVABLE FOR INVESTMENTS SOLD ") {
                USDCashAndEquivalents += security["total"]
            }

            // Need to convert USD securities to CAD
            else {
                secuirtyList.push({ticker: security["ticker"], total: (fxRate * security["total"]).toFixed(2)});
            }
        }

    });

    // Finally add the updated cash and equivalent items
    secuirtyList.push({ticker: "Cash-CAD", total: CADCashAndEquivalents});
    secuirtyList.push({ticker: "Cash-USD", total: (fxRate * USDCashAndEquivalents).toFixed(2)});

    bySecurityChart.animateData(secuirtyList, {duration: 500});
}

var byCurrencyChart = AmCharts.makeChart("by_currency_chart", {
    "type": "pie",
    "startDuration": 0,
    "theme": "light",
    "addClassNames": true,
    "innerRadius": "30%",
    "dataProvider": [],
    "labelRadius": 2,
    "valueField": "total",
    "titleField": "currency",
    "balloonText": "[[title]] <span>$[[value]] &nbsp; ([[percents]]%)</span>",
    "export": {
        "enabled": true,
        "fileName": "snapshot_by_currency"
    }
});

function loadByCurrencyChart(snapshot,  cadSecurityTotal, usdSecurityTotal){

    var fxRate = snapshot["fx_rate"];

    byCurrencyChart.animateData([{currency: "CAD", total: (parseFloat(snapshot["CAD_cash"]) + cadSecurityTotal).toFixed(2)},
                                 {currency: "USD", total: (fxRate*(parseFloat(snapshot["USD_cash"]) + usdSecurityTotal)).toFixed(2)}], {duration: 500});

}

/**
 * Custom plugin that will handle label truncation
 * It will look for property "truncateLabels" in legend settings
 * From https://codepen.io/team/amcharts/pen/7dbb047f95994333e311ac693d27e2c5?editors=0010
 */
function truncateLegendLabels(chart) {
    // init fields
    var titleField = chart.titleField;
    var legendTitleField = chart.titleField + "Legend";

    // iterate through the data and create truncated label properties
    for (var i = 0; i < chart.dataProvider.length; i++) {
        var label = chart.dataProvider[i][chart.titleField];
        if (label.length > chart.legend.truncateLabels)
            label = label.substr(0, chart.legend.truncateLabels - 1) + '...';
        chart.dataProvider[i][legendTitleField] = label;
    }

    // replace chart.titleField to show our own truncated field
    chart.titleField = legendTitleField;

    // make the balloonText use full title instead
    chart.balloonText = chart.balloonText.replace(/\[\[title\]\]/, "[[" + titleField + "]]");
}


var bySectorChart = AmCharts.makeChart("by_sector_chart", {
    "type": "pie",
    "startDuration": 0,
    "theme": "light",
    "addClassNames": true,
    "labelsEnabled": false,
    "legend": {
        "markerType": "circle",
        "position": "bottom",
        "horizontalGap": 5,
        "autoMargins": false,
        "truncateLabels": 15, // custom parameter, number of characters in label before truncation
        "valueText": ""
    },
    "innerRadius": "30%",
    "dataProvider": [],
    "labelRadius": 2,
    "valueField": "total",
    "titleField": "sector",
    "balloonText": "[[title]] <br> <span>$[[value]] &nbsp; ([[percents]]%)</span>",
    "export": {
        "enabled": true,
        "fileName": "snapshot_by_sector"
    }
});

function loadBySectorChart(snapshot) {

    var fxRate = snapshot["fx_rate"];

    var sectorSet = {"CASH & CASH EQUIVALENTS": parseFloat(snapshot["CAD_cash"] + fxRate * snapshot["USD_cash"])};

    snapshot["securities"].forEach(function (security) {

        if (security["currency"] === "CAD") {

            // Bundle the receivables and payables into cash item
            if (security["sec_name"] === "PAYABLE FOR INVESTMENTS PURCHASED " ||
                security["sec_name"] === "RECEIVABLE FOR INVESTMENTS SOLD ") {
                sectorSet["CASH & CASH EQUIVALENTS"] += parseFloat(security["total"]);
            }

            else {
                // Add new sector
                if (!(sectorSet.hasOwnProperty(security["sector_name"]))) {
                    sectorSet[security["sector_name"]] = parseFloat(security["total"]);
                }
                // Add to existing sector
                else {
                    sectorSet[security["sector_name"]] += parseFloat(security["total"]);
                }

            }

        }
        else if (security["currency"] === "USD") {

            // Bundle the receivables and payables into cash item
            if (security["sec_name"] === "PAYABLE FOR INVESTMENTS PURCHASED " ||
                security["sec_name"] === "RECEIVABLE FOR INVESTMENTS SOLD ") {
                sectorSet["CASH & CASH EQUIVALENTS"] += parseFloat(fxRate * security["total"]);
            }

            // Need to convert USD securities to CAD
            else {
                // Add new sector
                if (!(sectorSet.hasOwnProperty(security["sector_name"]))) {
                    sectorSet[security["sector_name"]] = parseFloat(fxRate * security["total"]);
                }
                // Add to existing sector
                else {
                    sectorSet[security["sector_name"]] += parseFloat(fxRate * security["total"]);
                }
            }
        }
    });

    var sectorList = [];

    for (var sector in sectorSet) {
        if (sectorSet.hasOwnProperty(sector)) {
            sectorList.push({"sector": sector, "total": sectorSet[sector].toFixed(2)});
        }
    }

    // Restore the title field and regenerate the chart
    bySectorChart.titleField = "sector";
    bySectorChart.dataProvider = sectorList;
    truncateLegendLabels(bySectorChart);

    bySectorChart.animateData(sectorList, {duration: 500});
}

var byAssetCategoryChart = AmCharts.makeChart("by_asset_category_chart", {
    "type": "pie",
    "startDuration": 0,
    "theme": "light",
    "addClassNames": true,
    "labelsEnabled": false,
    "legend": {
        "markerType": "circle",
        "position": "bottom",
        "horizontalGap": 5,
        "autoMargins": false,
        "truncateLabels": 15, // custom parameter, number of characters in label before truncation
        "valueText": ""
    },
    "innerRadius": "30%",
    "dataProvider": [],
    "labelRadius": 2,
    "valueField": "total",
    "titleField": "asset_category",
    "balloonText": "[[title]] <br> <span>$[[value]] &nbsp; ([[percents]]%)</span>",
    "export": {
        "enabled": true,
        "fileName": "snapshot_by_asset_category"
    }
});

function loadByAssetCategoryChart(snapshot) {

    var fxRate = snapshot["fx_rate"];

    var assetSet = {"CASH & CASH EQUIVALENTS": parseFloat(snapshot["CAD_cash"] + fxRate * snapshot["USD_cash"])};

    snapshot["securities"].forEach(function (security) {

        if (security["currency"] === "CAD") {

            // Add new assetCateory
            if (!(assetSet.hasOwnProperty(security["asset_category"]))) {
                assetSet[security["asset_category"]] = parseFloat(security["total"]);
            }
            // Add to existing assetCateory
            else {
                assetSet[security["asset_category"]] += parseFloat(security["total"]);
            }

        }
        else if (security["currency"] === "USD") {

            // Need to convert USD securities to CAD
            // Add new assetCateory
            if (!(assetSet.hasOwnProperty(security["asset_category"]))) {
                assetSet[security["asset_category"]] = parseFloat(fxRate * security["total"]);
            }
            // Add to existing assetCateory
            else {
                assetSet[security["asset_category"]] += parseFloat(fxRate * security["total"]);
            }
        }
    });

    var assetCategoryList = [];

    for (var assetCateory in assetSet) {
        if (assetSet.hasOwnProperty(assetCateory)) {
            assetCategoryList.push({"asset_category": assetCateory, "total": assetSet[assetCateory].toFixed(2)});
        }
    }

    byAssetCategoryChart.animateData(assetCategoryList, {duration: 500});
}
