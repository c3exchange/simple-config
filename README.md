# Simple-Config

A simple application configuration library.

# Installation and usage

## Installation

Run the following command in your NodeJS project's directory.

```bash
npm i @c3exchange/simple-config
```

## Sample code

1. First define the configuration variables you expect. You can specify the type of variable and some constraints. For example:

```javascript
const variableDefs: Variable[] = [
	StringVar.define('DATABASE_HOST').minLength(1).maxLength(256).validator((value: string, name: string): string => {
		if (ipV4AddressRegex.test(value) || hostnameRegex.test(value)) {
			return value;
		}
		throw new Error('Variable "' + name + '" is not an IPv4 address nor a host name.');
	}),
	NumberVar.define('DATABASE_PORT').min(1).max(65535),
	BooleanVar.define('DATABASE_USE_SSL'),
	EnumVar.define('DATABASE_TYPE').allowed(['mysql', 'postgresql', 'mongodb'])
];
```

2. At program startup, try to load them from process environment variables and/or Hashicorp Vault secrets store.

```javascript
try {
	const settings = await load({
		vars: variableDefs
	});
	// ....
}
catch (err: any) {
	// ....
}
```

## Variable types

### StringVar

Define a string variable using `StringVar.define("{variable-name}")`.

The available constraints and options are:

| Name        | Description                                                                                                                      |
|-------------|----------------------------------------------------------------------------------------------------------------------------------|
| `minLength` | Specifies the minimum length.                                                                                                    |
| `maxLength` | Specifies the maximum length.                                                                                                    |
| `validator` | Specifies a custom validator callback. After performing your desired checks, the validator function can return a modified value. |

### NumberVar

Define a numeric variable using `NumberVar.define("{variable-name}")`.

The available constraints and options are:

| Name        | Description                                                                                                                      |
|-------------|----------------------------------------------------------------------------------------------------------------------------------|
| `min`       | Specifies the minimum value.                                                                                                     |
| `max`       | Specifies the maximum value.                                                                                                     |
| `musBeInt`  | Indicates if the number must be an integer value or can be float.                                                                |
| `validator` | Specifies a custom validator callback. After performing your desired checks, the validator function can return a modified value. |

### EnumVar

Define a string variable that only allows one of a set of values using `EnumVar.define("{variable-name}")`.

The available constraint is:

| Name      | Description                                                                                         |
|-----------|-----------------------------------------------------------------------------------------------------|
| `allowed` | An array of allowed values, case insensitive. The value is transformed to uppercase when processed. |

### BooleanVar

Define a boolean variable using `BooleanVar.define("{variable-name}")`.

The case-insensitive values `1`, `Y`, `yes`, `on`, `t` and `true` resolves to `true` and the values `0`, `N`, `no`, `off`, `f` and `false` resolves to `false`.

### Additional common options

| Name        | Description                                                                                                                      |
|-------------|----------------------------------------------------------------------------------------------------------------------------------|
| `required`  | Raises an exception if the variable is not found unless a `default`` value is assigned.                                          |
| `default`   | Sets a default value if the variable is not defined.                                                                             |

## Loader options

The `load` function accepts some configuration options that established the load behavior. By default, the library will attempt to load and merge variables in the following order:

1. From Vault, if access is allowed and a the environment variable containing the url is present.
2. From the process environment.

| Name              | Description                                                                                               |
|-------------------|-----------------------------------------------------------------------------------------------------------|
| `vars`            | An array of `Variable`` objects that defines the configuration settings to parse.                         |
| `envVarsOverride` | Specifies if the values readed from Vault can be overriden with values stored in the process environment. |
| `modifyEnvVars`   | The `load` function returns an object with the parsed values.<br />By enabling this setting, it will also set/overwrite the process' environment variables with stringified versions of the those values.<br />Defaults to `true`. |
| `vaultOpts`       | Customizes Vault access behavior. See below for details.                                                  |

Vault options:

| Name                   | Description                                                                                                                            |
|------------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| `disable`              | Skip the attempt to load variables from Vault.                                                                                         |
| `envVar`               | Sets what environment variable name may contain the Vault URL.<br />Defaults to `VAULT_URL`.                                           |
| `caCertEnvVar` (1)     | Sets what environment variable name may contain the filename of the certificate autority file.<br />Defaults to `VAULT_SSL_CACERT`.    |
| `certEnvVar`   (1) (2) | Sets what environment variable name may contain the filename of the client certificate file.<br />Defaults to `VAULT_SSL_CLIENT_CERT`. |
| `keyEnvVar`    (1) (2) | Sets what environment variable name may contain the filename of the client private key file.<br />Defaults to `VAULT_SSL_CLIENT_KEY`.  |

1. Used only when accesing Vault with HTTPS.
2. Define both variables or none. You cannot define just one of them.

# Hashicorp Vault setup and URL format

The [document folder](./docs/) contains instructions on how to configure Hashicorp Vault for different authentication methods like AppRole, [AWS](https://aws.amazon.com/) using IAM roles and [Kubernetes](https://kubernetes.io/).

The URL must have the following format: `{protocol}://{vault-host:vault-port}?{query-parameters}`

Where `protocol` can be `http` or `https`. `vault-host` and, optionally, `vault-port` indicates the location of Vault server. At last, `query-parameters` are:

| Parameter             | Description                                                                                                  |
|-----------------------|--------------------------------------------------------------------------------------------------------------|
| `method`              | Can be `iam`, `approle` or `k8s`. The loader tries to auto-detect the authorization method if not specified. |
| `mountPath`           | Sets the authentication mount path. Defaults to `aws`, `approle` or `kubernetes`.                            |
| `path`                | A full path where secrets are stored. For example: `/secret/data/my-app`. See notes below.                   |
| `roleName`            | Specifies the role name to use. Only valid for `iam` and `k8s` authentication methods.                       |
| `roleId` & `secretId` | Specifies the role and secret ids. Only valid for the `approle` authentication method.                       |
| `timeout`             | Establishes a query timeout. Defaults to 10 seconds.                                                         |
| `allowUntrusted`      | If set to `true`, invalid or expired HTTPS server certificates are ignored.                                  |

Remember to do escape encoding when specifying query parameters.

##### NOTES for the `path` parameter

* If multiple path query parameters are specified, they are read in order. If duplicated settings are found in more than one location, the lastest will be used.
* The path route may vary depending on the secrets engine you are accessing. Check Vault documentation.

# License

[MIT](./LICENSE.txt)
