
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
                        if (!response || response.error)
                          throw new Error(`Server request failed: ${response ? response.error : 'No response'}`);
                        
                        if (!response.hasOwnProperty("result"))
                          throw new Error('Server response missing result');
                        
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


export class GS {
  #ensureAvailable() {
    const g = google;
    return g;
  }

  #isBlankErr(err) {
    return err == null || (typeof err === 'string' && err === '');
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

    if (typeof getLoc !== 'function') throw new Error('google.script.url.getLocation is not available');
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
