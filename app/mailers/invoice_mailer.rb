class InvoiceMailer < ActionMailer::Base
	helper :application
  default from: "Sefer Design Co. <info@seferdesign.com>", reply_to: "Robert Sefer <rob@seferdesign.com>"

  def invoice_email(invoice)
    @invoice = invoice

    cc_list = ["Robert Sefer <rob@seferdesign.com>"]
    if invoice.client.email_accounting_2.present?
      cc_list.push(invoice.client.email_accounting_2)
    end
    if invoice.client.email_accounting_3.present?
      cc_list.push(invoice.client.email_accounting_3)
    end

    email_html_raw = render_to_string(:layout => 'layouts/mail.html', :action => 'invoice_email.html', :locals => { :invoice => @invoice })
    html_roadie = Roadie::Document.new email_html_raw
		html_inlined = html_roadie.transform

		emailSubject = 'Invoice from Sefer Design Company'

		if Rails.env.development?
			emailSubject = 'TEST - ' + emailSubject
		end

		attachments["#{invoice.pdfFileName}.pdf"] = WickedPdf.new.pdf_from_string(
			render_to_string(
				:layout => 'pdf/invoice.html',
				:template => 'invoices/show.pdf.erb'
			).force_encoding('UTF-8').encode('UTF-8', {
				:invalid => :replace,
				:undef => :replace,
				:replace => '?'
			}),
			:encoding => 'UTF-8',
			:page_size => 'Letter'
		)

    mail(to: "#{invoice.client.contact} <#{invoice.client.email_accounting}>", subject: emailSubject, cc: cc_list) do |format|
      format.html do
        html_inlined
      end
    end

  end

end
