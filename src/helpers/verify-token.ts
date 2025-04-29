import jwt from 'jsonwebtoken';

const jwtConfig = {
    pk: (() => {
        const splitPem = (process.env.CLERK_JWT_VERIFICATION_KEY || '').match(/.{1,64}/g) ?? [];
        const publicKey = `-----BEGIN PUBLIC KEY-----
${splitPem.join('\n')}
-----END PUBLIC KEY-----`;
        return publicKey;
    })(),
};

export function verify_clerk_token(token: string): Promise<jwt.JwtPayload> {
    return new Promise((resolve, reject) => {
        jwt.verify(
            token,
            jwtConfig.pk,
            {
                complete: false,
            },
            (err, decoded) => {
                if (err || decoded === undefined || typeof decoded === 'string') {
                    return reject(err);
                }
                return resolve(decoded);
            }
        )
    })

}