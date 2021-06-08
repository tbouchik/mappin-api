const findTemplateKeyFromTag = (template, templateKeyOrTag) => {
    const nonRefTemplateKeys = template.keys.filter(x => x.type !== 'REF')
    let result = nonRefTemplateKeys.find(x => x.value === templateKeyOrTag || x.tags.includes(templateKeyOrTag))
    return result.value
  }


const identifyRole = (template, templateKeyIndex) => {
  result = null
  const roleArr = template.keys[templateKeyIndex].role
  const keyType = template.keys[templateKeyIndex].type
  if( roleArr && roleArr.constructor === Array && roleArr.length > 0 ) {
      switch (roleArr[roleArr.length - 1]) {
        case 'BANK_NAME':
          result = 'bankEntity';
          break;
        case 'DATE_FROM':
          result = 'dateBeg';
          break;
        case 'DATE_TO':
          result = 'dateEnd';
          break;
        case 'TOTAL_HT':
          result = 'totalHt';
          break;
        case 'TOTAL_TTC':
          result = 'totalTtc';
          break;
        case 'VENDOR':
          result = 'vendor';
          break;
        case 'VAT':
          result = 'vat';
          break;
      }
  }
  if(keyType === 'DATE' && result === null) {
    result = 'invoiceDate'
  }
  return result
}

module.exports = {
  identifyRole,
  findTemplateKeyFromTag,
};