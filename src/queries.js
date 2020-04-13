const { parseInput } = require('./utils')

const { Commit } = require('./types')
const { getCommits } = require('./api')

const commits = {
  input: { since: 'date', until: 'date', author: 'string' },
  type: { type: 'Commit' },
  resolve: async function (args, fields) {
    let params = ''
    if (args) {
      try {
        Object.keys(args).map(key => {
          if (!commits.input[key]) throw new Error(`no input ${key} available`)

          params += `${params ? '&' : ''}${key}=${parseInput(commits.input[key], args[key])}`
        })
      } catch (e) {
        return e
      }
    }

    const data = await getCommits('bramis', 'giVR', params)

    return data.reduce((result, commit) => {
      const c = {}

      ;(fields || Object.keys(Commit)).map(f => {
        switch (f) {
          case 'date':
            c[f] = commit.commit.author.date
            break
          case 'message':
            c[f] = commit.commit.message
            break
          default:
            c[f] = commit[f]
        }
      })

      console.log(c)

      return [...result, c]
    }, [])
  }
}

module.exports = {
  commits
}
