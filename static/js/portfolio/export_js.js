/**
 * Sets a select icon to success when an option has been selected
 *
 * @param $field The select field being checked
 */
function selectHandler($field) {
    $field.parents('.form-group').addClass('has-success');
    exportCheck();
}

function exportCheck() {
    // Check for divs without has-success (excluding the button div which is why === 1 instead of 0)
    if ($("#export_ts_form").find(".form-group:not(.has-success)").length === 1) {

        $("#export_ts_btn").prop("disabled", false);

    } else {

        $("#export_ts_btn").prop("disabled", true);
    }
}
