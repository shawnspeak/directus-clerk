import { defineOperationApp } from '@directus/extensions-sdk';

export default defineOperationApp({
	id: 'sync-clerk-user',
	name: 'Sync Clerk User',
	icon: 'box',
	description: 'Given a Clerk user ID, sync the user with Directus.',
	overview: ({ clerk_user_id }) => [
		{
			label: 'Clerk User ID',
			text: clerk_user_id,
		},
	],
	options: (panel) => {
		return [
			{
				field: 'clerk_user_id',
				name: 'Clerk User ID',
				type: 'string',
				meta: {
					width: 'full',
					interface: 'input',
				},
			},
			{
				field: 'new_user_role_id',
				name: 'New User Role ID',
				type: 'string',
				meta: {
					width: 'full',
					interface: 'input',
				},
			},
		];
	}
});
