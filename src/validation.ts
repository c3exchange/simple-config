import { KeyValueSet, Variable } from './types';
import { NumberVar, StringVar, EnumVar, BooleanVar } from './variables';

// -----------------------------------------------------------------------------

export const validateValues = async (input: Record<string, string>, vars: Variable[]): Promise<KeyValueSet> => {
	const output: KeyValueSet = {};

	for (const v of vars) {
		const varName = v.getName();

		if (typeof input[varName] === 'string') {
			switch (v.getType()) {
				case 'string':
					output[varName] = await ((v as StringVar).evaluate(input[varName]));
					break;

				case 'number':
					output[varName] = await ((v as NumberVar).evaluate(input[varName]));
					break;

				case 'enum':
					output[varName] = await ((v as EnumVar).evaluate(input[varName]));
					break;

				case 'bool':
					output[varName] = await ((v as BooleanVar).evaluate(input[varName]));
					break;

				default:
					throw new Error('Invalid variable definition for "' + v.getName() + '"');
			}
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

	return output;
};
