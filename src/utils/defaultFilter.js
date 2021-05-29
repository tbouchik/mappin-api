const defaultFilter = [
  {value:'Seller Reference', type:'REF', tags:[]},
  {value:'Date', type:'DATE', tags:[]},
  {value:'Seller Name', type:'TEXT', tags:[], role: ['INVOICE', 'VENDOR']},
  {value:'Subtotal', type:'NUMBER', isImputable: true, tags:[], role: ['INVOICE', 'TOTAL_HT']},
  {value:'Tax', type:'NUMBER', isImputable: true, tags:[], role: ['INVOICE', 'VAT']},
  {value:'Total Due', type:'NUMBER', isImputable: true, tags:[], role: ['INVOICE', 'TOTAL_TTC']},
];

module.exports = defaultFilter;
