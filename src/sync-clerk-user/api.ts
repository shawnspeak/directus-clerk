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
			let userAdded = false;
			if (!directusUser) {
				const newUser = {
					id: randomUUID(),
					external_identifier: clerkUser.id,
					email: clerkUser.emailAddresses?.[0]?.emailAddress,
					first_name: clerkUser.firstName,
					last_name: clerkUser.lastName,
					role: new_user_role_id,
				};
				const [createdUser] = await database('directus_users')
					.insert(newUser)
					.returning('*');
				console.log('Created new Directus user:', createdUser);
				userAdded = true;
			} else {
				// If the user exists, update their information
				const updatedUser = {
					email: clerkUser.emailAddresses?.[0]?.emailAddress,
					first_name: clerkUser.firstName,
					last_name: clerkUser.lastName,
				};
				await database('directus_users')
					.update(updatedUser)
					.where({ external_identifier: clerk_user_id });
				console.log('Updated Directus user:', updatedUser);
			}

			// Return the user data that was synced and indicate if it was a new user
			return {
				success: true,
				user: {
					first_name: clerkUser.firstName,
					last_name: clerkUser.lastName,
					email: clerkUser.emailAddresses?.[0]?.emailAddress,
					new: userAdded
				}
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
