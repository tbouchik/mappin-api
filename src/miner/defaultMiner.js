const fuzz = require('fuzzball');
const moment = require('moment');

const populateOsmium_V1 = (document, template) => {
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
  populateOsmium_V1
};