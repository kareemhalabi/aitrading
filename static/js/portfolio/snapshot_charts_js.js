var valueProperty = "total";

function loadPerformanceChart() {
    var chartProps = {
        "type": "stock",
        "theme": "light",
        "addClassNames": true,
        "dataSets": [],
        "panels": [{
            "showCategoryAxis": true,
            "title": valueProperty,
            "percentHeight": 100,
            "stockGraphs": [{
                "id": "g1",
                "valueField": valueProperty,
                "comparable": true,
                "compareField": valueProperty,
                "balloonText": "[[title]]:<b>[[value]]</b>",
                "compareGraphBalloonText": "[[title]]:<b>[[value]]</b>"
            }],
            "stockLegend": {
                "periodValueTextComparing": "[[percents.value.close]]%",
                "periodValueTextRegular": "[[value.close]]"
            }
        }],
        "chartScrollbarSettings": {
            "graph": "g1"
        },

        "chartCursorSettings": {
            "valueBalloonsEnabled": true,
            "cursorAlpha": 0.5,
            "valueLineBalloonEnabled": true,
            "valueLineEnabled": true,
            "valueLineAlpha": 0.5
        },

        "periodSelector": {
            "position": "left",
            "periods": [{
                "period": "MM",
                "selected": true,
                "count": 1,
                "label": "1 month"
            }, {
                "period": "MM",
                "count": 3,
                "label": "3 month"
            }, {
                "period": "YTD",
                "label": "YTD"
            }, {
                "period": "MAX",
                "label": "MAX"
            }]
        },

        "dataSetSelector": {
            "position": "left"
        },

        "export": {
            "enabled": true
        }
    };

    var securityDataSets = {};


    // Adds/updates a chart series which represents a security
    function addDataPoint(dict, date, priceProperty, totalProperty, title) {

        if (!securityDataSets.hasOwnProperty(title)) {
            securityDataSets[title] = {
                "title": title,
                "fieldMappings": [{
                    "fromField": valueProperty,
                    "toField": valueProperty
                }],
                "dataProvider": [],
                "categoryField": "date"
            }
        }

        securityDataSets[title]["dataProvider"].push(
            {
                "date": date,
                "price": dict[priceProperty],
                "total": dict[totalProperty]
            }
        );

    }

    snapshots.forEach(function (snapshot) {
        var dateComponents = snapshot["as_of_date"].split('/');
        var date = new Date(parseInt(dateComponents[2]), parseInt(dateComponents[0]) - 1, parseInt(dateComponents[1]));

        var fxRate = snapshot["fx_rate"];

        var portfolioValue = {"total": snapshot["CAD_cash"] + fxRate*snapshot["USD_cash"]};

        addDataPoint(snapshot, date, "fx_rate", "fx_rate", "USD->CAD");
        addDataPoint(snapshot, date, "CAD_cash", "CAD_cash", "Cash (CAD)");
        addDataPoint(snapshot, date, "USD_cash", "USD_cash", "Cash (USD)");

        snapshot["securities"].forEach(function (security) {

            // Bundle the pending trades in cash
            if (security["sec_name"] === "PAYABLE FOR INVESTMENTS PURCHASED " ||
                security["sec_name"] === "RECEIVABLE FOR INVESTMENTS SOLD ") {

                var cashDataProvider = securityDataSets["Cash (" + security["currency"] + ")"]["dataProvider"];
                var cashProviderLength = cashDataProvider.length;

                cashDataProvider[cashProviderLength - 1]["price"] =
                    (cashDataProvider[cashProviderLength - 1]["price"] + security["total"]).toFixed(2);

                cashDataProvider[cashProviderLength - 1]["total"] =
                    (cashDataProvider[cashProviderLength - 1]["total"] + security["total"]).toFixed(2);

            } else {
                addDataPoint(security, date, "price", "total", security["ticker"] + " (" + security["currency"] + ")")
            }

            // Add to portfolio value
            if(security["currency"] === "CAD") {
                portfolioValue["total"] += security["total"];
            } else {
                portfolioValue["total"] += fxRate*security["total"];
            }

        });

        portfolioValue["total"] = (portfolioValue["total"]).toFixed(2);
        addDataPoint(portfolioValue, date, "total", "total", "Portfolio (CAD)");

    });

    // Remove the portfolio set so that it is added back as
    // the first element of the chartProps["dataSets"] list
    var portfolioDataSet = securityDataSets["Portfolio (CAD)"];
    delete securityDataSets["Portfolio (CAD)"];

    chartProps["dataSets"] = Object.values(securityDataSets);
    chartProps["dataSets"].unshift(portfolioDataSet);

    AmCharts.makeChart("performance_chart", chartProps);
}

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
    "balloonText": "[[title]] <span>$[[value]] &nbsp; ([[percents]]%)</span> <br> [[sec_name]]",
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

function loadByCurrencyChart(snapshot, cadSecurityTotal, usdSecurityTotal) {

    var fxRate = snapshot["fx_rate"];

    byCurrencyChart.animateData([{
        currency: "CAD",
        total: (parseFloat(snapshot["CAD_cash"]) + cadSecurityTotal).toFixed(2)
    },
        {
            currency: "USD",
            total: (fxRate * (parseFloat(snapshot["USD_cash"]) + usdSecurityTotal)).toFixed(2)
        }], {duration: 500});

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
