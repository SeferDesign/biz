class SummaryMailer < ActionMailer::Base
	helper :application
  default from: "Sefer Design Co. <info@seferdesign.com>"

  def weekly_activity_summary
    @date_start = Date.today - 6.days
    @date_end = Date.today
    @invoicesSent = Invoice.where(:date => @date_start..@date_end).order(date: :asc)
    @invoicesPaid = Invoice.paid.where(:paiddate => @date_start..@date_end).order(paiddate: :asc)

    email_html_raw = render_to_string(:layout => 'layouts/mail.html', :action => 'weekly_activity_summary.html', :locals => { :invoicesSent => @invoicesSent, :invoicesPaid => @invoicesPaid, :date_start => @date_start, :date_end => @date_end })

    html_roadie = Roadie::Document.new email_html_raw
    html_inlined = html_roadie.transform

    mail(to: "Robert Sefer <rob@seferdesign.com>", subject: "Weekly Activity Summary - #{@date_start.strftime("%b %e")} through #{@date_end.strftime("%b %e")}") do |format|
      format.html do
        html_inlined
      end
    end

  end

  def monthly_activity_summary
    last_date = Time.now.beginning_of_month - 1.day
    @date_start = last_date.beginning_of_month
    @date_end = last_date.end_of_month
    @invoicesSent = Invoice.where(:date => @date_start..@date_end).order(date: :asc)
    @invoicesPaid = Invoice.paid.where(:paiddate => @date_start..@date_end).order(paiddate: :asc)
    @expenses = Expense.where(:date => @date_start..@date_end).order(date: :asc)

    email_html_raw = render_to_string(:layout => 'layouts/mail.html', :action => 'monthly_activity_summary.html', :locals => { :invoicesSent => @invoicesSent, :invoicesPaid => @invoicesPaid, :expenses => @expenses, :date_start => @date_start, :date_end => @date_end })

    html_roadie = Roadie::Document.new email_html_raw
    html_inlined = html_roadie.transform

    mail(to: "Robert Sefer <rob@seferdesign.com>", subject: "Monthly Activity Summary - #{@date_start.strftime("%b %e")} through #{@date_end.strftime("%b %e")}") do |format|
      format.html do
        html_inlined
      end
    end

  end

end
