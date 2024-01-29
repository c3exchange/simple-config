import https from 'https';
import fs from 'fs';
import crypto from 'crypto';
import { URL } from 'url';
import { createIamAuthPayload } from './vault_aws';
import { getAxiosClient } from '../util/http';
import { getEnvVar } from '../util/envvars';
import { toBool } from '../util/bool';

// -----------------------------------------------------------------------------

export interface VaultOptions {
	disable?: boolean;
	envVar?: string;         // Defaults to VAULT_URL environment variable
	caCertEnvVar?: string;   // Defaults to VAULT_SSL_CACERT environment variable
	certEnvVar?: string;     // Defaults to VAULT_SSL_CLIENT_CERT environment variable
	keyEnvVar?: string;      // Defaults to VAULT_SSL_CLIENT_KEY environment variable
}

// -----------------------------------------------------------------------------

const k8sTokenFiles = [
	'/var/run/secrets/kubernetes.io/serviceaccount/token',
	'/run/secrets/kubernetes.io/serviceaccount/token',
];

// -----------------------------------------------------------------------------

export const loadFromVault = async (opts?: VaultOptions): Promise<Record<string, string>|undefined> => {
	let url: URL;
	let loginPayload: Record<string, string|number> = {};

	if (!opts) {
		opts = {};
	}

	// Get Vault URL
	try {
		const s = getEnvVar(opts.envVar || 'VAULT_URL');
		if (!s) {
			return undefined;
		}
		url = new URL(s);
	}
	catch (err) {
		throw new Error('Invalid Vault url');
	}

	// Validate protocol, hostname and path
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error('Unsupported Vault url protocol');
	}
	if ((!url.hostname)) {
		throw new Error('Invalid Vault url');
	}
	if (url.pathname.length > 0 && url.pathname != '/') {
		throw new Error('Invalid Vault url');
	}

	// Get request timeout
	let timeout = parseInt(url.searchParams.get('timeout') || '10000', 10);
	if (timeout < 100) {
		timeout = 100;
	}

	// Parse parameters
	if (!url.searchParams) {
		throw new Error('Invalid Vault url (missing required parameters)');
	}

	// Get and validate path locations to read
	const locations = validatePathParam(url.searchParams.getAll('path'));
	if (locations.length == 0) {
		throw new Error('Invalid Vault url (path not specified or invalid)');
	}

	// Figure out the auth login mount path
	let mountPath = url.searchParams.get('mountPath');

	// Check if a role name was provided
	const roleName = url.searchParams.get('roleName');

	// Check if AppRole credentials were provided (both or none must be specified)
	const roleID = url.searchParams.get('roleId');
	const secretID = url.searchParams.get('secretId');

	// Determine the auth method (or autodetect)
	let method = url.searchParams.get('method');
	if (method) {
		if (method != 'approle' && method != 'iam' && method != 'k8s') {
			throw new Error('Invalid Vault url (method not supported)');
		}
	}
	else {
		// Try to guess
		if (roleID || secretID) {
			method = 'approle';
		}
		else if (getEnvVar('KUBERNETES_SERVICE_HOST')) {
			method = 'k8s';
		}
		else if (getEnvVar('EC2_INSTANCE_ID') || getEnvVar('ECS_CONTAINER_METADATA_URI_V4')) {
			method = 'iam';
		}
		else {
			try {
				const client = getAxiosClient();
				await client.get('http://169.254.169.254/latest/meta-data/');
				// If we reach here, we are on something running at AWS
				method = 'iam';
			}
			catch (err: any) {
				if (err.response) {
					// If we get any response, then we are on something running at AWS
					method = 'iam';
				}
			}
		}

		if (!method) {
			throw new Error('Unable to guess Vault access method');
		}

	}

	// Prepare payload and set mount path if not provided
	switch (method) {
		case 'approle':
			if ((!roleID) || (!secretID)) {
				throw new Error('Invalid Vault url (both roleId and secretId parameters are required)');
			}

			loginPayload = {
				'role_id': roleID,
				'secret_id': secretID,
			}

			if (!mountPath) {
				mountPath = 'approle';
			}
			break;

		case 'k8s':
			if (!roleName) {
				throw new Error('Invalid Vault url (roleName not provided)');
			}

			loginPayload = {
				'role': roleName
			}

			for (const file of k8sTokenFiles) {
				if (fs.existsSync(file)) {
					loginPayload.jwt = fs.readFileSync(file, 'utf8');
					break;
				}
			}
			if (!(loginPayload.jwt)) {
				throw new Error('Unable to locate K8S service account token file');
			}

			if (!mountPath) {
				mountPath = 'kubernetes';
			}
			break;

		case 'iam':
			if (!roleName) {
				throw new Error('Invalid Vault url (roleName not provided)');
			}

			loginPayload = await createIamAuthPayload(url.searchParams.get('region'), url.searchParams.get('serverId'));
			loginPayload.role = roleName;

			if (!mountPath) {
				mountPath = 'aws';
			}
			break;
	}

	// Create HTTPS agent if required
	const httpsAgent = (url.protocol == 'https:') ? createHttpsAgent(opts, url.searchParams.get('allowUntrusted')) : undefined;

	// Execute log in
	let vaultAccessToken: string;
	try {
		const client = getAxiosClient();
		const response = await client.request({
			url: url.protocol + '//' + url.host + '/v1/auth/' + mountPath + '/login',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json'
			},
			data: loginPayload,
			responseType: 'json',
			timeout,
			httpsAgent,
			validateStatus: (status) => {
				return status >= 200 && status < 500;
			}
		});

		if (typeof response.data == 'object' && Array.isArray(response.data.errors) && response.data.errors.length > 0) {
			throw new Error(response.data.errors[0]);
		}
		if (response.status < 200 || response.status > 299) {
			throw new Error('unexpected status code ' + response.status.toString());
		}
		if (typeof response.data !== 'object') {
			throw new Error('internal error');
		}

		vaultAccessToken = response.data.auth?.client_token;
		if (!vaultAccessToken) {
			throw new Error('token not found');
		}
	}
	catch (err: any) {
		let msg = '';
		if (err.message) {
			msg = ' [' + err.message + ']';
		}
		else if (err.toString) {
			msg = ' [' + err.toString() + ']';
		}
		throw new Error('Unable to log in Vault' + msg);
	}

	// Now read stored variables
	const values:Record<string, string> = {};

	for (const loc of locations) {
		try {
			const client = getAxiosClient();
			const response = await client.request({
				url: url.protocol + '//' + url.host + '/v1' + loc,
				method: 'GET',
				headers: {
					'X-Vault-Token': vaultAccessToken,
					'Accept': 'application/json'
				},
				responseType: 'json',
				timeout,
				httpsAgent,
				validateStatus: (status) => {
					return status >= 200 && status < 500;
				}
			});

			if (typeof response.data == 'object' && Array.isArray(response.data.errors) && response.data.errors.length > 0) {
				throw new Error(response.data.errors[0]);
			}
			if ((response.status < 200 || response.status > 299) && response.status != 404) {
				throw new Error('unexpected status code ' + response.status.toString());
			}
			if (typeof response.data !== 'object') {
				throw new Error('internal error');
			}

			if (typeof response.data === 'object') {
				let keyValuePairs = response.data;
				if (typeof keyValuePairs.data === 'object') {
					keyValuePairs = keyValuePairs.data;
				}

				// Vault actually stores a JSON-like object inside a path but normally, people treats
				// it like a set of key/value pairs, maybe because the CLI utility does the same.
				for (const [k, v] of Object.entries(keyValuePairs)) {
					switch (typeof v) {
						case 'undefined':
							values[k] = '';
							break;
						case 'number':
							values[k] = v.toString();
							break;
						case 'string':
							values[k] = v;
							break;
						case 'object':
							values[k] = JSON.stringify(v);
							break;
					}
				}
			}
		}
		catch (err: any) {
			let msg = '';
			if (err.message) {
				msg = ' [' + err.message + ']';
			}
			else if (err.toString) {
				msg = ' [' + err.toString() + ']';
			}
			throw new Error('Unable to read secrets from Vault' + msg);
		}
	}
	
	// Done
	return values;
};

// -----------------------------------------------------------------------------

const createHttpsAgent = (opts?: VaultOptions, allowUntrusted?: string | null) => {
	const options: https.AgentOptions = {};
	if (opts) {
		options.ca = readFileFromEnvSync(opts.caCertEnvVar || 'VAULT_SSL_CACERT');
		options.cert = readFileFromEnvSync(opts.certEnvVar || 'VAULT_SSL_CLIENT_CERT');
		options.key = readFileFromEnvSync(opts.keyEnvVar || 'VAULT_SSL_CLIENT_KEY');
	}
	if (allowUntrusted) {
		const b = toBool(allowUntrusted);
		if (typeof b === 'undefined') {
			throw new Error('Invalid Vault url (invalid allowUntrusted value)');
		}
		options.rejectUnauthorized = b;
	}
	return new https.Agent(options);
};

const readFileFromEnvSync = (envVar: string): string|undefined => {
	const varValue = getEnvVar(envVar);
	if (!varValue) {
		return undefined;
	}
	const pem = fs.readFileSync(varValue, { encoding: 'utf8' });
	return pem;
};

const validatePathParam = (path: string[]): string[] => {
	const finalPaths: string[] = [];
	const keys = new Map<string, boolean>();

	// No path? Error
	if (path.length == 0) {
		return [];
	}
	for (const p of path) {
		let _p = p.replaceAll('\\', '/').replace(/\/+/gu, '/');

		// Path does not start with a slash? Error
		if (!p.startsWith('/')) {
			return [];
		}
		
		// Path ends with a slash? Remove it
		if (_p.endsWith('/')) {
			_p = _p.substring(0, _p.length - 1);
		}

		// Path is empty or root? Error
		if (_p.length == 0 || _p == '/') {
			return [];
		}

		// Ignore duplicate path
		const hash = crypto.createHash('sha256').update(_p).digest('hex');
		if (keys.has(hash)) {
			continue;
		}
		keys.set(hash, true);

		finalPaths.push(_p);
	}

	// Done
	return finalPaths;
};
