# Refused to Connect to URL Due to CSP Violation

#### Why This Error Occurred

One App requires that you set a [Content Security Policy (CSP)](../api/modules/App-Configuration#csp) within your root module. Not having this set properly will result in One App refusing to connect to a URL.

#### Possible Ways to Fix It

The error in your browser console will include where the URL you are trying to connect to needs to be added. For example:

```sh
violates the following Content Security Policy directive: "connect-src 'self' *.example.com".
```
