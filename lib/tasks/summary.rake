desc "Send weekly activity summary email"
task :weekly_activity_summary => :environment do
  if Time.now.sunday?
    SummaryMailer.weekly_activity_summary.deliver
  end
end
