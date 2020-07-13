# Preview all emails at http://localhost:3000/rails/mailers/summary_mailer
class SummaryMailerPreview < ActionMailer::Preview

	def weekly_activity_summary
		SummaryMailer.weekly_activity_summary
	end

	def monthly_activity_summary
		SummaryMailer.monthly_activity_summary
	end

end
