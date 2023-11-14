import { ExecutionContext } from 'ava';
import { Variable } from '../types';
import { BooleanVar, EnumVar, NumberVar, StringVar } from '../variables';
import process from 'process';

// -----------------------------------------------------------------------------

export const testVars: Variable[] = [
	StringVar.define('SERVER_HOST').minLength(10),
	NumberVar.define('SERVER_PORT').min(1).max(65535),
	BooleanVar.define('SERVER_SSL'),
	EnumVar.define('DATABASE_TYPE').allowed(['mysql', 'postgresql', 'mongodb'])
];

// -----------------------------------------------------------------------------

export const checkEnvironmentVariables = (t: ExecutionContext) => {
	if (typeof process.env['SERVER_HOST'] !== 'string') {
		t.fail('env SERVER_HOST not defined');
	}
	if (typeof process.env['SERVER_PORT'] !== 'string') {
		t.fail('env SERVER_PORT not defined');
	}
	if (typeof process.env['SERVER_SSL'] !== 'string') {
		t.fail('env SERVER_SSL not defined');
	}
	if (typeof process.env['DATABASE_TYPE'] !== 'string') {
		t.fail('env DATABASE_TYPE not defined');
	}
}

export const errMsg = (err: any): string => {
	if (err.message) {
		return err.message;
	}
	if (err.toString) {
		return err.toString();
	}
	return 'unknown error';
}
