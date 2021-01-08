# Error While Attempting to Call 'load' or 'loadModuleData' Inside Holocron Module

#### Why This Error Occurred

This is usually an uncaught error in the `loadModuleData` promise chain that bubbles up and gets caught by One App.

#### Possible Ways to Fix It

Add a `try/catch` in your promise chain to debug the actual error that is being produced.
