$('#invoice_project_id').empty()
  .append('<%= escape_javascript(render(:partial => @projects)) %>')
