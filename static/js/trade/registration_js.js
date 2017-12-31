/**
 * Created by KareemHalabi on 7/4/2017.
 */

/**
 * Makes an ajax call to check if email is authorized to use the application.
 */
function checkEmail() {

    var $checkButton = $("#check_email_btn");

    $checkButton.val("Checking...");

    var request = {
        email: $("#pre_email_check").val()
    };

    $.ajax({
        url: "/accounts/check_authorized_email/",
        method: "POST",
        data: request,
        timeout: 20000,
        headers: {"X-CSRFToken": $("[name=csrfmiddlewaretoken]").val()},
        success: function (response) {

            $("#error").hide();
            $("#group_account").text(response); // response is group account
            $("#id_email").val(request.email);

            var fullname = request.email.split("@")[0].split(".");
            var $firstField = $("#id_first_name");
            $firstField.val( // Capitalize first letter
                fullname[0].charAt(0).toUpperCase() + fullname[0].slice(1)
            );
            nameValidator($firstField);

            var $lastField = $("#id_last_name");
            $lastField.val( // Capitalize first letter
                fullname[fullname.length - 1].charAt(0).toUpperCase() + fullname[fullname.length - 1].slice(1)
            );
            nameValidator($lastField);

            // Username defaults to first letter of first name + last name
            $("#id_username").val(
                fullname[0].charAt(0) + fullname[fullname.length - 1]
            );

            $("#pre_register_check").remove();
            $("#post_register_check").show();
        },
        error: function (error, errorType) {

            if (errorType == "timeout") {
                $("#error").text("Request timed out, please try again").show()
            } else {
                $("#error").text(error.responseText).show()
            }
        },
        complete: function () {
            $checkButton.val("Check address");
        }
    });
}

/**
 * Validates a name field by removing non alphabetic characters
 *
 * @param $field The name field to validate
 */
function nameValidator($field) {
    $field.val(function (i, oldVal) {
        return oldVal.replace(/[^a-zàâçéèêëîïôûùüÿñæœ \'-]/gi, "");
    });
}