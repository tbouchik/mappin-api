const defaultFilter = [
  {value:'Seller Reference', type:'REF', tags:[]},
  {value:'Date', type:'DATE', tags:[]},
  {value:'Order Id', type:'TEXT', tags:[]},
  {value:'Seller Name', type:'TEXT', tags:[]},
  {value:'Seller Address', type:'TEXT', isImputable: true, tags:[]},
  {value:'Subtotal', type:'NUMBER', isImputable: true, tags:[]},
  {value:'Tax', type:'NUMBER', isImputable: true, tags:[]},
  {value:'Total Due', type:'NUMBER', isImputable: true, tags:[]},
];

module.exports = defaultFilter;
