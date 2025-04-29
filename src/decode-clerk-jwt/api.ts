import { defineOperationApi } from '@directus/extensions-sdk';
import { verify_clerk_token } from '../helpers/verify-token';

type Options = {
	token: string;
};

export default defineOperationApi<Options>({
	id: 'decode-clerk-jwt',
	handler: async (payload) => {
		const { token } = payload;
		console.log(payload);

		try {
			const decodedJwt = await verify_clerk_token(token);
			if (!decodedJwt) {
				return {};
			}

			return {
				clerk_user_id: decodedJwt?.sub
			};
		}
		catch (err) {
			console.error('Error verifying JWT:', err);
			return {};
		}
	},
});
