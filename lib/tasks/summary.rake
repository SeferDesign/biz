desc "Send weekly activity summary email"
task :weekly_activity_summary => :environment do
  if Time.now.monday?
    SummaryMailer.weekly_activity_summary.deliver
  end
end
