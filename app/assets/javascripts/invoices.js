$(document).on('change', '#invoice_client_id', function(e) {
	if ($('#invoice_client_id').val()) {
		return $.ajax('/invoices_controller/populate', {
			type: 'GET',
			dataType: 'script',
			data: {
				client_id: $('#invoice_client_id option:selected').val()
			}
		});
	}
});
