jQuery(document).ready(function($) {

	Highcharts.setOptions({
		chart: {
			defaultSeriesType: 'column',
			className: 'chart',
			animation: false
		},
		legend: {
			enabled: false
		},
		plotOptions: {
			series: {
				color: '#5cb85c'
			}
		}
	});

	$('.datepicker').datepicker({
		format: 'yyyy-mm-dd'
	});

	$('[data-print="true"]').click(function() {
		window.print();
	});

});
