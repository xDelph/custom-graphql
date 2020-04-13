function parseDate (value) {
  let date = new Date(value)
  if (date) return date.toISOString()
  else throw new Error('invalid date format')
}

function parseNumber (type, value) {
  if (type === 'init') {
    const res = parseInt(value, 10)
    if (isNaN(res)) throw new Error('invalid int')
    else return res
  } else {
    const res = parseFloat(value, 10)
    if (isNaN(res)) throw new Error('invalid float')
    else return res
  }
}

module.exports = {
  parseInput: function (type, value) {
    switch (type) {
      case 'date':
        return parseDate(value)
      case 'int':
        return parseNumber('init', value)
      case 'float':
        return parseNumber('float', value)
      case 'boolean':
        return value === 'true' || !!value
      default:
        return value
    }
  }
}
