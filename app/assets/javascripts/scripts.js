jQuery(document).on('turbolinks:load', function() {

	$('#paid-date-icon-wrap').click(function() {
		var dateToday = new Date();
		var dateYear = dateToday.getFullYear().toString();
		var dateMonth = (dateToday.getMonth() + 1).toString();
		if (dateMonth.length == 1) {
			dateMonth = '0' + dateMonth;
		}
		var dateDay = dateToday.getDate().toString();
		if (dateDay.length == 1) {
			dateDay = '0' + dateDay;
		}
		var dateAsString = dateYear + '-' + dateMonth + '-' + dateDay;
		$('#invoice_paiddate').val(dateAsString);
		$('#invoice_paid_true').prop('checked', true);
	});

	$('.datepicker').datepicker({
		format: 'yyyy-mm-dd'
	});

	$('[data-print="true"]').click(function() {
		window.print();
	});

});
