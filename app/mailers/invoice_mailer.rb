class InvoiceMailer < ActionMailer::Base

  default from: "Sefer Design Co. <info@seferdesign.com>"
  helper :application

  def invoice_email(invoice)
    @invoice = invoice
    @client = Client.find(@invoice.client_id)

    @ourCCEmail = 'Robert Sefer <rsefer@gmail.com>'

    if @client.email_accounting_2.present? and @client.email_accounting_3.present?
      @emailCC = @client.email_accounting_2 + ', ' + @client.email_accounting_3 + ', ' + @ourCCEmail
    elsif @client.email_accounting_2.present?
      @emailCC = @client.email_accounting_2 + ', ' + @ourCCEmail
    else
      @emailCC = @ourCCEmail
    end

    @emailSubject = 'Invoice from Sefer Design Co.'
    @pdfFileName = @client.name.gsub(/[^0-9A-Za-z]/, '') + @invoice.date.to_s

    if @invoice.paid == true
      @pdfFileName = @pdfFileName + '_paid'
    end

    attachments[@pdfFileName + '.pdf'] = WickedPdf.new.pdf_from_string(
      render_to_string(
        :pdf => @pdfFileName,
        :layout => 'pdf/invoice.html',
        :template => 'invoices/show.pdf.erb'
      )
    )

    mail(
      to: @client.email_accounting,
      cc: @emailCC,
      subject: @emailSubject
    ) do |format|
      format.html { render 'invoice_email.html' }
      #format.text { render text: 'invoice_email.txt' }
    end
  end

end
