/**
 * Created by KareemHalabi on 6/4/2017.
 */

/**
 * Searches for a security by ISIN
 */
function searchByIsin() {

    $("#isin_search_icon").css("display", "none");
    $("#isin_loader").css("display", "inline-block");
    var isinSearch = {ISIN: $("#isin").val(),
        currency: $("#currency").val()};

    $.ajax({url: "search_by_isin", data: isinSearch, timeout: 20000,
            success: function(response) {
                populateTradeForm(response);
            },
            error: function (error) {
                $("#error_message").text("Error " + error.status + ": " + error.statusText).parent().show();
            },
            complete: function () {
                    $("#isin_search_icon").css("display", "inline-block");
                    $("#isin_loader").css("display", "none");
            }
            });
}

/**
 * Searches for a security by ticker. Note only alphabetic characters and the period
 * are allowed.
 */
function searchByTicker() {

    $("#ticker_search_icon").css("display", "none");
    $("#ticker_loader").css("display", "inline-block");
    var tickerSearch = {ticker: $("#ticker").val(),
        currency: $("#currency").val()};

    $.ajax({url: "search_by_ticker", data: tickerSearch, timeout: 20000,
        success: function(response) {
            populateTradeForm(response);
        },
        error: function (error) {
            $("#error_message").text("Error " + error.status + ": " + error.statusText).parent().show();
        },
        complete: function () {
                $("#ticker_search_icon").css("display", "inline-block");
                $("#ticker_loader").css("display", "none");
        }
        });
}

/**
 * Updates data fields with security information
 * @param security object representing security info
 */
function populateTradeForm(security) {
    if(security.error.length > 0) {
        $("#error_message").text(security.error)
            .parent().show();
    } else {
        $("#error_message").parent().hide();
        $("#isin").val(security.ISIN);
        $("#ticker").val(security.ticker);
        $("#sec_name").val(security.security);
        $("#price").val(security.last_close_price.toFixed(2));
    }
}

/**
 * Validates ISIN input
 * @param $field The ISIN field object
 */
function isinInputHandler($field) {
    $field.val(function(i, oldval) {
        return oldval.replace(/[^a-zA-Z0-9]/g,"").toUpperCase()
    });

    if($field.val().length > 0) {
        if(validateISIN($field.val())) {
            $("#isin_group").attr("class", "form-group has-success");
            $("#isin_btn").prop("disabled", false);
        } else {
            $("#isin_group").attr("class", "form-group has-error");
            $("#isin_btn").prop("disabled", true);
        }
    } else {
        $("#isin_group").attr("class", "form-group");
        $("#isin_btn").prop("disabled", true);
    }
}

/**
 * Validates ticker input
 * @param $field The ticker field object
 */
function tickerInputHandler($field) {
    $field.val(function(i, oldval) {
        return oldval.replace(/-/g,".").replace(/[^a-zA-Z.]/g,"").toUpperCase()
    });

    if($field.val().length > 0) {
        if((/^([A-Z]+)(\.[A-Z]{1,2})?$/).test($field.val())) {
            $("#ticker_group").attr("class", "form-group has-success");
            $("#ticker_btn").prop("disabled", false);
        } else {
            $("#ticker_group").attr("class", "form-group has-error");
            $("#ticker_btn").prop("disabled", true);
        }
    } else {
        $("#ticker_group").attr("class", "form-group");
        $("#ticker_btn").prop("disabled", true);
    }
}

/**
 * Validates shares input
 * @param $field The input field object
 */
function sharesInputHandler($field) {
    // Strip non-numeric for browsers without "number" support
    $field.val(function (i, oldval) {
        return oldval.replace(/[^0-9]/,"");
    });

    if($field.val().length > 0) {
        if(parseInt($field.val()) > 0) {
            $("#shares_group").attr("class", "form-group has-success");
            updateTotal(false);
        } else {
            $("#shares_group").attr("class","form-group has-error");
            updateTotal(true);
        }
    } else {
        $("#shares_group").attr("class", "form-group");
        updateTotal(true);
    }
}

/**
 * Validates price input
 * @param $field The input field object
 */
function priceInputHandler($field) {
    // Strip non-numeric for browsers without "tel" support
    $field.val(function (i, oldval) {
        return oldval.replace(/[^0-9.]/,"");
    });

    if($field.val().length > 0) {

        if ((/^\d+\.?\d{0,2}$/).test($field.val()) && parseFloat($field.val()) > 0) {
            $("#price_group").attr("class", "form-group has-success");
            updateTotal(false);
        } else {
            $("#price_group").attr("class","form-group has-error");
            updateTotal(true);
        }
    } else {
        $("#price_group").attr("class", "form-group");
        updateTotal(true);
    }
}

/**
 * Update the trade total using number of shares and price
 * @param reset If true, resets total field to 0
 */
function updateTotal(reset) {

    var totalValue = $("#shares").val() * $("#price").val();

    if(!(isNaN(totalValue) || reset)) {
        $("#total").val(totalValue.toLocaleString("en-US", {style: "currency", currency: "USD"}).substring(1));
    } else {
        $("#total").val("0.00");
    }
}

/**
 * Verifies an ISIN is correct. Assume all alphabetic characters are upper case
 * @param isin String representing ISIN
 * @returns true if valid, false otherwise
 */
function validateISIN(isin) {

    // Check first for pattern match
    var isinRe = /[A-Z]{2}[A-Z0-9]{9}[0-9]/;
    if(!isinRe.test(isin))
        return false;

    var isinCode = "";
    for(var i = 0; i < isin.length-1; i++) {
        var c = isin.charCodeAt(i);
        // Convert any alphabetic characters to numeric
        isinCode += (c >= 65) ? (c-55) : isin.charAt(i) ;
    }

    var sum = 0;
    // Double the even indices (from right to left)
    for(i = isinCode.length-1; i >= 0; i-=2) {
        var num = parseInt(isinCode.charAt(i));
        sum += (2*num)%10;
        if(2*num >= 10)
            sum++;
    }
    // Add the odd numbered indicies (from right to left)
    for(i = isinCode.length-2; i >= 0; i-=2){
        sum += parseInt(isinCode.charAt(i));
    }

    // Add the check digit
    sum += parseInt(isin.charAt(isin.length-1));

    // Check if is mod 10
    return sum % 10 == 0;
}