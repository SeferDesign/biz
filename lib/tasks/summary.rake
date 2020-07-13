desc "Activity summaries"
namespace :summary do
  desc "Send weekly activity summary email"
  task :weekly => :environment do
    SummaryMailer.activity_summary('week').deliver
  end

  desc "Send monthly activity summary email"
  task :monthly => :environment do
    SummaryMailer.activity_summary('month').deliver
  end
end
