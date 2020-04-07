[👈 Return to Overview](./Recipes.md)

# Deploying Modules

## 📖 Table of Contents

* [Deploying to Now with GitHub Actions](#deploying-to-now-with-github-actions)

# Deploying to Now with GitHub Actions

[Now.sh](https://zeit.co/home) allows you to deploy statics such as your modules. We will accomplish this be using [GitHub Actions](https://github.com/features/actions).

## Creating your Deploy Action

This deploy action uses Zeit's `now-cli` which you will need a [token](https://zeit.co/account/tokens) from Now. The below action runs whenever a release is created or a push to master. This will create 

```yml
name: Deploy

on:
  release:
    types: [created]
  push:
    branches:
      - master

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Use Node.js 12.x
      uses: actions/setup-node@v1
      with:
        node-version: '12.x'
    - name: Cache NPM Dependencies
      uses: actions/cache@v1
      with:
        path: ~/.npm
        key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
        restore-keys: |
          ${{ runner.os }}-node-
    - name: Install Dependencies
      run: npm install
      env:
        NODE_ENV: development
    - name: Build One App Page Wrapper
      run: npm run build
      env:
        NODE_ENV: production
    - name: 'Deploy'
      run: now build --prod --confirm -t $NOW_TOKEN
      env:
        NOW_TOKEN: ${{ secrets.NOW_TOKEN }}
```
