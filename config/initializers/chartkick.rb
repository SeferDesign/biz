Chartkick.options = {
  legend: 'none',
  colors: [
    '#29b165',
    '#f74f4f',
    '#4492ff',
    '#d49e53',
    '#944de3',
    '#261590',
    '#c7c7c7',
    '#000000',
    '#fff73d'
  ],
	prefix: '$',
	thousands: ',',
	decimal: '.',
  library: {
    plotOptions: {
      series: {
        animation: false
      },
			column: {
				grouping: false
			}
    },
    legend: {
      enabled: false
    },
    tooltip: {
			shared: true
    }
  }
}
