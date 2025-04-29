import { defineOperationApi } from '@directus/extensions-sdk';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { randomUUID } from 'crypto';

type Options = {
	clerk_user_id: string;
	new_user_role_id: string;
};

export default defineOperationApi<Options>({
	id: 'sync-clerk-user',
	handler: async ({ clerk_user_id, new_user_role_id }, { database }) => {
		console.log('clerk user id', clerk_user_id);

		// Ensure Clerk API key is set
		if (!process.env.CLERK_SECRET_KEY) {
			throw new Error('CLERK_SECRET_KEY environment variable is not set');
		}

		try {
			// Fetch the user from Clerk
			const clerkUser = await clerkClient.users.getUser(clerk_user_id);

			console.log('user', clerkUser);

			// Get the user from Directus by external identifier using database query
			const directusUser = await database
				.select('*')
				.from('directus_users')
				.where({ external_identifier: clerk_user_id })
				.first();

			console.log('directus user', directusUser);

			// If the user is not found in Directus, create a new user
			if (!directusUser) {
				const newUser = {
					id: randomUUID(),
					external_identifier: clerkUser.id,
					email: clerkUser.emailAddresses?.[0]?.emailAddress,
					first_name: clerkUser.firstName,
					last_name: clerkUser.lastName,
					role: new_user_role_id
				};
				const [createdUser] = await database('directus_users')
					.insert(newUser)
					.returning('*');
				console.log('Created new Directus user:', createdUser);
			} else {
				// If the user exists, update their information
				const updatedUser = {
					email: clerkUser.emailAddresses?.[0]?.emailAddress,
					first_name: clerkUser.firstName,
					last_name: clerkUser.lastName
				};
				await database('directus_users')
					.update(updatedUser)
					.where({ external_identifier: clerk_user_id });
				console.log('Updated Directus user:', updatedUser);
			}


			// Return both the Clerk user data and the Directus user data if found
			return {
				success: true,
				clerkUser: {
					id: clerkUser.id,
					firstName: clerkUser.firstName,
					lastName: clerkUser.lastName,
					email: clerkUser.emailAddresses?.[0]?.emailAddress,
					username: clerkUser.username,
					imageUrl: clerkUser.imageUrl,
					metadata: clerkUser.publicMetadata,
					lastSignInAt: clerkUser.lastSignInAt,
					createdAt: clerkUser.createdAt,
					updatedAt: clerkUser.updatedAt
				},
				directusUser: directusUser || null
			};
		} catch (error) {
			console.error('Error fetching user from Clerk:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	},
});
