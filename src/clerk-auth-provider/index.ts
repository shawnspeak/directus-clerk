import { defineHook } from '@directus/extensions-sdk';
import type { Accountability } from '@directus/types';
import type { Request } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import type { Knex } from 'knex';
import { verify_clerk_token } from '../helpers/verify-token';
import { createCache } from '@directus/memory';

const cache = createCache({
	type: 'local',
	maxKeys: 500,
});

type CachedUser = {
	id: string;
	role: string;
	expires: number;
};

function constructCacheKey(userId: string): string {
	return `clerk_user_${userId}`;
}

function constructFinalAccountability(
	accountability: Accountability,
	cachedUser: CachedUser): Accountability {
	return {
		...accountability,
		user: cachedUser.id,
		role: cachedUser.role,
		roles: [cachedUser.role],
		app: false,
		admin: false,
	};
}

function notExpired(
	cachedUser: CachedUser): boolean {
	return cachedUser.expires > Date.now();
}

async function getClerkAccountability(
	token: string,
	accountability: Accountability,
	database: Knex): Promise<Accountability> {

	const decodedJwt = jwt.decode(token) as JwtPayload | null;
	if (!decodedJwt || decodedJwt?.iss == 'directus' || !decodedJwt.sub) {
		// return the default accountability if the token is from directus
		return accountability;
	}

	// always verify the token
	try {
		await verify_clerk_token(token);
	}
	catch (err) {
		console.error('Error verifying JWT:', err);
		return accountability;
	}

	// check the cache for the user
	const cacheKey = constructCacheKey(decodedJwt?.sub);
	const cachedUser = await cache.get(cacheKey) as CachedUser | null;
	if (cachedUser && notExpired(cachedUser)) {
		return constructFinalAccountability(accountability, cachedUser);
	}

	const user = await database
		.select('directus_users.id', 'directus_users.role')
		.from('directus_users')
		.where({
			'external_identifier': decodedJwt?.sub
		})
		.first();

	if (user) {
		// cache the user
		const cachedUser: CachedUser = {
			id: user.id,
			role: user.role,
			expires: Date.now() + 60 * 5 * 1000, // set expiration time for 5 minutes
		} as CachedUser;
		await cache.set(cacheKey, cachedUser); // cache for 1 hour

		return constructFinalAccountability(accountability, cachedUser);
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
