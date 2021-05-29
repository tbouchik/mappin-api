const stdFilterFr = [
    {value:'Référence Client', type:'REF', isImputable: false, tags:[], role: undefined},
    {value:'Date', type:'DATE', isImputable: false, tags:[], role: undefined},
    {value:'Fournisseur', type:'TEXT', isImputable: true, tags:[], role: ['INVOICE', 'VENDOR']},
    {value:'Sous-total', type:'NUMBER', isImputable: true, tags:[], role: ['INVOICE', 'TOTAL_HT']},
    {value:'Taxes', type:'NUMBER', isImputable: true, tags:[], role: ['INVOICE', 'VAT']},
    {value:'Total facturé', type:'NUMBER', isImputable: true, tags:[], role: ['INVOICE', 'TOTAL_TTC']},
  ];
  
  module.exports = stdFilterFr;
  