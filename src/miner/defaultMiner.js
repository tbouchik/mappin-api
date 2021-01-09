const fuzz = require('fuzzball');
const moment = require('moment');

const populateOsmium = (document, template) => {
    let newDocument = Object.assign({}, document);
    // Detect boxes that correspond to template keys
    const metadata = newDocument.metadata.page_1;
    const indexesMapper = pullReadableBoxesIndexes(template, metadata)
    // Mapp each "KEY" box with a "VALUE" box
    indexesMapper.map((idxMapper) =>  {
      newDocument.osmium[idxMapper.template].Value = pullMirrorBoxText(metadata, idxMapper.metadata);
    });
    // Populate Date
    metadata.map((box) => {
      try {
        let startDate = moment('01/01/1990', 'DD/MM/YYYY');
        let endDate = moment('01/01/2030', 'DD/MM/YYYY');
        let date = moment(box.Text, 'DD/MM/YYYY');
        if (!date.includes('NaN') &&
            !date.includes('Invalid') &&
            date.isBefore(endDate) &&
            date.isAfter(startDate)
        ){
          newDocument.osmium[1].Value = date.format('DD/MM/YYYY')
        }
      }
      catch(err) {
        
      }
    })
    return newDocument;
};

const pullReadableBoxesIndexes = (template, metadata) => {
  let indexes = [];
  const options = {
    scorer: fuzz.ratio, // Any function that takes two values and returns a score, default: ratio
    processor: choice => choice.Text,  // Takes choice object, returns string, default: no processor. Must supply if choices are not already strings.
    limit: 1, // Max number of top results to return, default: no limit / 0.
    cutoff: 50, // Lowest score to return, default: 0
  };
  template.keys.map((templateItem, idx) => {
    let mapper = {template: idx};
    const query = templateItem.value;
    const results = fuzz.extract(query, metadata, options);
    if (results.length) {
      mapper.metadata = results[0][2];
      indexes.push(mapper);
    }
  })
  return indexes;
}
const pullMirrorBoxText = (metadata, index) => {
  let alignedOnRightBoxes = metadata.filter((box) => {
  
    return (
      box.Left > metadata[index].Left &&
      Math.abs(box.Top - metadata[index].Top) < 0.009 &&
      Math.abs(box.Height - metadata[index].Height) < 0.09 
    )
  })
  if (!alignedOnRightBoxes.length){
    return ''
  }
  else if (alignedOnRightBoxes.length && alignedOnRightBoxes.length > 1) {
    if (index+1 < metadata.length){
      return metadata[index + 1].Text
    }else{
      return ''
    }
  } else {
    return alignedOnRightBoxes[0].Text
  }
}

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

/** **** ShapeOsmium ****
 *    Extract Metadata
 *    Search for similar (skeleton)                                                         #Algo 1        
 *    if (similar skeleton<clientId;TemplateId> exists)
 *      then { populate }                                                                   #Algo 2
 *    else if (similar skeleton exists)
 *      then {
 *            do a bestGuessMapping between the 2 templateKeys                              #Algo 3
 *            do populate                                                                   #Algo 2
 *           }
 *    else
 *      then {
 *              do bestGuessMapping between templateKeys and keysBoundingBoxes              #Algo 4
 *              do bestGuessMapping between keysBoundingBoxes and valuesBoundingBoxes       #Algo 5
 *              do populate                                                                 #Algo 2
 *          } 
 */

 /** **** updateOsmium ****
 * If value is changed
 *    Change Skeleton.HashMap<Client-Template-Tuple; Bbox-TemplateKey-Pair>
 */

/**
 * Skeleton:
 *    Shape TODO:
 *    List<Client; Template>
 *    HashMap<ClientTemplateTuple; TemplateKeysBBoxesMappings>
 */