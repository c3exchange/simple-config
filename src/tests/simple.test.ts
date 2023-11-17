import test, { ExecutionContext } from 'ava';
import { load } from '..';
import { errMsg, testVars } from './helpers';

// -----------------------------------------------------------------------------

test('Process Environment variables', async (t: ExecutionContext) => {
	try {
		if (typeof process.env['VAULT_URL'] === 'string') {
			t.log('VAULT_URL found! Tests will try to connect to Vault in order to get variables.');
		}
		else {
			t.log('VAULT_URL not found. Only process environment variables will be processed.');
		}

		const values = await load({
			vars: testVars
		});

		for (const [ k, v ] of Object.entries(values)) {
			console.log(k, '=', v);
		}
	}
	catch (err: any) {
		t.fail(errMsg(err));
	}
	t.pass();
});
