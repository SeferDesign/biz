Chartkick.options = {
  legend: 'none',
  colors: [
    '#5cb85c',
    '#d9534f',
    '#639ec9',
    '#d49e53',
    '#944de3',
    '#261590',
    '#c7c7c7',
    '#000000',
    '#fff73d'
  ],
  library: {
    plotOptions: {
      series: {
        animation: false
      }
    },
    legend: {
      enabled: false
    },
    tooltip: {
      valuePrefix: '$',
      valueDecimals: 0,
      pointFormat: '<b>{point.y}</b>'
    },
    yAxis: {
      format: 'currency',
      labels: {
        format: '${value:,.0f}'
    }
    }
  }
}
