# Serato LHCI Notification

Sends a notification of any failures among Lighthouse CI audits to a Slack channel.

## Inputs

- **webhook_url**: Slack webhook URL, used to POST notifications to a Slack channel
- **run_url**: URL of the GitHub actions workflow run:{server URL}/{repository name}/actions/runs/{run ID}
- **revision**: Branch / git revision that triggered the workflow run 
- **results**: Array of Lighthouse audit results, including any failures to report
- **links**: Links to the Lighthouse server dashboard for each page tested
- **matrix_name**: The project or testing matrix that the audits belong to
- **user**: User who initiated (or whose commit initiated) the workflow

## Outputs

- **time**: The time that the workflow was completed

## Usage

As a step in a GitHub Actions workflow:

```yaml
  - name: Send performance test results to Slack
    id: slack
    uses: serato/serato-lhci-notification
    with:
      webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
      run_url: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
      revision: ${{ github.ref_name }}
      results: ${{ steps.lhci.outputs.assertionResults }}
      matrix_name: ${{ matrix.name }}
      commit_message: ${{ github.event.head_commit.message }}
      user: ${{ github.actor }}
      links: ${{ steps.lhci.outputs.links }}
```

(Where `lhci` is a previous Actions step that outputs the results of Lighthouse audits)
