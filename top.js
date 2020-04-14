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

function getRepoQuery (name, owner, first, after) {
  return `
    {
      repository(name: "${name}", owner: "${owner}") {
        name
        defaultBranchRef {
          name
          target {
            ... on Commit {
              history(first: ${first}${after ? `, after: "${after}"` : ''}) {
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

function getIssues (name, owner, users, first) {
  return `
    { 
      ${users
    .map(
      el => `
            ${el.user}: repository(name: "${name}", owner: "${owner}") {
              issues(first: ${first}${
  el.after ? `, after: "${el.after}"` : ''
}, filterBy: {createdBy: "${el.user}"}) {
                pageInfo{
                  endCursor
                  hasNextPage
                }
                edges {
                  node {
                    title
                    author {
                      login
                    }
                  }
                }
              }
            }
            
          `
    )
    .join(' ')} }`
}

function getRepoHistory (data) {
  return data.defaultBranchRef.target.history
}

(async function () {
  if (process.argv.length < 4) {
    console.error(`need a command line like : node top.js repoName repoOwner`)
    process.exit(-1)
  }
  const repoName = process.argv[2]
  const repoOwner = process.argv[3]

  const repoData = (await callApi(getRepoQuery(repoName, repoOwner, 100))).repository

  while (repoData.defaultBranchRef.target.history.pageInfo.hasPageNext) {
    const history = getRepoHistory(repoData)
    const nextRepoData = (
      await callApi(getRepoQuery(repoName, repoOwner, 100, history.pageInfo.endCursor))
    ).repository
    history.nodes.push(...getRepoHistory(nextRepoData).nodes)
    history.pageInfo = getRepoHistory(nextRepoData).pageInfo
  }

  let nbCommitsPerUser = getRepoHistory(repoData).nodes.reduce((result, node) => {
    if (node.author.user) {
      if (result[node.author.user.login]) {
        result[node.author.user.login] = result[node.author.user.login] + 1
      } else {
        result[node.author.user.login] = 1
      }
    }

    return result
  }, {})

  const sortedValues = Object.entries(nbCommitsPerUser).sort(([, a], [, b]) => b - a)
  let topTwoUser = sortedValues.slice(0, 2).map(x => x[0])

  let users = topTwoUser.map(user => ({ user, after: undefined }))

  const issues = await callApi(getIssues(repoName, repoOwner, users, 100))

  while (users.length > 0) {
    users = users
      .filter(el => {
        return issues[el.user].issues.pageInfo.hasNext
      })
      .map(el => ({ ...el, after: issues[el.user].issues.pageInfo.endCursor }))

    const nextIssuesData = await callApi(getIssues(repoName, repoOwner, users, 100))

    users.forEach(el => {
      issues[el.user].issues.edges.push(nextIssuesData[el.user].issues.edges)
      issues[el.user].issues.pageInfo.pageInfo = nextIssuesData[el.user].issues.pageInfo
    })
  }

  console.log(JSON.stringify(issues, null, 4))
})()
