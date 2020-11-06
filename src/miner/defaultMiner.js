fuzz = require('fuzzball');
const { get } = require('lodash');
const { Console } = require('winston/lib/winston/transports');

const populateOsmium = (document, filter) => {
    // Detect boxes that correspond to template keys
    const options = {
      scorer: fuzz.ratio, // Any function that takes two values and returns a score, default: ratio
      processor: choice => choice.Text,  // Takes choice object, returns string, default: no processor. Must supply if choices are not already strings.
      limit: 1, // Max number of top results to return, default: no limit / 0.
      cutoff: 50, // Lowest score to return, default: 0
    };
    const choices = document.metadata.page_1
    console.log('---------------FUZZ------------------')
    filter.keys.map((filterItem) => {
      const query = filterItem.value;
      const results = fuzz.extract(query, choices, options);
      if (results.length) {
        console.log(`${query} ====> `, results[0])
      }
    })
    console.log('--------------------------------------')
    // Mapp each "KEY" box with a "VALUE" box
    return document;
};

module.exports = {
  populateOsmium
};

// defaultFilter.keys = [
//   {value:'Invoice Number', type:'NUMBER'},
//   {value:'Issue Date', type:'DATE'},
//   {value:'Order Id / Tracking No', type:'TEXT'},
//   {value:'Seller Name', type:'TEXT'},
//   {value:'Seller Address', type:'TEXT'},
//   {value:'Seller GST VAT Number', type:'NUMBER'},
//   {value:'Buyer Name', type:'TEXT'},
//   {value:'Buyer Address', type:'TEXT'},
//   {value:'Buyer GST VAT Number', type:'NUMBER'},
//   {value:'Subtotal', type:'NUMBER'},
//   {value:'Tax Rate', type:'NUMBER'},
//   {value:'Tax Total', type:'NUMBER'},
//   {value:'Total Due', type:'NUMBER'},
// ];

/** 
 * query = "126abzx";
choices = [{id: 345, model: "123abc"},
           {id: 346, model: "123efg"},
           {id: 347, model: "456abdzx"}];

options = {
        scorer: fuzz.partial_ratio, // Any function that takes two values and returns a score, default: ratio
        processor: choice => choice.model,  // Takes choice object, returns string, default: no processor. Must supply if choices are not already strings.
        limit: 2, // Max number of top results to return, default: no limit / 0.
        cutoff: 50, // Lowest score to return, default: 0
        unsorted: false // Results won't be sorted if true, default: false. If true limit will be ignored.
};

results = fuzz.extract(query, choices, options);

// [choice, score, index/key]
[ [ { id: 347, model: '456abdzx' }, 71, 2 ],
  [ { id: 345, model: '123abc' }, 67, 0 ] ]
 */