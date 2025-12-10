
import { serverRequest } from "../../js/common.js";
export const google = {
            script: {}
        };

// Define google.script.run as a getter that returns a new chainable proxy each time.
// This way, google.script.run is an object (not a function) as in the native API.
Object.defineProperty(google.script, "run", {
    get: function () {
        // Local state for this chain instance:
        let onSuccess = () => { };
        let onFailure = () => { };
        let userObject = undefined;

        // Base object with chainable methods.
        const handlerCollector = {
            withSuccessHandler(callback) {
                onSuccess = callback;
                return proxy; // Return the proxy for further chaining.
            },
            withFailureHandler(callback) {
                onFailure = callback;
                return proxy;
            },
            withUserObject(obj) {
                userObject = obj;
                return proxy;
            }
        };

        // Create a proxy that intercepts property accesses.
        const proxy = new Proxy(handlerCollector, {
            get(target, prop, receiver) {
                // If the property is one of our chainable methods, return it.
                if (prop in target) return target[prop];

                // Otherwise, treat the property as the name of the server function.
                return async function (...args) {
                    try {
                        const response = await serverRequest(prop, ...args);
                        if (!response || response.error) {
                          const errorMsg = response ? response.error : 'No response';
                          console.error("GScriptrun: server request failed", errorMsg);
                          throw new Error(`Server request failed: ${errorMsg}`);
                        }
                        if (!Object.prototype.hasOwnProperty.call(response, "result")) {
                          console.error("GScriptrun: server response missing result", response);
                          throw new Error('Server response missing result');
                        }
                        onSuccess(response.result, userObject);
                    } catch (err) {
                        onFailure(err, userObject);
                    }
                };
            }
        });

        return proxy;
    }
});

Object.defineProperty(google.script, "url", {
    get: function() {
        return {
            getLocation: function(callback) {
                // Replicate the return from the Google Apps Script getLocation function
                // https://developers.google.com/apps-script/guides/html/reference/url
                
                if (typeof callback !== 'function') {
                    throw new TypeError('getLocation requires a callback function');
                }
                
                // Parse URL from the current window location
                const url = new URL(window.location.href);
                
                // Build the parameter object (single values - first occurrence)
                const parameter = {};
                url.searchParams.forEach((value, key) => {
                    if (!Object.prototype.hasOwnProperty.call(parameter, key)) {
                        parameter[key] = value;
                    }
                });
                
                // Build the parameters object (arrays of all values)
                const parameters = {};
                url.searchParams.forEach((value, key) => {
                    if (!parameters[key]) {
                        parameters[key] = [];
                    }
                    parameters[key].push(value);
                });
                
                // Get the hash (fragment) without the leading #
                const hash = url.hash ? url.hash.substring(1) : '';
                
                // Build the location object matching Google Apps Script structure
                const location = {
                    hash: hash,
                    parameter: parameter,
                    parameters: parameters
                };
                
                // Call the callback with the location object
                callback(location);
            }
        };
    }
});

export class GS {
  #ensureAvailable() {
    const g = google;
    return g;
  }

  #run(method, args) {
    const { script } = this.#ensureAvailable();
    return new Promise((resolve, reject) => {
      const call = () => {
        try {
          script.run
            .withSuccessHandler(resolve)
            .withFailureHandler((err) => {
              reject(err instanceof Error ? err : new Error(String(err)));
            })[method](...args);
        } catch (e) {
          reject(e);
        }
      };
      call();
    });
  }

  #getLocation() {
    const { script } = this.#ensureAvailable();
    const getLoc = script?.url?.getLocation;
    if (typeof getLoc !== 'function') {
      console.error('GScriptrun: google.script.url.getLocation is not available');
      throw new Error('google.script.url.getLocation is not available');
    }
    return new Promise((resolve) => getLoc(resolve));
  }

  run(method, ...args) {
    if (typeof method !== 'string' || !method) throw new TypeError('run(method, ...args): method must be a non-empty string');
    return this.#run(method, args);
  }

  getLocation() {
    return this.#getLocation();
  }
}

// Usage:
// const server = new GS();
// await server.run('myServerFn', arg1, arg2);
// const loc = await server.getLocation();
export const server = new GS();
