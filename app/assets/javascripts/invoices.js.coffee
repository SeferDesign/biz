$ ->
  $(document).on 'change', '#invoice_client_id', (evt) ->
    if $('#invoice_client_id').val()
      $.ajax '/invoices_controller/populate',
        type: 'GET'
        dataType: 'script'
        data: {
          client_id: $('#invoice_client_id option:selected').val()
        }
