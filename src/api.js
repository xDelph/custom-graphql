const githubToken = process.env.GITHUB_TOKEN || 'a97e159b072f201d4ad8bbd837f2cd3eed31469a'
const githubApi = 'https://api.github.com'

const axios = require('axios')

module.exports = {
  getCommits: async function (user, repo, params) {
    try {
      return (
        await axios.get(`${githubApi}/repos/${user}/${repo}/commits?${params}`, {
          headers: {
            Authorization: `token ${githubToken}`
          }
        })
      ).data
    } catch (e) {
      return e
    }
  }
}
