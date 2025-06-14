
let g_keyPair = {
    publicKey: {
        "crv": "P-256",
        "ext": true,
        "key_ops": [
            "verify"
        ],
        "kty": "EC",
        "x": "xxxxx", //CUSTOMIZE
        "y": "xxxxx"  //CUSTOMIZE
    },
    privateKey: {
        "crv": "P-256",
        "d": "xxxxx", //CUSTOMIZE
        "ext": true,
        "key_ops": [
            "sign"
        ],
        "kty": "EC",
        "x": "xxxxx", //CUSTOMIZE
        "y": "xxxxx"  //CUSTOMIZE
    }
};

/**
 * Generate a new ECDSA key pair and assign it to `g_keyPair`.
 * The helper `generateAndPrintKeys` also prints the keys to the console.
 *
 * Resolves when generation is complete.
 */
async function generatePublicAndPrivateKeys() {
    g_keyPair = await generateAndPrintKeys();
}

/**
 * Sign a message and immediately verify it with the current key pair.
 * The resulting signature is logged in Base64url form along with the
 * verification result.
 *
 * @param {string} message Text to sign and verify.
 * Completes after logging the result.
 */
async function signAndVerifyMessage(message) {
    // Sign the message and encode the signature in Base64url.
    const signature = await signMessage(g_keyPair.privateKey, message);
    console.log("Base64url Signature:", signature);

    // Verify the signature.
    const isValid = await verifySignature(g_keyPair.publicKey, message, signature);
    console.log("Signature valid:", isValid);
}


/**
 * Import a private key provided in JWK format.
 *
 * @param {JsonWebKey} jwk The JWK object describing the private key.
 * @returns {Promise<CryptoKey|undefined>} The resulting CryptoKey or `undefined` on failure.
 */
async function importPrivateKey(jwk) {
    try {
        const privateKey = await window.crypto.subtle.importKey(
            "jwk",         // format
            jwk,           // key data
            {
                name: "ECDSA",
                namedCurve: "P-256"
            },
            true,          // extractable (set to false if you don't want it to be extractable)
            ["sign"]       // key usages
        );
        return privateKey;
    } catch (err) {
        console.error("Error importing private key:", err);
    }
}


/**
 * Generate a new ECDSA P-256 key pair and print both keys in JWK format.
 *
 * @returns {Promise<CryptoKeyPair>} The generated key pair.
 */
async function generateAndPrintKeys() {
    // Generate an ECDSA P-256 key pair
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: "ECDSA",
            namedCurve: "P-256"
        },
        true, // extractable keys for export
        ["sign", "verify"]
    );

    // Export the public key to JWK format
    const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);

    // Export the private key to JWK format
    const privateKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

    // Print the keys to the console in a readable format
    console.log("Public Key (JWK):", JSON.stringify(publicKeyJwk, null, 2));
    console.log("Private Key (JWK):", JSON.stringify(privateKeyJwk, null, 2));
    return keyPair;
}

/**
 * Convert an ArrayBuffer to a Base64url string.
 *
 * @param {ArrayBuffer} buffer The data to encode.
 * @returns {string} Base64url encoded representation of the buffer.
 */
function arrayBufferToBase64Url(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64 = window.btoa(binary);
    // Convert to Base64url
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode a Base64url string into an ArrayBuffer.
 *
 * @param {string} base64url The Base64url encoded data.
 * @returns {ArrayBuffer} The decoded bytes as an ArrayBuffer.
 */
function base64UrlToArrayBuffer(base64url) {
    // Convert Base64url to standard Base64.
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if necessary.
    while (base64.length % 4) {
        base64 += '=';
    }
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Sign a text message using ECDSA P-256 and return the signature in
 * Base64url format.
 *
 * @param {CryptoKey} privateKey The private key for signing.
 * @param {string} message The message to be signed.
 * @returns {Promise<string>} The Base64url encoded signature.
 */
async function signMessage(privateKey, message) {
    const encoder = new TextEncoder();
    const signature = await window.crypto.subtle.sign(
        {
            name: "ECDSA",
            hash: { name: "SHA-256" }
        },
        privateKey,
        encoder.encode(message)
    );
    return arrayBufferToBase64Url(signature);
}

/**
 * Verify a Base64url encoded signature for the supplied message.
 *
 * @param {CryptoKey} publicKey The public key for verification.
 * @param {string} message The original message that was signed.
 * @param {string} signatureBase64Url The signature to verify.
 * @returns {Promise<boolean>} Whether the signature is valid.
 */
async function verifySignature(publicKey, message, signatureBase64Url) {
    const encoder = new TextEncoder();
    const signatureBuffer = base64UrlToArrayBuffer(signatureBase64Url);
    return await window.crypto.subtle.verify(
        {
            name: "ECDSA",
            hash: { name: "SHA-256" }
        },
        publicKey,
        signatureBuffer,
        encoder.encode(message)
    );
}
