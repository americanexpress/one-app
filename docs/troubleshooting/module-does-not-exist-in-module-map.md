# Could Not Load Module Because It Does Not Exist in the Module Version Map

#### Why This Error Occurred

Sometimes you might want to compose a module from multiple smaller modules using either [iguazu-holocron](https://github.com/americanexpress/holocron/tree/main/packages/iguazu-holocron) or [RenderModule](https://github.com/americanexpress/holocron/blob/main/packages/holocron/docs/api/README.md#rendermodule). However, if you have not added the module you are trying to load to your [module-map](../api/server/Module-Map-Schema), it will fail to load.

Furthermore, if you are calling `RenderModule` but not calling [composeModules](https://one-amex-docs.americanexpress.com/en-us/holocron/api/#composemodules) in `loadModuleData`, this will result in a warning stating that the module is not in the module map.

#### Possible Ways to Fix It

If you are getting this locally while using `one-app-runner`, you need to make sure that the module that is missing is served in the `one-amex` section of the module you are running `npm start` in.

If you are getting this in an environment that you are deploying modules/One App to, you need to make sure that you have added the required module to your module map that you are supplying to One App.

### Useful Links

[one-app-runner documentation](https://one-amex-docs.americanexpress.com/en-us/one-app-runner/api/)
