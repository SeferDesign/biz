require 'mandrill'

class InvoiceMailer < ActionMailer::Base

  default from: "Sefer Design Co. <info@seferdesign.com>"
  helper :application

  def mandrill_client
    @mandrill_client ||= Mandrill::API.new Figaro.env.mandrill_api_key
  end

  def invoice_email_old(invoice)
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

  def invoice_email(invoice)
    @invoice = invoice

    @emailAddressList = [{
      type: 'to',
      email: @invoice.client.email_accounting
    }]
    @emailAddressList.push({
      type: 'cc',
      email: 'rsefer@gmail.com',
      name: 'Robert Sefer'
    })
    if @invoice.client.email_accounting_2.present?
      @emailAddressList.push({
        type: 'cc',
        email: @invoice.client.email_accounting_2
      })
    end
    if @invoice.client.email_accounting_3.present?
      @emailAddressList.push({
        type: 'cc',
        email: @invoice.client.email_accounting_3
      })
    end

    @pdfFileName = @invoice.client.name.gsub(/[^0-9A-Za-z]/, '') + @invoice.date.to_s

    if @invoice.paid == true
      @pdfFileName = @pdfFileName + '_paid'
    end

    pdf = render_to_string(
      :layout => 'pdf/invoice.html',
      :template => 'invoices/show.pdf.erb'
    ).force_encoding('UTF-8').encode('UTF-8', { :invalid => :replace, :undef => :replace, :replace => '?' })

    @tempPDF = WickedPdf.new.pdf_from_string(
      pdf,
      :encoding => 'UTF-8'
    )

    message = {
      from_name: "Sefer Design Company",
      from_email: 'info@seferdesign.com',
      to: @emailAddressList,
      subject: "Invoice from Sefer Design Company",
      html: render_to_string(:action => 'invoice_email.html', :locals => { :invoice => @invoice }, :layout => false),
      attachments: [{
        type: 'application/pdf',
        name: "#{@pdfFileName}.pdf",
        content: Base64.encode64(@tempPDF)
      }]
    }
    result = mandrill_client.messages.send message
  end

end
