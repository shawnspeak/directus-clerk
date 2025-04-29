import { defineHook } from '@directus/extensions-sdk';
import type { Accountability } from '@directus/types';
import type { Request } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import type { Knex } from 'knex';
import { verify_clerk_token } from '../helpers/verify-token';

async function getClerkAccountability(
	token: string,
	accountability: Accountability,
	database: Knex): Promise<Accountability> {

	const decodedJwt = jwt.decode(token) as JwtPayload | null;
	if (!decodedJwt || decodedJwt?.iss == 'directus') {
		// return the default accountability if the token is from directus
		return accountability;
	}

	try {
		await verify_clerk_token(token);
	}
	catch (err) {
		console.error('Error verifying JWT:', err);
		return accountability;
	}

	const user = await database
		.select('directus_users.id', 'directus_users.role')
		.from('directus_users')
		.where({
			'external_identifier': decodedJwt?.sub
		})
		.first();

	if (user) {
		return {
			...accountability,
			user: user.id,
			role: user.role,
			roles: [user.role],
			app: false,
			admin: false,
		};
	}
	return accountability;
}

export default defineHook(({ filter }) => {
	filter('authenticate', async (accountability, meta, context) => {
		const req = <Request>meta['req'];
		if (!req.token) return accountability;
		if (!context.database) {
			return accountability;
		}

		return await getClerkAccountability(req.token, accountability as Accountability, context.database);
	});
});
