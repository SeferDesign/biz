class Goal < ActiveRecord::Base

  scope :recent, -> { where('enddate >= ?', Date.today - 6.months) }

  def invoicesPaidInTimeScope
    if self.timeperiod == 'Year'
      Invoice.paidByYear(self.enddate.year)
    elsif self.timeperiod == 'Month'
      Invoice.paidByMonth(self.enddate.year, self.enddate.month)
    else
      nil
    end
  end

  def actualamount
    if self.goaltype == 'Total'
      working = self.invoicesPaidInTimeScope
    elsif self.goaltype == 'Contract'
      working = self.invoicesPaidInTimeScope.contract
    elsif self.goaltype == 'Hourly'
      working = self.invoicesPaidInTimeScope.hourly
    end
    if working and working.length > 0
      working.sum('cost')
    else
      0
    end
  end

  def status
    if Date.today > self.enddate
      'Past'
    elsif Date.today < self.startdate
      'Future'
    else
      'Current'
    end
  end

  def met
    if self.actualamount >= self.amount
      true
    else
      false
    end
  end

  def actualProgressAsFraction
    self.actualamount / self.amount
  end

  def fullPeriodDays
    (self.enddate - self.startdate + 1).to_f
  end

  def paceDays
    (Date.today - self.startdate + 1).to_f
  end

  def paceAsFraction
    self.paceDays / self.fullPeriodDays
  end

end
