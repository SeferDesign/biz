desc "Activity summaries"
namespace :summary do
  desc "Send weekly activity summary email"
  task :weekly => :environment do
    SummaryMailer.weekly_activity_summary.deliver
  end

  desc "Send monthly activity summary email"
  task :monthly => :environment do
    SummaryMailer.monthly_activity_summary.deliver
  end
end
