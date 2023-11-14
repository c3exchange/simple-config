## Preparation

Follow the instructions of the [Setup common](./SETUP_COMMON.md) document.

## Setup Kubernetes authentication method

### Enable Kubernetes auth engine by running the following command on the secondary SSH terminal

```bash
vault auth enable kubernetes
```

### Gather K8s API settings

1. Get K8s host.

```bash
AUTH_CONFIG_K8S_HOST=$(kubectl config view --raw --minify --flatten --output='jsonpath={.clusters[].cluster.server}')
```

2. Get K8S CA certificates and save it to a file.

```bash
kubectl config view --raw --minify --flatten -o jsonpath='{.clusters[].cluster.certificate-authority-data}' | base64 --decode >~/k8s_cacert.pem
```

### Configure Kubernetes service account and roles

1. Create a Kubernetes configuration file named `test-vault.yml` which the content below and replace all appearances of `test-vault-auth` name and all appearances of `test` namespace with your desired configuration.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: test-vault-auth
  namespace: test
---
apiVersion: v1
kind: Secret
metadata:
  name: test-vault-auth
  namespace: test
  annotations:
    kubernetes.io/service-account.name: test-vault-auth
    kubernetes.io/service-account.namespace: test
type: kubernetes.io/service-account-token
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: role-tokenreview-binding
  namespace: test
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: system:auth-delegator
subjects:
  - kind: ServiceAccount
    name: test-vault-auth
    namespace: test
```

2. Create resources.

```bash
kubectl create -f test-vault-roles.yml
```

3. Obtain the access token. (Replace `test-vault-auth` name and `test` namespace with your configuration).

```bash
TOKEN_REVIEW_SJWT=$(kubectl get secret test-vault-auth --namespace test -o go-template="{{ .data.token }}" | base64 --decode)
```

### Configure K8s authentication

1. Setup K8s authentication with the values obtained before.

```bash
vault write /auth/kubernetes/config kubernetes_host="$AUTH_CONFIG_K8S_HOST" kubernetes_ca_cert=@~/k8s_cacert.pem token_reviewer_jwt="$TOKEN_REVIEW_SJWT"
```

2. Setup our example role.

```bash
vault write /auth/kubernetes/role/example-app-ro-role bound_service_account_names=mauro-test bound_service_account_namespaces=test token_policies=example-app-ro period=1h token_ttl=10m token_max_ttl=10m
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
export VAULT_URL='http://{server-ip-address}:8200/?path=%2Fsecret%2Fdata%2Fexample_app%2Fv1&roleName=example-app-ro-role&method=k8s'
```

##### NOTES:

* The `path` parameter points to our example secrets location.
* The `roleName` parameter is the one configured in this example.
* The `method` parameter is optional. The library should detect it is running under Kubernetes. Remember to set `automountServiceAccountToken=true` in the POD configuration.

At last run:

```bash
npm test
```
