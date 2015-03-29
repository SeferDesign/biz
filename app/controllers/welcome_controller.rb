class WelcomeController < ApplicationController

  def index

    @months = []

    4.downto(0).each do |m|
      @months.push([m.month.ago.strftime("%B"), Invoice.paidByMonth(m.month.ago).sum('cost').to_f])
    end

    @incomeChart = LazyHighCharts::HighChart.new('graph') do |f|
      f.series(
        :name => 'Revenue',
        :data => @months.map{ |x,y| [y] },
        :animation => false
      )
      f.xAxis(
        :categories => @months.map{ |x,y| [x] }
      )
      f.chart(
        {
          :defaultSeriesType => 'column'
        }
      )
    end

  end

end
