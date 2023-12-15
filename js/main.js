function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

async function createPublicKey() {
    const keyPair = await window.crypto.subtle.generateKey(
        {
            name: "RSA-PSS",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-512",
        },
        true,
        ['sign', 'verify'],
    );

    const key = keyPair.publicKey;

    const exported = await window.crypto.subtle.exportKey("spki", key);
    const exportedAsString = ab2str(exported);
    const exportedAsBase64 = window.btoa(exportedAsString);
    const pemExported = `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;

    return pemExported;
}

async function readQRCode(file) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    context.drawImage(bitmap, 0, 0);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    const decoded = jsQR(imageData['data'], canvas.width, canvas.height);
    const data = decoded['data'];

    return data
}

async function activateDevice(host, code) {
    const activation = `https://${host}/push/v2/activation/${code}`
    const params = new URLSearchParams({
        pkpush: "rsa-sha512",
        pubkey: await createPublicKey(),
        manufacturer: "Apple",
        model: "iPhone 4S",
    });

    // Avoid CORS issue
    const url = document.location.host + '/proxy?url=' + encodeURIComponent(
        activation + '?' + params
    );

    const response = await fetch(url, {
        method: "POST",
    });

    const result = await response.json();
    const hotpSecret = result['response']['hotp_secret'];

    return hotpSecret;
}

function base32Encode(input) {
    const encoder = new TextEncoder()
    input = encoder.encode(input)

    // Copied from https://github.com/gchq/CyberChef/blob/master/src/core/operations/ToBase32.mjs
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=";
    let output = "",
        chr1, chr2, chr3, chr4, chr5,
        enc1, enc2, enc3, enc4, enc5, enc6, enc7, enc8,
        i = 0;
    while (i < input.length) {
        chr1 = input[i++];
        chr2 = input[i++];
        chr3 = input[i++];
        chr4 = input[i++];
        chr5 = input[i++];

        enc1 = chr1 >> 3;
        enc2 = ((chr1 & 7) << 2) | (chr2 >> 6);
        enc3 = (chr2 >> 1) & 31;
        enc4 = ((chr2 & 1) << 4) | (chr3 >> 4);
        enc5 = ((chr3 & 15) << 1) | (chr4 >> 7);
        enc6 = (chr4 >> 2) & 31;
        enc7 = ((chr4 & 3) << 3) | (chr5 >> 5);
        enc8 = chr5 & 31;

        if (isNaN(chr2)) {
            enc3 = enc4 = enc5 = enc6 = enc7 = enc8 = 32;
        } else if (isNaN(chr3)) {
            enc5 = enc6 = enc7 = enc8 = 32;
        } else if (isNaN(chr4)) {
            enc6 = enc7 = enc8 = 32;
        } else if (isNaN(chr5)) {
            enc8 = 32;
        }

        output += alphabet.charAt(enc1) + alphabet.charAt(enc2) + alphabet.charAt(enc3) +
            alphabet.charAt(enc4) + alphabet.charAt(enc5) + alphabet.charAt(enc6) +
            alphabet.charAt(enc7) + alphabet.charAt(enc8);
    }
    return output;
}

async function convert(file) {
    const data = await readQRCode(file);

    const code = data.split('-')[0]
    const hostb64 = data.split('-')[1]
    const host = atob(hostb64 + '==')

    const hotpSecret = await activateDevice(host, code);
    const secret32 = base32Encode(hotpSecret).replaceAll('=', '');

    const QRCode = 'otpauth://hotp/Duo?counter=0&secret=' + secret32;

    return QRCode;
}

