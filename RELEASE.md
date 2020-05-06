# One App release process

This defines the One App release process. 

Releases can be triggered in two ways:

  - [Automated release process](#automated-release-process)
  - [Manual release process](#manual-release-process)

## Automated release process

 1. An automated pull request will be raised every Wednesday at 16:00 UTC, from a `prepare-release` branch to master. This uses [pull_request_release workflow](.github/workflows/pull_request_release.yml) and updates the [package.json](package.json), [package-lock.json](package-lock.json), [one-app-statics package.json](one-app-statics/package.json) and runs `npm run release:changelog` to generate the changelog. Behind the scene it uses [standard-version](https://github.com/conventional-changelog/standard-version) to update these file versions and [conventional-changelog](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-changelog-cli) to generate the changelog. The commit message will be in the following format `chore(release): X.X.X` . You can update this pull request to remove or add any new changes.
 2. Once a pull request is reviewed, merge the pull request and please ensure that the commit message is updated to follow this pattern  

    ``` bash
    #chore(release): 5.0.0
    chore(release): <semantic-version>

    ```

    > Integration tests will continue to run in Travis as they currently do, after the automated pull request is created it would run the tests on `prepare-release` branch.

 3. The merge will trigger the automatic generation of a new tag using the semantic version provided during the merging of the pull request above.
 4. After the the generated tag is pushed to the branch this will trigger the docker build and publish the statics and push the images to Docker Hub. The development and production images would be accessible in docker [https://hub.docker.com/u/oneamex](https://hub.docker.com/u/oneamex)
 5. The statics assets will be published and added to the tag created via the [release static assets action](.github/workflows/docker_release.yml) as part of the previous step.
 6. We are currently using [https://github.com/release-drafter/release-drafter](https://github.com/release-drafter/release-drafter) to generate release notes. This is a github action that generates draft releases note that can be added to the released tag. Please add the labels specified within [release-drafter](.github/release-drafter.yml) to categorize different pull requests to ensure that any changes are categorized correctly. You can also use the changelog generated for this content.
 7. Update the draft release notes with any changes required and edit the released tag to add them there.
 8. For the release notes use the below format. Please review some of the releases to check the format used [https://github.com/americanexpress/one-app/releases](https://github.com/americanexpress/one-app/releases)

  ```
  [Paste changelog entries here]
  ### Docker Images

  #### Developer Image
  [one-app-dev/version-released](https://hub.docker.com/layers/oneamex/one-app-dev/link-to-the-docker-tag)

  #### Production Image
  one-app/version-released](https://hub.docker.com/layers/oneamex/one-app/link-to-the-docker-tag)

  ### One App Statics
  https://www.npmjs.com/package/@americanexpress/one-app-statics
  ```

## Manual release process

This process can be used to make ad hoc releases outside of wednesday release cycle.

 1. Run `npm run release` locally within your branch, this would update [package.json](package.json), [package-lock.json](package-lock.json)and [one-app-statics package.json](one-app-statics/package.json) with the new version to be released. 
 2. Run `npm run release:changelog` to generate and update the changelog.
 3. Commit using the `chore(release): X.X.X` message format and push your changes to the branch `prepare-release`, then create a pull request to master.
 4. When the changes are merged and reviewed. The same process from [step 3](#automated-release-process) above will be followed.

## FAQs

### How can I revert a release?

If changes were made and need to be reverted. Please use the [manual release process](#manual-release-process) to revert the changes and raise a patch release.

### How can I run the first release?

For the first release please use the [manual release process](#manual-release-process). Run `npm run release -- --first-release` to update the package.json files.

### How can I create a prerelease?

For the first release please use the [manual release process](#manual-release-process). Run `npm run release -- --prerelease` to update the package.json files.

### What happens if a pull request merged after the automated pull request is created?

We should try to prevent this from happening, but if it does happen, trigger the pull request to update by typing `/prepare-release` once that has completed a 🚀 and 👀 reaction would be added to the comment.

### How can I do a dry run to test out the files to be changed locally

Locally you can run  `npm run release -- --dry-run`, this would show the new version to be released and the files that would changed.
