import test, { ExecutionContext } from 'ava';
import { load } from '..';
import { errMsg, testVars } from './helpers';

// -----------------------------------------------------------------------------

test('Process Environment variables', async (t: ExecutionContext) => {
	try {
		await load({
			vars: testVars,
			vaultOpts: {}
		});
	}
	catch (err: any) {
		t.fail(errMsg(err));
	}
	t.pass();
});

// -----------------------------------------------------------------------------

