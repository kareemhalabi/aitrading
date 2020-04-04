/**
 * Created by KareemHalabi on 6/4/2017.
 */

// Global variable storing pending trades
var pending_trades = [];

//------------------------------ Input Handlers -------------------------------

/**
 * Handles an input event for the currency field. Sets "has-success" class when
 * currency value selected and enables search buttons if applicable.
 */
function currencyHandler() {
    $("#currency").parents('.form-group').addClass('has-success');

    // Enable search buttons if search field is valid
    $("#ticker_btn.btn-success").prop("disabled", false);
    $("#isin_btn.btn-success").prop("disabled", false);
    submitCheck();
}

/**
 * Sets a select icon to success when an option has been selected
 *
 * @param $field The select field being checked
 */
function selectHandler($field) {
    $field.parents('.form-group').addClass('has-success');
    submitCheck();
}

/**
 * Handles an input event for the ticker search field
 *
 * @param $field The ticker field object
 */
function tickerInputHandler($field) {
    // Remove invalid characters and convert to upper case.
    // Also convert a '-' to '.' if present
    $field.val(function(i, oldval) {
        return oldval.replace(/-/g,".").replace(/[^a-zA-Z.]/g,"").toUpperCase()
    });

    searchValidator($field, (/^([A-Z]+)(\.[A-Z]{1,2})?$/).test($field.val()));

    submitCheck();
}

/**
 * Handles an input event for the ISIN search field
 *
 * @param $field The isin field object
 */
function isinInputHandler($field) {
    // Remove invalid characters and convert to upper case
    $field.val(function(i, oldval) {
        return oldval.replace(/[^a-zA-Z0-9]/g,"").toUpperCase()
    });

    searchValidator($field, validateISIN($field.val()));

    submitCheck();
}

/**
 * Handles an input event for the security name field
 *
 * @param $field The security name field object
 */
function secNameInputHandler($field) {

    if($field.val().length > 0) {
        $("#sec_name_group").attr("class", "form-group has-success");
    } else {
        $("#sec_name_group").attr("class", "form-group");
    }

    submitCheck();
}

/**
 * Handles an input event for the shares input field
 *
 * @param $field The input field object
 */
function sharesInputHandler($field) {

    // Strip non-numeric for browsers without "number" support
    $field.val(function (i, oldval) {
        return oldval.replace(/[^0-9.]/,"");
    });

    if($field.val().length > 0) {

        if(parseFloat($field.val()) > 0) {
            // Non-empty and positive shares

            $("#shares_group").attr("class", "form-group has-success");
            updateTotal(false);
        } else {
            // Non-empty and non-positive shares

            $("#shares_group").attr("class","form-group has-error");
            updateTotal(true);
        }

    } else {
        // Empty shares

        $("#shares_group").attr("class", "form-group");
        updateTotal(true);
    }

    submitCheck();
}

/**
 * Handles an input event for the price input field
 *
 * @param $field The input field object
 */
function priceInputHandler($field) {
    // Strip non-numeric for browsers without "tel" support
    $field.val(function (i, oldval) {
        return oldval.replace(/[^0-9.]/,"");
    });

    if($field.val().length > 0) {

        if ((/^\d+\.?\d{0,2}$/).test($field.val()) && parseFloat($field.val()) > 0) {
            // Non-empty and valid (positive and max 2 decimal places)

            $("#price_group").attr("class", "form-group has-success");
            updateTotal(false);

        } else {
            // Non-empty and invalid price

            $("#price_group").attr("class","form-group has-error");
            updateTotal(true);
        }
    } else {
        // Empty price

        $("#price_group").attr("class", "form-group");
        updateTotal(true);
    }

    submitCheck();
}

//---------------------------- End Input Handlers -----------------------------

/**
 * Verifies an isin is correct. Assume all alphabetic characters are upper case
 *
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
    return sum % 10 === 0;
}

/**
 * Determines if a security search request is valid. Handles CSS changes and
 * enabling/disabling of the appropriate search button.
 *
 * @param $input the source of the search
 * @param isValid boolean representing if the query from $input is valid or not
 */
function searchValidator($input, isValid) {

    var $parentGroup = $input.parents(".form-group");
    var $button = $input.next().find("button");

    if ($input.val().length > 0) {

        if (isValid) {
            // Non-empty and valid input

            $parentGroup.attr("class", "form-group has-success");
            $button.attr("class", "btn btn-success");

            // Enable search button only if currency is present as well
            if($("#currency").val() !== null) {
                $button.prop("disabled", false);
            } else {
                $button.prop("disabled", true);
            }

        } else {
            // Non-empty and invalid input

            $parentGroup.attr("class", "form-group has-error");
            $button.prop("disabled", true)
                .attr("class", "btn btn-danger");
        }
    } else {
        // Empty input

        $parentGroup.attr("class", "form-group");
        $button.prop("disabled", true)
            .attr("class", "btn btn-primary");
    }
}

/**
 * Searches for a security by isin. On success, populate trade form with details.
 * On ajax error, display error code and message in error box.
 */
function searchByIsin() {

    // Toggle loader
    $("#isin_search_icon").css("display", "none");
    $("#isin_loader").css("display", "inline-block");

    var isinSearch = {isin: $("#isin").val(),
        currency: $("#currency").val()};

    $.ajax({url: "search_by_isin/", data: isinSearch, timeout: 20000,
            success: function(response) {
                populateTradeForm(response, $("#isin_group"));
            },
            error: function (error) {
                $("#trade_error").text("Error " + error.status + ": " + error.statusText).parent().show();
            },
            complete: function () {
                    // Restore search icon
                    $("#isin_search_icon").css("display", "inline-block");
                    $("#isin_loader").css("display", "none");
            }
            });
}

/**
 * Searches for a security by ticker. Note only alphabetic characters and the period
 * are allowed. On success, populate trade form with details. On ajax error, display
 * error code and message in error box.
 */
function searchByTicker() {

    // Toggle loader
    $("#ticker_search_icon").css("display", "none");
    $("#ticker_loader").css("display", "inline-block");

    var tickerSearch = {ticker: $("#ticker").val(),
        currency: $("#currency").val()};

    $.ajax({url: "search_by_ticker/", data: tickerSearch, timeout: 20000,
        success: function(response) {
            populateTradeForm(response, $("#ticker_group"));
        },
        error: function (error) {
            $("#trade_error").text("Error " + error.status + ": " + error.statusText).parent().show();
        },
        complete: function () {
                // Restore search icon
                $("#ticker_search_icon").css("display", "inline-block");
                $("#ticker_loader").css("display", "none");
        }
        });
}

/**
 * Updates data fields with security information. Clears other fields if error returned
 *
 * @param security JSON object representing security info
 * @param $source The source of the update if applicable (either isin group, ticker group)
 */
function populateTradeForm(security, $source) {

    // Check for error and reset fields if present
    if (security.hasOwnProperty("error")) {

        $("#trade_error").text(security.error)
            .parent().show();
        $source.attr("class", "form-group has-error");

        // Store old values
        var $currency = $("#currency"),
            currency = $currency.val(),
            sourceVal = $source.find("input").val();

        resetForm();

        // Restore values and styles
        $currency.val(currency)
            .parents(".form-group").addClass("has-error");
        $source.addClass("has-error").find("input").val(sourceVal);
        $source.find("button").prop("disabled", false).attr("class", "btn btn-danger");

    } else {

        $("#trade_error").parent().hide();

        // Iterate over security object and populate appropriate fields
        for (var prop in security) {
            if (security.hasOwnProperty(prop)) {
                $("#" + prop).val(security[prop]).parents(".form-group").addClass("has-success");
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

/**
 * Resets the trade form by clearing all values, restoring CCS classes to their
 * defaults and disabling input buttons
 */
function resetForm() {
    var $form = $("#trade_form");
    $form[0].reset();
    $form.find(".form-group").removeClass("has-success has-error");
    $("#trade_details_panel").attr("class", "panel panel-primary");
    $("#add_trade_btn").prop("disabled", true).attr("class", "btn btn-primary btn-block");
    $("#isin_btn").prop("disabled", true).attr("class", "btn btn-primary");
    $("#ticker_btn").prop("disabled", true).attr("class", "btn btn-primary");
}

/**
 * Update the trade total using number of shares and price
 *
 * @param reset If true, resets total field to 0
 */
function updateTotal(reset) {

    var totalValue = $("#shares").val() * $("#price").val();

    if(!(isNaN(totalValue) || totalValue === 0 || reset)) {

        // Set success and format with thousand separators
        $("#total").val(totalValue.toLocaleString("en-US", {style: "currency", currency: "USD"}).substring(1));
        $("#total_group").addClass("has-success");
    } else {
        $("#total").val("0.00");
        $("#total_group").removeClass("has-success");
    }
}

/**
 * Checks if the form can be submitted, enabling the submit button if true
 */
function submitCheck() {

    // Check if porfolio exists and sale is valid i.e you own the security and have enough shares to sell
    if(typeof portfolio !== "undefined" && portfolio.length > 0) {

        if($("#buy_sell").val() === "SELL") {
            var shares_owned = 0;

            var isin = $("#isin").val();

            for(var i = 0; i < portfolio.length; i++) {
                var security = portfolio[i];
                if(isin === security.isin) {
                    shares_owned = security['shares'];
                    break;
                }
            }

            if (shares_owned === 0) {
                $("#trade_error").text("You cannot sell a security that you do not own").parent().show();
                $("#shares_group").attr("class","form-group has-error");
            } else if ($("#shares").val() > shares_owned) {
                $("#trade_error").text("You cannot sell more shares of this security than you own").parent().show();
                $("#shares_group").attr("class","form-group has-error");
            } else {
                $("#trade_error").parent().hide();
            }

        }

    }

    if($("#trade_form").find(".form-group:not(.has-success)").length === 0) {

        $("#trade_details_panel").attr("class", "panel panel-success");
        $("#add_trade_btn").attr("class", "btn btn-success btn-block")
            .prop("disabled", false);

    } else {

        $("#trade_details_panel").attr("class", "panel panel-primary");
        $("#add_trade_btn").attr("class", "btn btn-primary btn-block")
            .prop("disabled", true);

    }
}
/**
 * Input handler for add trade button. Gets data from input fields and appends
 * trade object to list of pending trades
 */
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
