module GoalsHelper

  def percentageDisplay(amount)
    number_to_percentage(amount * 100, :strip_insignificant_zeros => true, :precision => 2)
  end

  def progressbarDisplay
    if @goal.actualProgressAsFraction > @goal.paceAsFraction
      firstLength = @goal.paceAsFraction
      secondLength = @goal.actualProgressAsFraction - @goal.paceAsFraction
    else
      firstLength = @goal.actualProgressAsFraction
      secondLength = @goal.paceAsFraction - @goal.actualProgressAsFraction
    end
    if @goal.actualProgressAsFraction > @goal.paceAsFraction
      progresscolorclass = 'success'
    else
      progresscolorclass = 'danger'
    end
    fullProgressMarkup = '<div class="progress progress-striped"><div class="progress-bar progress-bar-primary" role="progressbar" style="width: ' + percentageDisplay(firstLength) + '"></div><div class="progress-bar progress-bar-' + progresscolorclass + '" role="progressbar"style="width: ' + percentageDisplay(secondLength) + '"></div></div>'
    fullProgressMarkup.html_safe
  end

end
