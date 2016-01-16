require 'mandrill'

class InvoiceMailer < ActionMailer::Base

  default from: "Sefer Design Co. <info@seferdesign.com>"
  helper :application

  def mandrill_client
    @mandrill_client ||= Mandrill::API.new Figaro.env.mandrill_api_key
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
      :encoding => 'UTF-8',
      :page_size => 'Letter'
    )

    email_html_raw = render_to_string(:layout => 'layouts/mail.html', :action => 'invoice_email.html', :locals => { :invoice => @invoice })

    html_roadie = Roadie::Document.new email_html_raw
    html_inlined = html_roadie.transform

    message = {
      from_name: "Sefer Design Company",
      from_email: 'info@seferdesign.com',
      to: @emailAddressList,
      preserve_recipients: true, # Preserves traditional CC but each email address counts seperately towards quota
      subject: "Invoice from Sefer Design Company",
      html: html_inlined,
      attachments: [{
        type: 'application/pdf',
        name: "#{@pdfFileName}.pdf",
        content: Base64.encode64(@tempPDF)
      }]
    }
    result = mandrill_client.messages.send message
  end

end
