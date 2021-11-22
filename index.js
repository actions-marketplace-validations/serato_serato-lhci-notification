const core = require('@actions/core')
const axios = require('axios')

try {
    const runUrl = core.getInput('run_url')
    const revision = core.getInput('revision')
    const webhookUrl = core.getInput('webhook_url')
    const rawResults = core.getInput('results')
    const platform = core.getInput('matrix_name')
    const commitMessage = core.getInput('commit_message')
    const user = core.getInput('user')
    const rawLinks = core.getInput('links')

    // Results should be a JSON array, and links a JSON object
    const results = JSON.parse(rawResults)
    const links = JSON.parse(rawLinks)

    // Data passed in as action inputs
    const inputData = {
        links,
        platform,
        revision,
        commitMessage,
        user,
        runUrl,
    }

    // Group failures by page URL and filter out passed audits
    const [failures, failureCount] = getFailuresForNotification(results, links)

    // Exit early if there were no failures
    if (!failureCount) {
        console.log('No failed Lighthouse audits')
        core.setOutput('time', (new Date()).toTimeString())
        return
    }

    // Use Slack's block kit to construct the webhook body
    const slackPayload = createSlackPayload(inputData, failures, failureCount)

    // Post a webhook to Slack with the test results and info
    axios.post(webhookUrl, slackPayload).catch(e => {
        console.error(e)
        throw e
    })

    core.setOutput('time', (new Date()).toTimeString())
} catch (e) {
    console.error(e)
    core.setFailed(e.message)
}

function getFailuresForNotification(results, links) {
    const failures = results.filter(results => !results['passed'])
    const failureCount = failures.length

    // Group the failures by URL and add them to the message
    const groupedResults = groupTestsByUrl(failures)

    // Returns an object with URLs as keys and arrays of failure data as values
    return [Object.entries(groupedResults).map(formatTestsForUrl(links)), failureCount]
}

function createSlackPayload(inputData, failures, failureCount) {
    // Format the Slack notification using Slack's block kit builder
    return createSlackBlock({
        ...inputData,
        failures,
        failureCount,
    })
}

function createSlackBlock({failures, platform, failureCount, revision, commitMessage, user, runUrl}) {
    return {
        'blocks': [
            {
                'type': 'header',
                'text': {
                    'type': 'plain_text',
                    'text': `${platform.charAt(0).toUpperCase() + platform.slice(1)}: Lighthouse tests failed`,
                    'emoji': true
                }
            },
            {
                'type': 'section',
                'text': {
                    'type': 'mrkdwn',
                    'text': `${failureCount} tests failed for *${revision}*: _"${commitMessage || '(Manual execution)'}"_ (@${user})\n\n${runUrl}\n`
                }
            },
            ...failures.map(createPageFailureBlock),
            {
                'type': 'section',
                'text': {
                    'type': 'mrkdwn',
                    'text': '\n'
                }
            }
        ]
    }
}

function createPageFailureBlock(pageFailures) {
    return {
        'type': 'section',
        'text': {
            'type': 'mrkdwn',
            'text': pageFailures
        }
    }
}

function groupTestsByUrl(results) {
    return results.reduce((accumulator, current) => {
        const url = current['url']
        accumulator[url] = accumulator[url] || []
        accumulator[url].push(current)
        return accumulator
    }, Object.create(null))
}

function formatTestsForUrl(links) {
    return ([page, failures]) => {
        return[
            `\n*<${links[page]}|${page}>*`,
            ...failures.map(formatTestFailure),
        ].join('\n')
    }
}

function formatTestFailure(failure) {
    return `• ${failure['auditTitle']}: ${failure['actual']} (expected ${failure['operator']} ${failure['expected']})`
}
