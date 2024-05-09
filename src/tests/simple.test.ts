import test, { ExecutionContext } from 'ava';
import { load } from '..';
import { errMsg, testVars } from './helpers';
import { KeyValueSet } from '../types';

// -----------------------------------------------------------------------------

test('Process Environment variables', async (t: ExecutionContext) => {
	let values: KeyValueSet;

	if (typeof process.env['VAULT_URL'] !== 'string') {
		t.fail('VAULT_URL not found. Only process environment variables will be processed.');
	}
	t.log('VAULT_URL found! Tests will try to connect to Vault in order to get variables.');

	try {
		values = await load({
			vars: testVars
		});
	}
	catch (err: any) {
		t.fail(errMsg(err));
	}

	for (const [ k, v ] of Object.entries(values)) {
		t.log(k, '=', v);
	}
	t.pass();
});
