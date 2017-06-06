/**
 * Created by KareemHalabi on 6/4/2017.
 */
var form;
window.onload = function() {
    this.form = document.getElementById("trade_form");
};

function searchByIsin() {

    document.getElementById("isin_search_icon").style.display = "none";
    document.getElementById("isin_loader").style.display = "inline-block";
    var isinSearch = {"ISIN":form.elements.namedItem("isin").value,
        "currency":form.elements.namedItem("currency").value};


    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if(this.readyState == 4) {
            if(this.status == 200) {
                populateTradeForm(JSON.parse(this.responseText));
            }
            else { // Error occurred
                var errorText = document.getElementById("error_message");
                errorText.innerHTML = "Error "+this.status + ": " + this.statusText;
                errorText.parentNode.style.display = "block";
            }
            document.getElementById("isin_search_icon").style.display = "inline-block";
            document.getElementById("isin_loader").style.display = "none";
        }
    };
    xhttp.open("GET", "search_by_isin?"+encodeQueryData(isinSearch), true);
    xhttp.send();
}

function searchByTicker() {

    document.getElementById("ticker_search_icon").style.display = "none";
    document.getElementById("ticker_loader").style.display = "inline-block"
    var tickerSearch = {"ticker":form.elements.namedItem("ticker").value,
        "currency":form.elements.namedItem("currency").value};

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if(this.readyState == 4) {
            if(this.status == 200) {
                populateTradeForm(JSON.parse(this.responseText));
            }
            else { // Error occurred
                var errorText = document.getElementById("error_message");
                errorText.innerHTML = "Error "+this.status + ": " + this.statusText;
                errorText.parentNode.style.display = "block";
            }
            document.getElementById("ticker_search_icon").style.display = "inline-block";
            document.getElementById("ticker_loader").style.display = "none";
        }
    };
    xhttp.open("GET", "search_by_ticker?"+encodeQueryData(tickerSearch), true);
    xhttp.send();
}

function populateTradeForm(security) {
    var errorText = document.getElementById("error_message");
    if(security.error.length > 0) {
        errorText.innerHTML = security.error;
        errorText.parentNode.style.display = "block";
    } else {
        errorText.parentNode.style.display = "none";
        document.getElementById("isin").value = security.ISIN;
        document.getElementById("ticker").value = security.ticker;
        document.getElementById("sec_name").value = security.security;
        document.getElementById("price").value = security.last_close_price.toFixed(2);
    }
}

function isinInputHandler(field) {
    field.value = field.value.replace(/[^a-zA-Z0-9]/g,"").toUpperCase();

    var parentDiv = document.getElementById("isin_group");
    var isinBtn = document.getElementById("isin_btn");

    if(field.value.length > 0) {
        if(validateISIN(field.value)) {
            parentDiv.className = "form-group has-success";
            isinBtn.disabled = false;
        } else {
            parentDiv.className = "form-group has-error";
            isinBtn.disabled = true;
        }
    } else {
        parentDiv.className = "form-group";
        isinBtn.disabled = true;
    }

}

function tickerInputHandler(field) {
    field.value = field.value.replace(/-/g,".").replace(/[^a-zA-Z\.]/g,"").toUpperCase();

    var parentDiv = document.getElementById("ticker_group");
    var tickerBtn = document.getElementById("ticker_btn");

    if(field.value.length > 0) {
        if((/^([A-Z]+)(\.[A-Z]{1,2})?$/).test(field.value)) {
            parentDiv.className = "form-group has-success";
            tickerBtn.disabled = false;
        } else {
            parentDiv.className = "form-group has-error";
            tickerBtn.disabled = true;
        }

    } else {
        parentDiv.className = "form-group";
        tickerBtn.disabled = true;
    }
}

function encodeQueryData(data) {
   var params = [];
   for (var d in data)
     params.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
   return params.join('&');
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