const gql = require('graphql-tag')

const queries = require('./src/queries')

;(async function start () {
  try {
    await parseGQL(gql`
      {
        commits1: commits(since: "2019-03-11", until: "2019-04-01") {
          url
          date
        }
        commits2: commits(since: "2019-04-01", until: "2019-04-18")
      }
    `)
  } catch (e) {
    console.error(e.message, e.locations)
  }
})()

function parsePrimitive (primitive) {
  const { kind, value } = primitive
  switch (kind) {
    case 'IntValue':
      return parseInt(value, 10)
    case 'FloatValue':
      return parseFloat(value)
    case 'BooleanValue':
      return value === 'true' ? true : !!value
    default:
      return value
  }
}

function parseArguments (args) {
  return args.length > 0
    ? args.reduce((result, argument) => {
      result[argument.name.value] = parsePrimitive(argument.value)
      return result
    }, {})
    : undefined
}

function parseFields (selections) {
  return selections.map((field) => field.name.value)
}

function parseType (selection) {
  return {
    alias: selection.alias ? selection.alias.value : undefined,
    type: selection.name.value,
    arguments: parseArguments(selection.arguments),
    fields: selection.selectionSet ? parseFields(selection.selectionSet.selections) : undefined
  }
}

async function parseGQL (gql) {
  if (gql.definitions.operation === 'mutation') {
    return new Error('mutation not available')
  } else {
    const operations = gql.definitions[0].selectionSet.selections.map(parseType)

    const aliases = operations.filter((op) => op.alias).map((op) => op.alias)
    if (operations.length > 1 && operations.length !== new Set(aliases).size) {
      console.log('need different alias for multiple query')
      return ''
    }

    const results = await operations.reduce(async (resultPromise, op) => {
      let result = await resultPromise

      const query = queries[op.type]
      if (!query) return `no query ${op.type} found`
      else {
        try {
          const resolved = await query.resolve(op.arguments, op.fields)
          if (op.alias) result[op.alias] = resolved
          else result = resolved

          return result
        } catch (e) {
          return e
        }
      }
    }, {})

    console.log({ data: results })
  }
}
