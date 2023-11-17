import process from 'process';

// -----------------------------------------------------------------------------

export const getEnvVar = (varName?: string): string|undefined => {
	if (!varName) {
		return undefined;
	}
	if (typeof process.env[varName] !== 'string') {
		return undefined;
	}
	if (!process.env[varName]) {
		return undefined;
	}
	return process.env[varName]!;
}
