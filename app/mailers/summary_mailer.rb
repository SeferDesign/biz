require 'mandrill'

class SummaryMailer < ActionMailer::Base
  default from: "Sefer Design Co. <info@seferdesign.com>"
  helper :application

  def mandrill_client
    @mandrill_client ||= Mandrill::API.new Figaro.env.mandrill_api_key
  end

  def weekly_activity_summary
    @date_start = Date.today - 6.days
    @date_end = Date.today
    @invoicesSent = Invoice.where(:date => @date_start..@date_end).order(date: :asc)
    @invoicesPaid = Invoice.paid.where(:paiddate => @date_start..@date_end).order(paiddate: :asc)

    @emailAddressList = [{
      type: 'to',
      email: 'rsefer@gmail.com',
      name: 'Robert Sefer'
    }]

    email_html_raw = render_to_string(:layout => 'layouts/mail.html', :action => 'weekly_activity_summary.html', :locals => { :invoicesSent => @invoicesSent, :invoicesPaid => @invoicesPaid, :date_start => @date_start, :date_end => @date_end })

    html_roadie = Roadie::Document.new email_html_raw
    html_inlined = html_roadie.transform

    message = {
      from_name: "Sefer Design Company",
      from_email: 'info@seferdesign.com',
      to: @emailAddressList,
      subject: "Weekly Invoice Summary - #{@date_start.strftime("%b %e")} through #{@date_end.strftime("%b %e")}",
      html: html_inlined
    }
    result = mandrill_client.messages.send message

  end

end
