import { Variable, BooleanVar, EnumVar, NumberVar, StringVar } from '..';

// -----------------------------------------------------------------------------

const ipV4AddressRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/ui;

const hostnameRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/ui;

// -----------------------------------------------------------------------------

export const testVars: Variable[] = [
	StringVar.define('DATABASE_HOST').minLength(1).maxLength(256).default('127.0.0.1').validator((value: string, name: string): string => {
		if (ipV4AddressRegex.test(value) || hostnameRegex.test(value)) {
			return value;
		}
		throw new Error('Variable "' + name + '" is not an IPv4 address nor a host name.');
	}),
	NumberVar.define('DATABASE_PORT').min(1).max(65535).musBeInt(),
	BooleanVar.define('DATABASE_USE_SSL'),
	EnumVar.define('DATABASE_TYPE').allowed(['mysql', 'postgresql', 'mongodb'])
];

// -----------------------------------------------------------------------------

export const errMsg = (err: any): string => {
	if (err.message) {
		return err.message;
	}
	if (err.toString) {
		return err.toString();
	}
	return 'unknown error';
}
