import test, { ExecutionContext } from 'ava';
import { load } from '..';
import { errMsg, testVars } from './helpers';

// -----------------------------------------------------------------------------

test.serial('All valid', async (t: ExecutionContext) => {
	setupValidEnvVars();

	await runTest(t, true);
});

test.serial('String too short', async (t: ExecutionContext) => {
	setupValidEnvVars();
	process.env['DATABASE_HOST'] = '';

	await runTest(t, false);
});

test.serial('Invalid string', async (t: ExecutionContext) => {
	setupValidEnvVars();
	process.env['DATABASE_HOST'] = 'tret....rtetert';

	await runTest(t, false);
});

test.serial('Float number when integer was expected', async (t: ExecutionContext) => {
	setupValidEnvVars();
	process.env['DATABASE_PORT'] = '5432.3';

	await runTest(t, false);
});

test.serial('Number out of range', async (t: ExecutionContext) => {
	setupValidEnvVars();
	process.env['DATABASE_PORT'] = '5432543';

	await runTest(t, false);
});

test.serial('Invalid boolean value', async (t: ExecutionContext) => {
	setupValidEnvVars();
	process.env['DATABASE_USE_SSL'] = 'wrong-value';

	await runTest(t, false);
});

test.serial('Disallowed enum', async (t: ExecutionContext) => {
	setupValidEnvVars();
	process.env['DATABASE_TYPE'] = 'sqlite';

	await runTest(t, false);
});

test.serial('Default string', async (t: ExecutionContext) => {
	setupValidEnvVars();
	delete process.env['DATABASE_HOST'];

	await runTest(t, true);
});

// -----------------------------------------------------------------------------

const setupValidEnvVars = () => {
	process.env['DATABASE_HOST'] = '127.0.0.1';
	process.env['DATABASE_PORT'] = '5432';
	process.env['DATABASE_USE_SSL'] = 'false';
	process.env['DATABASE_TYPE'] = 'postgresql';
}

const runTest = async (t: ExecutionContext, mustSucceed: boolean) => {
	try {
		await load({
			vars: testVars,
			vaultOpts: {
				disable: true
			}
		});
	}
	catch (err: any) {
		if (mustSucceed) {
			t.fail(errMsg(err));
		}
		else {
			t.pass();
		}
		return;
	}
	if (mustSucceed) {
		t.pass();
	}
	else {
		t.fail('Unexpected success');
	}
	return;
};
