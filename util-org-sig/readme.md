# Utility for the org/sig feature

This folder contains helper code for generating ECDSA keys and signing script deployment ids. Follow these steps to create your own keys and signatures:

1. Paste the contents of `crypto.js` into a browser console.
2. Run once:

   ```js
   await generatePublicAndPrivateKeys();
   ```

   **Important:** store the generated private key securely. It should never be exposed in a frontend or push the modified crypto.js to your repo.
3. Save both the public and private keys in `g_keyPair` inside a copy of `crypto.js` **outside of the repo**. The private key is a secret.
4. Update the public key in `website/public/js/common.js` (`g_publicKeyJwk`).
5. To generate an `org` parameter for a script deployment, run `signAndVerifyMessage` with the script id as the message. Ensure `g_keyPair` still contains the original key pair (it will if you just run step 2, otherwise modify g_keyPair in `crypto.js` before running it.)
