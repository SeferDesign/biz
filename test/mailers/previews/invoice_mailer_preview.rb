# Preview all emails at http://localhost:3000/rails/mailers/invoice_mailer
class InvoiceMailerPreview < ActionMailer::Preview

  def invoice_email
    InvoiceMailer.invoice_email(Invoice.first)
  end

end
