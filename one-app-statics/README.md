<h1 align="center">
  <img src='https://github.com/americanexpress/one-app/raw/master/one-app.png' alt="One App - One Amex" width='50%'/>
</h1>

# One App Client Assets and CDN

## 🚨 Important 🚨  

This Package is not meant to be installed using npm, it only serves as the origin for the CDN for the static client assets for `one-app` once published to npm,
if you are looking for `one-app` follow this link: [https://github.com/americanexpress/one-app](https://github.com/americanexpress/one-app)


## 👩‍💻 Hiring 👨‍💻

Want to get paid for your contributions to `one-app`?
> Send your resume to oneamex.careers@aexp.com

## 📖 Table of Contents

* [Features](#-features)
* [Usage](#-usage)
* [License](#-license)
* [Code Of Conduct](#-code-of-conduct)
* [Contributing](#-contributing)

## ✨ Features

- Improved performance by serving the one app client static assets from a CDN
- Enhanced security with [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)

## 🤹‍ Usage with JSDelivr and Docker

Static assets are created for the correct docker image version in Docker Hub:

[One App Production Docker Image](https://hub.docker.com/r/oneamex/one-app) 

Configure your `ONE_CLIENT_URL` environment variable to point at the correct version of the assets in JSDelivr

Example:

`ONE_CLIENT_CDN_URL=https://cdn.jsdelivr.net/npm/@americanexpress/one-app-statics@5.0.0-rc.1/build/`



## 🏆 Contributing

We welcome Your interest in the American Express Open Source Community on Github.
Any Contributor to any Open Source Project managed by the American Express Open
Source Community must accept and sign an Agreement indicating agreement to the
terms below. Except for the rights granted in this Agreement to American Express
and to recipients of software distributed by American Express, You reserve all
right, title, and interest, if any, in and to Your Contributions. Please [fill
out the Agreement](https://cla-assistant.io/americanexpress/one-app).

Please see our [CONTRIBUTING.md](https://github.com/americanexpress/one-app/blob/master/CONTRIBUTING.md).

## 🗝️ License

Any contributions made under this project will be governed by the [Apache License
2.0](./LICENSE.txt).

## 🗣️ Code of Conduct

This project adheres to the [American Express Community Guidelines](https://github.com/americanexpress/one-app/blob/master/CODE_OF_CONDUCT.md).
By participating, you are expected to honor these guidelines.
