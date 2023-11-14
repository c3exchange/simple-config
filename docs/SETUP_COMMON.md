## Run Hashicorp Vault in test mode

(If you are not planning to run a test on AWS, you can use any test computer and jump directly to step 3.)

1. Create a temporary AWS role with the following permissions. You may call it `vault-test-server`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:ListRoles",
        "iam:GetRole",
        "iam:GetUser"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "sts:GetCallerIdentity",
      "Resource": "*"
    }
  ]
}
```

2. Create an EC2 instance with the previous role attached to it.
3. Log through SSH, install Vault and launch it in DEV mode using the following command:

```bash
vault server -dev -dev-root-token-id="root" -dev-listen-address="0.0.0.0:8200" -dev-no-store-token
```

##### NOTE:

* This command will set up the text `root` as the root password and mount a KV v2 in the `/secret` path.

## Create test secrets

Open a secondary SSH connection in order to log into Vault and execute some administrative commands:

```bash
export VAULT_ADDR='http://0.0.0.0:8200'
vault login
vault kv put -mount=secret example_app/v1 SERVER_HOST=example.com SERVER_PORT=3100 SERVER_SSL=true DATABASE_TYPE=postgresql
```

## Create a test Read-Only policy

Run the following command in the secondary SSH connection:

```bash
vault policy write "example-app-ro" -<<EOF
path "secret/data/example_app" {
    capabilities = [ "read", "list" ]
}

path "secret/data/example_app/*" {
    capabilities = [ "read", "list" ]
}
EOF
```
