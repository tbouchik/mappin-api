const defaultFilter = [
  {value:'Seller Reference', type:'REF'},
  {value:'Date', type:'DATE'},
  {value:'Order Id', type:'TEXT'},
  {value:'Seller Name', type:'TEXT'},
  {value:'Seller Address', type:'TEXT', isImputable: true},
  {value:'Subtotal', type:'NUMBER', isImputable: true},
  {value:'Tax', type:'NUMBER', isImputable: true},
  {value:'Total Due', type:'NUMBER', isImputable: true},
];

module.exports = defaultFilter;
