class SummaryMailer < ActionMailer::Base
	helper :application
	default from: "Sefer Design Co. <info@seferdesign.com>"

	def activity_summary(length = 'week')
		if length == 'month'
			@subjectShort = 'Monthly Activity Summary'
			last_date = Time.now.beginning_of_month - 1.day
			@date_start = last_date.beginning_of_month
			@date_end = last_date.end_of_month
		else
			@subjectShort = 'Weekly Activity Summary'
			@date_start = Date.today - 6.days
			@date_end = Date.today
		end
		@invoicesSent = Invoice.where(:date => @date_start..@date_end).order(date: :asc)
		@invoicesPaid = Invoice.paid.where(:paiddate => @date_start..@date_end).order(paiddate: :asc)
		@expenses = Expense.where(:date => @date_start..@date_end).order(date: :asc)

		mail(to: "Robert Sefer <rob@seferdesign.com>", subject: "#{@subjectShort} - #{@date_start.strftime("%b %-d")} through #{@date_end.strftime("%b %-d")}", body: render_to_string(
			:layout => 'layouts/mail.txt',
			:action => 'activity_summary.txt',
			:locals => {
				:subjectShort => @subjectShort,
				:invoicesSent => @invoicesSent,
				:invoicesPaid => @invoicesPaid,
				:expenses => @expenses,
				:date_start => @date_start,
				:date_end => @date_end
			}
		))
	end

end
