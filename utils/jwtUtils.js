import jwksClient from 'jwks-rsa';

const client = jwksClient({
    jwksUri: 'https://hhvriufzsfvhjtoijfsx.supabase.co/auth/v1/keys',
});

function getKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err);
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
    });
}

export { getKey };