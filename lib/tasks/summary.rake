desc "Send weekly activity summary email"
task :weekly_activity_summary => :environment do
  SummaryMailer.weekly_activity_summary.deliver
end
