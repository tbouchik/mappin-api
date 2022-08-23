const fuzz = require('fuzzball');

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
        case 'VAT':
          result = 'vat';
          break;
        case 'INVOICE_REF':
          result = 'ref';
          break;
        case 'DUE_DATE':
          result = 'dueDate';
          break;
        case 'PAYMENT_TERMS':
          result = 'paymentTerms';
          break;
      }
  }
  if(keyType === 'DATE' && result === null) {
    result = 'invoiceDate'
  }
  return result
}

const identifySemanticField = (role) => {
  result = null
  switch (role) {
    case 'totalHt':
      result = 'SUBTOTAL';
      break;
    case 'totalTtc':
      result = 'TOTAL';
      break;
    case 'vat':
      result = 'TAX';
      break;
    case 'ref':
      result = 'INVOICE_RECEIPT_ID';
      break;
    case 'paymentTerm':
      result = 'PAYMENT_TERMS';
      break;
    case 'invoiceDate':
      result = 'INVOICE_RECEIPT_DATE';
      break; 
  }
  return result
}

const templateKeyIsInvoiceDate = (templateKey) => {
  const isDateType = templateKey.type === 'DATE'
  const hadNoRole = templateKey.role === undefined || templateKey.role === null || templateKey.role === []
  return isDateType && hadNoRole;
}

const templateKeysHaveSameRole = (key1, key2) => {
  if( key1.role && key2.role ) {
    return key1.role.length === 2 && key2.role.length === 2 && key1.role[0] === key2.role[0] && key1.role[1]=== key2.role[1]
  }
  return false
}

const templateKeyoneToOneCompare = (newTemplateKey, refTemplateKey) => {
  if (templateKeyIsInvoiceDate(newTemplateKey) && templateKeyIsInvoiceDate(refTemplateKey)) {
    return 100
  } else if(templateKeysHaveSameRole(newTemplateKey,refTemplateKey)) {
    return 100
  } else if ((newTemplateKey.isImputable && !refTemplateKey.isImputable) ||(!newTemplateKey.isImputable && refTemplateKey.isImputable) ) {
    return 0
  } else if( newTemplateKey.type === 'REF' || refTemplateKey.type === 'REF') {
    return 0
  } else {
    return fuzz.ratio(newTemplateKey.value, refTemplateKey.value)
  }
}
module.exports = {
  identifyRole,
  identifySemanticField,
  findTemplateKeyFromTag,
  templateKeyoneToOneCompare
};