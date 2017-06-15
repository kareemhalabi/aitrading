/**
 * Created by KareemHalabi on 6/4/2017.
 */

// Global variable storing pending trades
var pending_trades = [];

/**
 * Searches for a security by isin
 */
function searchByIsin() {

    // Toggle loader
    $("#isin_search_icon").css("display", "none");
    $("#isin_loader").css("display", "inline-block");

    var isinSearch = {isin: $("#isin").val(),
        currency: $("#currency").val()};

    $.ajax({url: "search_by_isin", data: isinSearch, timeout: 20000,
            success: function(response) {
                populateTradeForm(response, $("#isin_group"));
            },
            error: function (error) {
                $("#trade_error").text("Error " + error.status + ": " + error.statusText).parent().show();
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
            populateTradeForm(response, $("#ticker_group"));
        },
        error: function (error) {
            $("#trade_error").text("Error " + error.status + ": " + error.statusText).parent().show();
        },
        complete: function () {
                $("#ticker_search_icon").css("display", "inline-block");
                $("#ticker_loader").css("display", "none");
        }
        });
}

/**
 * Updates data fields with security information. Clears other fields if error returned
 * @param security object representing security info
 * @param $source The source of the update if applicable (either isin group, ticker group)
 */
function populateTradeForm(security, $source) {
    if(security.hasOwnProperty("error")) {
        $("#trade_error").text(security.error)
            .parent().show();
        $source.attr("class", "form-group has-error");

        // Store old values
        var $currency = $("#currency"),
            currency = $currency.val(),
            sourceVal = $source.find("input").val();

        resetForm();

        // Restore values
        $currency.val(currency)
            .parents(".form-group").addClass("has-error");
        $source.addClass("has-error").find("input").val(sourceVal);
        $source.find("button").prop("disabled", false).attr("class", "btn btn-danger");

    } else {
        $("#trade_error").parent().hide();

        // Iterate over security object
        for (var prop in security) {
            if(security.hasOwnProperty(prop)) {
                $("#"+prop).val(security[prop]).parents(".form-group").addClass("has-success");
            }
        }

        //Ensures 2 decimal places
        $("#price").val(function (i, oldVal) {
           return parseFloat(oldVal).toFixed(2);
        });
        $("#isin_btn").prop("disabled", false).attr("class", "btn btn-success");
        $("#ticker_btn").prop("disabled", false).attr("class", "btn btn-success");
    }

    updateTotal();
    submitCheck();
}

function resetForm() {
    var $form = $("#trade_form");
    $form[0].reset();
    $form.find(".form-group").removeClass("has-success has-error");
    $("#form_panel").attr("class", "panel panel-primary");
    $("#add_trade_btn").prop("disabled", true).attr("class", "btn btn-primary btn-block");
    $("#isin_btn").prop("disabled", true).attr("class", "btn btn-primary");
    $("#ticker_btn").prop("disabled", true).attr("class", "btn btn-primary");
}

function currencyHandler() {
    $("#currency").parents('.form-group').addClass('has-success');

    // Enable search buttons if search field is valid
    $("#ticker_btn.btn-success").prop("disabled", false);
    $("#isin_btn.btn-success").prop("disabled", false);
    submitCheck();
}

/**
 * Sets a select icon to success when an option has been selected
 * @param $field
 */
function selectHandler($field) {
    $field.parents('.form-group').addClass('has-success');
    submitCheck();
}

/**
 * Validates isin input
 * @param $field The isin field object
 */
function isinInputHandler($field) {
    $field.val(function(i, oldval) {
        return oldval.replace(/[^a-zA-Z0-9]/g,"").toUpperCase()
    });

    searchValidator($field, validateISIN($field.val()));

    submitCheck();
}

/**
 * Validates ticker input
 * @param $field The ticker field object
 */
function tickerInputHandler($field) {
    $field.val(function(i, oldval) {
        return oldval.replace(/-/g,".").replace(/[^a-zA-Z.]/g,"").toUpperCase()
    });

    searchValidator($field, (/^([A-Z]+)(\.[A-Z]{1,2})?$/).test($field.val()));

    submitCheck();
}

function searchValidator($input, isValid) {

    var $parentGroup = $input.parents(".form-group");
    var $button = $input.next().find("button");

    if ($input.val().length > 0) {
        if (isValid) {
            $parentGroup.attr("class", "form-group has-success");
            $button.attr("class", "btn btn-success");

            if($("#currency").val() != null) {
                $button.prop("disabled", false);
            } else {
                $button.prop("disabled", true);
            }

        } else {
            $parentGroup.attr("class", "form-group has-error");
            $button.prop("disabled", true)
                .attr("class", "btn btn-danger");
        }
    } else {
        $parentGroup.attr("class", "form-group");
        $button.prop("disabled", true)
                .attr("class", "btn btn-primary");
    }
}

function secNameInputHandler($field) {
    if($field.val().length > 0) {
        $("#sec_name_group").attr("class", "form-group has-success");
    } else {
        $("#sec_name_group").attr("class", "form-group");
    }

    submitCheck();
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

    submitCheck();
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

    submitCheck();
}

/**
 * Update the trade total using number of shares and price
 * @param reset If true, resets total field to 0
 */
function updateTotal(reset) {

    var totalValue = $("#shares").val() * $("#price").val();

    if(!(isNaN(totalValue) || totalValue == 0 || reset)) {
        $("#total").val(totalValue.toLocaleString("en-US", {style: "currency", currency: "USD"}).substring(1));
        $("#total_group").addClass("has-success");
    } else {
        $("#total").val("0.00");
        $("#total_group").removeClass("has-success");
    }
}

/**
 * Checks if the form can be submitted enabling the submit button
 */
function submitCheck() {

    if($("#trade_form").find(".form-group:not(.has-success)").length == 0) {
        $("#form_panel").attr("class", "panel panel-success");
        $("#add_trade_btn").attr("class", "btn btn-success btn-block")
            .prop("disabled", false);
    } else {
        $("#form_panel").attr("class", "panel panel-primary");
        $("#add_trade_btn").attr("class", "btn btn-primary btn-block")
            .prop("disabled", true);
    }
}

function addTrade() {
    var trade = {
        currency: $("#currency").val(),
        isin:  $("#isin").val(),
        ticker: $("#ticker").val(),
        sec_name: $("#sec_name").val(),
        buy_sell: $("#buy_sell").val(),
        shares: $("#shares").val(),
        price: $("#price").val(),
        mkt_limit: $("#mkt_limit").val(),
        order_type: $("#order_type").val(),
        total: parseFloat($("#total").val().replace("," ,""))
    };
    pending_trades.push(trade);

    resetForm();

    updatePreview(trade);
}

/**
 * Verifies an isin is correct. Assume all alphabetic characters are upper case
 * @param isin String representing isin
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