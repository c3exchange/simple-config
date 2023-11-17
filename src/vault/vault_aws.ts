import { getDefaultRoleAssumerWithWebIdentity } from '@aws-sdk/client-sts';
import { RoleAssumerWithWebIdentity }  from '@aws-sdk/client-sts/dist-types/defaultStsRoleAssumers';
import { ENV_CMDS_FULL_URI, ENV_CMDS_RELATIVE_URI, RemoteProviderConfig } from '@smithy/credential-provider-imds';
import { getEnvVar } from '../util/envvars';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { fromInstanceMetadata, fromContainerMetadata, FromTokenFileInit } from '@aws-sdk/credential-providers';
import { fromTokenFile } from '@aws-sdk/credential-provider-web-identity';
import { chain, CredentialsProviderError, memoize } from '@smithy/property-provider';

// -----------------------------------------------------------------------------

interface CustomRemoteProviderInit extends RemoteProviderConfig {
	roleAssumerWithWebIdentity?: RoleAssumerWithWebIdentity;
}

export const customRemoteProvider = (init: CustomRemoteProviderInit) => {
	if (process.env[ENV_CMDS_RELATIVE_URI] || process.env[ENV_CMDS_FULL_URI]) {
		return fromContainerMetadata(init);
	}
	if (process.env['AWS_EC2_METADATA_DISABLED']) {
		return async () => {
			throw new Error('EC2 Instance Metadata Service access disabled');
		};
	}
	return fromInstanceMetadata(init);
};

export const customFullProvider = (init: CustomRemoteProviderInit & FromTokenFileInit) => {
	return memoize(
		chain(
			fromTokenFile(init),
			customRemoteProvider(init),
			async () => {
				throw new CredentialsProviderError('Could not load credentials from any providers', false);
			}
		),
		(credentials) => {
			return credentials.expiration !== undefined && credentials.expiration.getTime() - Date.now() < 300000;
		},
		(credentials) => {
			return credentials.expiration !== undefined;
		}
	);
};

export const createIamAuthPayload = async (region?: string | null, iamServerId?: string | null): Promise<Record<string, string | number>> => {
	if (!region) {
		region = getEnvVar('AWS_REGION');
		if (!region) {
			region = getEnvVar('AWS_DEFAULT_REGION');
			if (!region) {
				throw new Error('AWS region not provided and not defined in environment variables');
			}
		}
	}

	// create "cloud" provider
	const provider = customFullProvider({
		timeout: 2000,
		maxRetries: 5,
		roleAssumerWithWebIdentity: getDefaultRoleAssumerWithWebIdentity({
			region
		})
	});

	//get AWS credentials
	const credentials = await provider();

	//set up the signer
	const awsRequestBody = 'Action=GetCallerIdentity&Version=2011-06-15';
	const signer = new SignatureV4({
		credentials,
		service: 'sts',
		region,
		sha256: Sha256
	});

	//create the request to sign
	const stsHost = 'sts.' + region + 'amazonaws.com';
	const requestToBeSigned = new HttpRequest({
		protocol: 'https',
		method: 'POST',
		headers: {
			...(iamServerId && { 'X-Vault-AWS-IAM-Server-ID': iamServerId }),
			'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
			host: stsHost
		},
		hostname: stsHost,
		body: awsRequestBody,
		path: '/'
	});

	//sign the request
	const req = await signer.sign(requestToBeSigned);

	//return payload
	return {
		iam_http_request_method: 'POST',
		iam_request_url: Buffer.from('https://' + stsHost + '/').toString('base64'),
		iam_request_body: Buffer.from(awsRequestBody).toString('base64'),
		iam_request_headers: Buffer.from(JSON.stringify(req.headers)).toString('base64'),
	};
};
