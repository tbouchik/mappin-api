const { cloneDeep } = require('lodash');

const checkAllFieldsPopulated = (document) => {
    let fields = []
    let imputations = []
    if(!(!!document.journal)) {
        fields.push('journal')
    }
    if(!(!!document.vendor)) {
        fields.push('vendor')
    }
    if(!(!!document.invoiceDate)) {
        fields.push('invoiceDate')
    }
    if (document.osmium) {
        document.osmium.forEach(element => {
            if(!element.Value) {
                fields.push(element.Key)
            }
            if(element.Imputation === "") {
                imputations.push(element.Key)
            }
        })
    }
    if (document.references) {
        document.references.forEach(element => {
            if (element.DisplayedLibelle && !element.Price){
                fields.push(element.DisplayedLibelle)
            }
            if(element.DisplayedLibelle && element.Imputation === "") {
                imputations.push(element.DisplayedLibelle)
            }
        })
    }
    return {
        value: fields.length != 0 || imputations.length != 0,
        name:"FIELDS_MISSING",
        fields,
        imputations,
    }
}

const checkTotalsAreBalanced = (document) => {
    const ttc = parseFloat(document.totalTtc).toFixed(2)
    const vat = parseFloat(document.vat).toFixed(2)
    const refs = document.references.map(x => isValidNumber(x.Price) ?parseFloat(x.Price).toFixed(2):0.0)
    const refsSum = computeSum(refs, vat)
    const isTotalBalanced = ttc === refsSum
    return {
        value: !isTotalBalanced,
        name: "TOTALS_UNBALANCED",
        refs:computeSum(refs, 0),
        ttc,
        vat,
    }
}

const computeSum = (arr, offset) => {
    return arr.reduce((a,b)=> parseFloat(a)+parseFloat(b), parseFloat(offset)).toFixed(2)
}

const isValidNumber = (num) => {
    try {
      return Boolean((num && !isNaN(parseFloat(num))) || parseInt(num) === 0)
    } catch (e) {
      return false
    }
}

const runRules = (document) => {
    let rules = document.rules ? cloneDeep(document.rules) : {}
    if (document.status === 'pending' || document.status === 'error') {
        for (var rule in rules) delete rules[rule]
        rules.isNotSmelted = true
    } else {
        for (var rule in rules) delete rules[rule]
        rules.isAllFieldsPopulated = checkAllFieldsPopulated(document)
        imputableNonPopulatedFields = rules.isAllFieldsPopulated.fields.filter(x=> !['journal', 'vendor'].includes(x)) 
        if (imputableNonPopulatedFields.length === 0) {
            // All prices items are populated. Only now we can check totals are balanced
            rules.isTotalBalanced = checkTotalsAreBalanced(document)
        } 
    }
    return rules
}

const runRulesValidated = (document) => {
    if (document.status === 'pending' || document.status === 'error') {
        return false
    } else {
        if (!document.rules) return false
        if (document.rules.isAllFieldsPopulated.fields.length === 0) {
            return !document.rules.isAllFieldsPopulated.value && !document.rules.isTotalBalanced.value
        } else {
            return false
        }
    }
}
module.exports = {runRules, runRulesValidated};