## Preparation

Follow the instructions of the [Setup common](./SETUP_COMMON.md) document.

## Setup AppRole authentication method

### Enable AppRole auth engine by running the following command on the secondary SSH terminal

```bash
vault auth enable approle
```

### Configure AppRole authentication

```bash
vault write auth/approle/role/example-app-ro-role token_policies=example-app-ro period=1h token_ttl=10m token_max_ttl=10m
```

### Generate a new set of credentials

```bash
vault read auth/approle/role/example-app-ro-role/role-id

vault write -f auth/approle/role/example-app-ro-role/secret-id
```

Take note of the `role_id` and `secret_id` outputs.

## Running the library's test

Install & compile this library into the test instance/container.

```bash
git clone https://github.com/c3exchange/simple-config
cd simple-config
npm install
```

Configure Vault URL:

```bash
export VAULT_URL='http://{server-ip-address}:8200/?path=%2Fsecret%2Fdata%2Fexample_app%2Fv1&roleId={role_id}&secretId={secret_id}'
```

##### NOTES:

* The `path` parameter points to our example secrets location.
* The `roleId` and `secretId` values are the one obtained previously.

At last run:

```bash
npm test
```
