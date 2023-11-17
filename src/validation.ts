import { KeyValueSet, Variable } from './types';

// -----------------------------------------------------------------------------

export const validateValues = async (input: Record<string, string>, vars: Variable[]): Promise<KeyValueSet> => {
	const output: KeyValueSet = {};

	// Evaluate each variable
	for (const v of vars) {
		const varName = v.getName();

		if (typeof input[varName] === 'string') {
			output[varName] = await Promise.resolve(v.parse(input[varName]));
		}
		else if (v.isRequired()) {
			throw new Error('Variable "' + v.getName() + '" is not defined');
		}
		else {
			const value = v.getDefault();
			if (typeof value !== 'undefined') {
				output[varName] = value;
			}
		}
	}

	// Done
	return output;
};
