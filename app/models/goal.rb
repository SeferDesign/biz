class Goal < ActiveRecord::Base

  scope :recent, -> { where('enddate >= ?', Date.today - 6.months) }

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
        Invoice.paidByMonth(self.enddate).sum('cost')
      elsif self.goaltype == 'Contract'
        Invoice.paidByMonth(self.enddate).contract.sum('cost')
      elsif self.goaltype == 'Hourly'
        Invoice.paidByMonth(self.enddate).hourly.sum('cost')
      elsif self.goaltype == 'Retainer'
        Invoice.paidByMonth(self.enddate).retainer.sum('cost')
      end
    else
      0
    end
  end

end
