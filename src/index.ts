import process from 'process';
import { KeyValueSet, Variable } from './types';
import { VaultOptions, loadFromVault } from './vault/vault';
import { validateValues } from './validation';
export { StringVar, NumberVar, EnumVar, BooleanVar } from './vardefs';
export type { VaultOptions };
export type { Variable };

// -----------------------------------------------------------------------------

export enum EnvVarsOverride {
	Ignore, MergeMissing, Overwrite
}

export interface Options {
	vars: Variable[];
	vaultOpts?: VaultOptions;
	envVarsOverride?: EnvVarsOverride;
	modifyEnvVars?: boolean; // Defaults to true if not defined
}

// -----------------------------------------------------------------------------

export const load = async (opts?: Options): Promise<KeyValueSet> => {
	let values: Record<string, string> | undefined;

	if (typeof opts !== 'object' || Array.isArray(opts)) {
		throw new Error('Invalid options');
	}
	if (!Array.isArray(opts.vars)) {
		throw new Error('Invalid options');
	}
	for (const v of opts.vars) {
		switch (v.getType()) {
			case 'string':
			case 'number':
			case 'enum':
			case 'bool':
				break;

			default:
				throw new Error('Invalid variable definition for "' + v.getName() + '"');
		}
	}

	// Read variables from Hashicorp Vault if configured to do so
	if ((!opts.vaultOpts) || opts.vaultOpts.disable) {
		values = await loadFromVault(opts.vaultOpts);
	}

	// Set default empty object is nothing was loaded
	if (!values) {
		values = {};
	}

	// Override from process environment
	if ((!opts.envVarsOverride) || opts.envVarsOverride == EnvVarsOverride.MergeMissing || opts.envVarsOverride == EnvVarsOverride.Overwrite) {
		const mergeAlways = opts.envVarsOverride === EnvVarsOverride.Overwrite;
		for (const v of opts.vars) {
			const varName = v.getName();

			if (typeof process.env[varName] === 'string') {
				if (mergeAlways || typeof values[varName] === 'undefined') {
					values[varName] = process.env[varName]!;
				}
			}
		}
	}

	// Validate them
	const finalValues = await validateValues(values, opts.vars);

	// Overwrite process' environment variables if requested
	if (typeof opts.modifyEnvVars === 'undefined' || opts.modifyEnvVars) {
		for (const key in finalValues) {
			switch (typeof finalValues[key]) {
				case 'string':
					process.env[key] = finalValues[key] as string;
					break;
				case 'number':
					process.env[key] = (finalValues[key] as number).toString(10);
					break;
				case 'boolean':
					process.env[key] = (finalValues[key] as boolean) ? 'TRUE' : 'FALSE';
					break;
			}
		}
	}

	// Return values
	return finalValues;
};
