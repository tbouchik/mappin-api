const findTemplateKeyFromTag = (template, templateKeyOrTag) => {
    const nonRefTemplateKeys = template.keys.filter(x => x.type !== 'REF')
    let result = nonRefTemplateKeys.find(x => x.value === templateKeyOrTag || x.tags.includes(templateKeyOrTag))
    return result.value
  }

  module.exports = {
    findTemplateKeyFromTag
  };