# Preview all emails at http://localhost:3000/rails/mailers/summary_mailer
class SummaryMailerPreview < ActionMailer::Preview

	def activity_summary_week
		SummaryMailer.activity_summary('week')
	end

	def activity_summary_month
		SummaryMailer.activity_summary('month')
	end

end
