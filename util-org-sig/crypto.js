
/**
 * Instructions for enabling multiple Script deployments using "org" and "sig":
 * 1 paste this code into the a browser console
 * 2. Run only once "await generatePublicAndPrivateKeys();"
 * 4. Important: store the generated private key securely. It should never be exposed in a frontend.
 * 5. Save both the public and private keys in this js file "g_keyPair". Do not publish this file in github.
 * 6. Update the public key in /website/public/js/common.js (g_publicKeyJwk)
 * 
 *  Every time you want to sign a new script id to generate its "org" parameter:
 *  Use the `signAndVerifyMessage` function with the script id (message) you want to sign,
 *  first making sure that g_keyPair contains the pair you initially generated.
 */
let g_keyPair = {
    publicKey: {
        "crv": "P-256",
        "ext": true,
        "key_ops": [
            "verify"
        ],
        "kty": "EC",
        "x": "xxxxx", //REVIEW
        "y": "xxxxx"  //REVIEW
    },
    privateKey: {
        "crv": "P-256",
        "d": "xxxxx", //REVIEW
        "ext": true,
        "key_ops": [
            "sign"
        ],
        "kty": "EC",
        "x": "xxxxx", //REVIEW
        "y": "xxxxx"  //REVIEW
    }
};

async function generatePublicAndPrivateKeys() {
    g_keyPair = await generateAndPrintKeys();
}

async function signAndVerifyMessage(message) {
    // Sign the message and encode the signature in Base64url.
    const signature = await signMessage(g_keyPair.privateKey, message);
    console.log("Base64url Signature:", signature);

    // Verify the signature.
    const isValid = await verifySignature(g_keyPair.publicKey, message, signature);
    console.log("Signature valid:", isValid);
}


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

// Helper function: Converts an ArrayBuffer to a Base64url string.
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

// Signs a message and returns the signature in Base64url format.
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

// Verifies a Base64url-encoded signature for a given message.
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
