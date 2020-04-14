const githubToken = process.env.GITHUB_TOKEN
const githubApi = 'https://api.github.com/graphql'

const axios = require('axios')

async function callApi (query) {
  const res = await axios({
    url: `${githubApi}`,
    method: 'post',
    headers: { Authorization: `token ${githubToken}` },
    data: { query }
  })

  return res.data.data
}

function getRepoQuery (first, after) {
  return `
    {
      repository(name: "giVR", owner: "bramis") {
        name
        defaultBranchRef {
          name
          target {
            ... on Commit {
              history(first: ${first}${after ? `, after: ${after}` : ''}) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                totalCount
                nodes {
                  ... on Commit {
                    committedDate
                    additions
                    author { 
                      user {
                        login
                      }
                    }
                  }
                }
              }
            }
            abbreviatedOid
          }
        }
      }
    }
  `
}

function getIssues (first, after) {
  return `
    {
      repository(name: "giVR", owner: "bramis") {
        issues(first: ${first}${after ? `, after: ${after}` : ''}) {
          pageInfo{
            endCursor
            hasNextPage
          }
          edges {
            node {
              author {
                login
              }
              title
            }
          }
        }
      }
    }
  `
}

function getRepoHistory (data) {
  return data.defaultBranchRef.target.history
}

(async function () {
  const repoData = (await callApi(getRepoQuery(100))).repository

  while (repoData.defaultBranchRef.target.history.pageInfo.hasPageNext) {
    const history = getRepoHistory(repoData)
    const nextRepoData = (await callApi(getRepoQuery(100, history.pageInfo.endCursor))).repository
    history.nodes.push(...getRepoHistory(nextRepoData).nodes)
    history.pageInfo = getRepoHistory(nextRepoData).pageInfo
  }

  let nbCommitsPerUser = getRepoHistory(repoData).nodes.reduce((result, node) => {
    if (node.author.user) {
      if (result[node.author.user.login]) result[node.author.user.login] = result[node.author.user.login] + 1
      else {
        result[node.author.user.login] = 1
      }
    }

    return result
  }, {})

  const sortedValues = Object.entries(nbCommitsPerUser).sort(([, a], [, b]) => b - a)
  const topTwoUser = sortedValues.slice(0, 2).map(x => x[0])

  const issues = (await callApi(getIssues(100))).repository.issues

  while (issues.pageInfo.hasPageNext) {
    const nextIssuesData = (await callApi(getIssues(100, issues.pageInfo.endCursor))).repository.issues
    issues.edges.push(nextIssuesData.edges)
    issues.pageInfo.pageInfo = nextIssuesData.pageInfo
  }

  const filteredIssues = issues.edges.filter(i => topTwoUser.indexOf(i.node.author.login) !== -1)

  console.log(JSON.stringify(filteredIssues, null, 4))
})()
