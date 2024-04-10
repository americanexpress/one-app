# Workflows

# Prefixes and file names
All workflow names should start with [prefix] which contains details on when it should be run. This makes it easier to see this info from the workflows panel, since from here you cant see the workflows `on` directive.
Current prefixes include
* `[on <Targets>]`
  * runs when the branch targeted changes. Targets are a branch name or `PR`, `Prepare` ,or `Trunk`
    * `PR` will run against branches that are part of a PR whenever that brach changes. PR's will be un-mergable untill these workflows pass
    * `Prepare` will run against our `prepare-release-for-<trunk_branch_name>` branches. These branches are created automatically by `Release Step 1` and are the first stage in releasing
    * `Trunk` will run against our trunk branches; `main` and `5.x.x` at time of writing.
* `[Release <step> | <type>]`
  * run as part of the release process, where step is an integer implying the sequence, and type is one of `manual` or `automatic`
* `[Issue]`
  * run when issues are created/changed

The file name of the workflow should match the name, with the prefix and the rest of the name separated by a _. Therefore a workflow with the name `"[on PR] One App Integration Tests"` should be in a file named `on-pr_one-app-integration-tests.yml`

# Workflow descriptions

## on PR
These workflows check PR code to ensure they are the quality we expect

### [on PR, Trunk] CodeQL
Runs CodeQL against the PR code

### [on PR, Trunk] One App Unit and Lint Tests
Runs One App's unit tests and linting tests against the PR code

### [on PR] DangerJS
Runs dangerJS against the PR code

### [on PR] One App Integration Tests
Runs One App's integration tests, without a remote host

### [PR, Issue] Mark stale issues and pull requests
Marks PRs as stale after 30 days

## On Trunk
These workflows run whenever a trunk branch (`main` or `5.x.x` at time of writing) are changed.

### [on PR, Trunk] CodeQL
Runs CodeQL against the trunk branch

### [on PR, Trunk] One App Unit and Lint Tests
Runs One App's unit tests and linting tests against the trunk branch

### [on Trunk, Prepare] One App Integration Tests
Runs One App's integration tests, using Surge as a CDN and Heroku as a server.

## On Prepare
These workflows run against our Prepare branches as part of the release process. This is the last chance to catch issues before they are released.

### [on Trunk, Prepare] One App Integration Tests
Runs One App's integration tests, using Surge as a CDN and Heroku as a server.

## Release
These workflows are part of the Release process.

The release process is split into 6 steps to make recovering from issues easier. If any step fails, it can be re-run.

By default, each step triggers the next step upon completion.

Generally only the first step needs to be manually triggered, however if any of the automatic steps fail, they can also be manually triggered

## [Release step 1 | manual] Create Release PR
This workflow creates a new Prepare branch, and raises that branch as a PR into the specified Trunk branch.

It can only be run against Trunk branches.

## [Release step 2 | automatic] Tag Release
This workflow runs whenever a Prepare branch is merged into a Trunk branch.

It tags the Trunk branch at the new head, then triggers step 3.

## [Release step 3 | automatic] Prepare docker tags
This workflow extracts the docker tag version from the tag that was created in the last step, the triggers step 4.

## [Release step 4 | automatic] Docker Prod build and Publish
This workflow builds a production image of one app and publishes is, then triggers step 5.

## [Release step 5 | automatic] Docker Dev build and Publish
This workflow builds a development image of one app and publishes is, then triggers step 6.

## [Release step 6 | automatic] Publish One App Statics to NPM
This workflow build the statics that one app relies on, and published them.
