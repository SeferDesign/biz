if Rails.env.development?
  WickedPdf.config = {
    exe_path: "#{ENV['GEM_HOME']}/bin/wkhtmltopdf"
  }
end
