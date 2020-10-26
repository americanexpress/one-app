<!--ONE-DOCS-HIDE start-->
[👈 Return to Overview](../README.md)
<!--ONE-DOCS-HIDE end-->

# Reporting Client Errors

## `errorReporting` Duck

`one-app` includes the [`errorReporting`](https://github.com/americanexpress/one-app-ducks#errorreporting-duck)
duck from `one-app-ducks` which will log any errors reported by dispatching the [`addErrorToReport`](https://github.com/americanexpress/one-app-ducks#adderrortoreport) action. This provides your modules with a simple and efficient way to report errors from the client.

When `addErrorToReport` is dispatched during SSR the `errorReporting` duck will log the reported error
to `console.error`. If dispatched on the client `addErrorToReport` will result in the error being `POST`ed
to the `reportingUrl` configured by the [`ONE_CLIENT_REPORTING_URL`](https://github.com/americanexpress/one-app/blob/main/docs/api/server/Environment-Variables.md#one_client_reporting_url).

> `ONE_CLIENT_REPORTING_URL` defaults to `/_/report/errors` in development but it will need to be set in production.

When errors are reported to `/_/report/errors`, `one-app` will format and log them through `console.error`. Every error will be named `ClientReportedError` and will include any additional data under `metaData`.

> Please note that when running in development `one-app` does not log the `ClientReportedError`.

### Example using React Error Boundary

`addErrorToReport` accepts two arguments:

| Argument | Type | Description |
|---|---|---|
| `error` | `Object` | (required) This is the error stack |
| `otherData` | `Object` | This is any other data that you'd like to send alongside the error message|

Below is an example of how you could `dispatch` the `addErrorToReport` action in an error boundary component:

```jsx
import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { addErrorToReport } from '@americanexpress/one-app-ducks';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { error };
  }

  componentDidCatch(error) {
    const { dispatch } = this.props;
    dispatch(
      addErrorToReport(error, {
        // example otherData
        errorReportedBy: 'ErrorBoundary',
      })
    );
  }

  render() {
    const {
      state: { error },
      props: { children },
    } = this;

    if (error) {
      // You can render any custom fallback UI
      return <h1>Something went wrong.</h1>;
    }

    return (
      <div>
        <h1>Error Boundary</h1>
        {children}
      </div>
    );
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
  dispatch: PropTypes.func.isRequired,
};

export default connect()(ErrorBoundary);
```

Read more about [error boundaries](https://reactjs.org/docs/error-boundaries.html) the React website.

<!--ONE-DOCS-HIDE start-->
[☝️ Return To Top](#reporting-client-errors)
<!--ONE-DOCS-HIDE end-->