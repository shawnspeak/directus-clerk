import { defineOperationApp } from '@directus/extensions-sdk';

export default defineOperationApp({
	id: 'decode-clerk-jwt',
	name: 'Decode Clerk JWT',
	icon: 'box',
	description: 'This operation decodes a Clerk JWT token.',
	overview: ({ token }) => [
		{
			label: 'Token',
			text: token,
		},
	],
	options: [
		{
			field: 'token',
			name: 'Clerk JWT Token',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'input',
			},
		},
	],
});
