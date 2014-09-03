$('#invoice_project_id').empty().append('<%= escape_javascript(render(:partial => @client.projects)) %>')
$('#invoice_paymenttype').val('<%= @client.preferred_paymenttype %>')
