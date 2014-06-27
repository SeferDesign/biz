class Goal < ActiveRecord::Base

  def actualamount
    if self.timeperiod == 'Year'
      if self.goaltype == 'Total'
        Invoice.paidByYear(self.enddate.year).sum('cost')
      elsif self.goaltype == 'Contract'
        Invoice.paidByYear(self.enddate.year).contract.sum('cost')
      elsif self.goaltype == 'Hourly'
        Invoice.paidByYear(self.enddate.year).hourly.sum('cost')
      elsif self.goaltype == 'Retainer'
        Invoice.paidByYear(self.enddate.year).retainer.sum('cost')
      end
    elsif self.timeperiod == 'Month'
      if self.goaltype == 'Total'
        Invoice.paidByMonth(self.enddate.month).sum('cost')
      elsif self.goaltype == 'Contract'
        Invoice.paidByMonth(self.enddate.month).contract.sum('cost')
      elsif self.goaltype == 'Hourly'
        Invoice.paidByMonth(self.enddate.month).hourly.sum('cost')
      elsif self.goaltype == 'Retainer'
        Invoice.paidByMonth(self.enddate.month).retainer.sum('cost')
      end
    else
      0
    end
  end

end
