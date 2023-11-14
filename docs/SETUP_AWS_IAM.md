## Preparation

Follow the instructions of the [Setup common](./SETUP_COMMON.md) document.

## Setup AWS IAM authentication method

### Enable AWS auth engine by running the following command on the secondary SSH terminal

```bash
vault auth enable aws
```

### Enable the client to override the region of the STS API to use

```bash
vault write auth/aws/config/client use_sts_region_from_client=true
```

### Configure AWS authentication

(If your Vault server is running in an EC2 instance with the AWS role attached, you can skip this step.)

1. Create an access key for the IAM role used in the server instance and store them in `AUTH_CONFIG_AWS_SECRET_KEY` & `AUTH_CONFIG_AWS_ACCESS_KEY` variables.

2. Create `AWS_REGION` variable with the region you are using, for e.g.: `eu-west-1`

3. Run the following command to configure Vault's access to AWS:

```bash
vault write auth/aws/config/client secret_key=$AUTH_CONFIG_AWS_SECRET_KEY access_key=$AUTH_CONFIG_AWS_ACCESS_KEY region=$AWS_REGION
```

### Configure the client IAM role

Create a dummy IAM role and attach it to the AWS instance/container you will use for testing your application. Also store the ARN name into the `IAM_ROLE_ARN` variable.

Run the following command to associate the read-only access policy to the role:

```bash
vault write auth/aws/role/example-app-ro-role auth_type=iam bound_iam_principal_arn=$IAM_ROLE_ARN token_policies=example-app-ro period=1h token_ttl=10m token_max_ttl=10m
```

## Running the library's test

Install & compile this library into the test instance/container.

```bash
git clone https://github.com/c3exchange/simple-config
cd simple-config
npm install
```

Configure Vault URL:

```bash
export VAULT_URL='http://{server-ip-address}:8200/?path=%2Fsecret%2Fdata%2Fexample_app%2Fv1&roleName=example-app-ro-role&method=iam'
```

##### NOTES:

* The `path` parameter points to our example secrets location.
* The `roleName` parameter is the one configured in this example.
* The `method` parameter is enforced just in case you run the test on a K8s container.

At last run:

```bash
npm test
```
