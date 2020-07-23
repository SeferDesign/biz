jQuery(document).on('turbolinks:load', function() {

	var hash = document.location.hash;
	if (hash && $('.tab-content .tab-pane').length > 0) {
		$('.nav-tabs a[href="' + hash + '"]').tab('show');
	}

	$('.nav-tabs a').on('shown.bs.tab', function (e) {
		e.preventDefault();
		history.pushState({}, document.title, location.href.replace(location.hash, '') + e.target.hash);
	});

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

	$('.paid-today-btn').click(function() {
		setTimeout(function() {
			window.location = window.location.href;
		}, 200);
	});

	setDatepickers();

	$('[data-print="true"]').click(function() {
		window.print();
	});

	$('input[name="expense_type"]').change(function() {
		if ($('#expense_type_monthly').is(':checked')) {
			$('.expense-monthly-form-element').show();
		} else {
			$('.expense-monthly-form-element').hide();
		}
	});

	$('.yearsummary a[role="tab"]').click(function() {
		setTimeout(function() {
			if (Chartkick.charts['chart-1']) {
				Chartkick.charts['chart-1'].redraw();
			}
			if (Chartkick.charts['chart-2']) {
				Chartkick.charts['chart-2'].redraw();
			}
		}, 0);
	});

	$('#duplicate-expense-row').click(function(e) {
		e.preventDefault();
		var lastRow = $(this).parents().find('form').find('.new-expense-row').last();
		var clone = lastRow.clone();
		lastRow.after(clone).promise().done(function() {
			clone.find('.datepicker').datepicker({
				format: 'yyyy-mm-dd'
			});
			clone.find('select').val(lastRow.find('select').val());
			setDatepickers();
		});
	});

	$('.description-prefills a').click(function(e) {
		e.preventDefault();
		var newDescription = '';
		var variousPre = 'This invoice represents work through ';
		switch ($(this).attr('data-slug')) {
			case 'yesterday':
				newDescription = variousPre + getDateInFormat(-1);
			break;
			case 'today':
				newDescription = variousPre + getDateInFormat(0);
			break;
		}
		newDescription += '.';
		$('#invoice_description').html(newDescription);
	});

	Highcharts.setOptions({
		lang: {
			thousandsSep: ',',
			numericSymbols: null
		}
	});

	$('#generate-crypto-link').click(function() {
		$.ajax({
	    url: '/invoices_controller/generate_crypto_link',
	    data: {
	      id: $(this).attr('data-invoice-id'),
	      access_token: $(this).attr('data-access-token')
	    },
	    success: function(result) {
				if (result.body.data.hosted_url) {
					$('#crypto-link').attr('href', result.body.data.hosted_url);
					$('#crypto-link')[0].click();
				}
	    }
	  });
	});

	var averageCharts = [
		{ id: 'year-all-chart' },
		{ id: 'year-income-chart' },
		{ id: 'year-expenses-chart' }
	];
	for (var c = 0; c < averageCharts.length; c++) {
		addAverageToChart(averageCharts[c].id);
	}

});

function addAverageToChart(chartID) {
	var chart = Chartkick.charts[chartID];
	if (!chart) { return; }
	setTimeout(function() {
		var data = chart.getData()[0].data;
		var dataUsed = [];
		for (var i = 0; i < data.length; i++) {
			if (data[i][1] > 0) {
				dataUsed.push(data[i][1]);
			}
		}
		var dataSum = dataUsed.reduce(function(a, b) {
			return a + b;
		}, 0);
		var options = chart.getOptions();
		options.library.yAxis = {
			plotLines: [{
				color: '#639ec9',
				value: dataSum / dataUsed.length,
				width: '1',
				zIndex: 2
			}]
		};
		chart.setOptions(options);
	}, 1000);
}

function setDatepickers() {
	$('.datepicker').datepicker('destroy');
	$('.datepicker').datepicker({
		format: 'yyyy-mm-dd',
		autoclose: true
	});
}

function getDateInFormat(days) {
	var date = new Date();
	date.setDate(date.getDate() + days);
	return date.getFullYear() + '-'+ (date.getMonth() < 9 ? '0' : '') + (date.getMonth() + 1) + '-' + (date.getDate() < 9 ? '0' : '') + date.getDate();
}
