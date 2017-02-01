desc "PG Backup"
namespace :pg do
  task :backup => [:environment] do
    datestamp = Time.now.strftime("%Y-%m-%d_%H-%M-%S")
    backup_file_name = "seferbiz_#{datestamp}_dump.sql.gz"
    backup_file_location = "~/backups/seferbiz/#{backup_file_name}"
    sh "pg_dump biz_db_production | gzip -c > #{backup_file_location}"
    sh "aws s3 cp #{backup_file_location} s3://SeferBiz/backups/#{backup_file_name}"
  end
end
