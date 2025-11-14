//here goes your own backend functions for page 3

/* demo function. note its placed in PUBLIC_FUNCTIONS to the front is allowed to call it */
function demoServerFunction(strA, strB) {
  if (typeof strA !== 'string' || typeof strB !== 'string') {
    throw new Error('Invalid arguments: both arguments must be strings.');
  }
  return strA + strB;
}