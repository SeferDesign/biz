class InvoiceMailer < ActionMailer::Base
	helper :application
  default from: "Sefer Design Co. <info@seferdesign.com>", reply_to: "Robert Sefer <rob@seferdesign.com>"

  def invoice_email(invoice)
    @invoice = invoice

    cc_list = []
    if invoice.client.email_accounting_2.present?
      cc_list.push(invoice.client.email_accounting_2)
    end
    if invoice.client.email_accounting_3.present?
      cc_list.push(invoice.client.email_accounting_3)
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

    mail(to: "#{invoice.client.contact} <#{invoice.client.email_accounting}>", subject: (Rails.env.development? ? 'DEV - ' : '') + 'Invoice from Sefer Design Company', cc: cc_list, bcc: ["Robert Sefer <rob@seferdesign.com>"], body: render_to_string(
			:layout => 'layouts/mail.txt',
			:action => 'invoice_email.txt',
			:locals => { :invoice => @invoice }
		))

  end

end
