/**
 * Created by KareemHalabi on 6/24/2017.
 */

function emailHandler($email) {

    var $parentGroup = $email.closest(".form-group");

    // Email regex from https://stackoverflow.com/questions/46155/validate-email-address-in-javascript
    var emailPattern = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if ($email.val().length > 0) {

        if (emailPattern.test($email.val())) {
            $parentGroup.attr("class", "form-group has-success");
        } else {
            $parentGroup.attr("class", "form-group has-error");
        }

    } else {
        $parentGroup.attr("class", "form-group");
    }

    validateUserForm();

}

function accountHandler($account) {

    $account.val(function (i, oldval) {
        return oldval.replace(/[^a-zA-z0-9]/g, "").toUpperCase();
    });

    var $parentGroup = $account.closest(".form-group");

    var accountPattern = /^[A-Z0-9]{12}$/;

    if ($account.val().length > 0) {
        if (accountPattern.test($account.val())) {
            $parentGroup.attr("class", "form-group has-success");
        } else {
            $parentGroup.attr("class", "form-group has-error");
        }
    } else {
        $parentGroup.attr("class", "form-group");
    }

    validateUserForm();

}

function validateUserForm() {
    if ($("#add_user_form").find(".form-group:not(.has-success)").length == 0) {
        $("#add_user_panel").attr("class", "panel panel-success");
        $("#add_user_btn").attr("class", "btn btn-success btn-block")
            .prop("disabled", false);
    } else {
        $("#add_user_panel").attr("class", "panel panel-primary");
        $("#add_user_btn").attr("class", "btn btn-primary btn-block")
            .prop("disabled", true);
    }
}

function addUser() {

    // Toggle loader
    $("#add_user_label").css("display", "none");
    $("#add_user_loader").css("display", "inline-block");

    var user = {
        email: $("#email").val(),
        account: $("#account").val()
    };

    $.ajax({
        url: "/admin/add_authorized_user",
        method: "POST",
        data: JSON.stringify(user),
        timeout: 20000,
        contentType: "application/json",
        success: function (response) {
            if (response) {
                $("#add_user_error").text(response).parent().show();
            } else {
                location.reload();
            }
        },
        error: function (error) {
            $("#add_user_error").text("Error " + error.status + ": " + error.statusText).parent().show();
        },
        complete: function () {
            $("#add_user_label").css("display", "inline-block");
            $("#add_user_loader").css("display", "none");

            resetForm();
        }
    });
}

function editUser($row) {

    //TODO Find a better implementation
    var $email = $("#email");
    $email.val($row.find('[data-th="Email"]').text());
    $email.closest(".form-group").attr("class", "form-group has-success");

    var $account = $("#account");
    $account.val($row.find('[data-th="Account"]').text());
    $account.closest(".form-group").attr("class", "form-group has-success");

    validateUserForm();

    deleteUser($row)
}

function deleteUser($row) {

    //TODO Find a better implementation
    $.ajax({
        url: "/admin/delete_authorized_user",
        method: "POST",
        data: JSON.stringify({email: $row.find('[data-th="Email"]').text()}),
        timeout: 20000,
        contentType: "application/json",
        success: function () {
            $row.hide("slow", function () {
                $row.remove()
            });
        }
    });
}

function resetForm() {
    var $form = $("#add_user_form");
    $form[0].reset();
    $form.find(".form-group").removeClass("has-success has-error");
    $("#add_user_panel").attr("class", "panel panel-primary");
    $("#add_user_btn").attr("class", "btn btn-primary btn-block")
        .prop("disabled", true);
}