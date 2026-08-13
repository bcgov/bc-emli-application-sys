# SSL CSR Generation Guide

This guide shows how to generate a new private key and CSR for:

- bcenergysavingsprogram.ca
- www.bcenergysavingsprogram.ca

## 1. Prerequisites

- OpenSSL installed (`openssl version`)
- A secure local machine
- A safe location to store private keys

Important:

- Generate the key and CSR on a trusted machine.
- Never send your private key to the certificate provider.
- Only submit the CSR file contents.

## 2. Create an OpenSSL CSR config file

Create a file named `csr.conf`:

```ini
[ req ]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = dn
req_extensions     = req_ext

[ dn ]
C  = CA
ST = British Columbia
L  = Victoria
O  = Government of the Province of British Columbia
CN = bcenergysavingsprogram.ca

[ req_ext ]
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = bcenergysavingsprogram.ca
DNS.2 = www.bcenergysavingsprogram.ca
```

Notes:

- Keep `CN` as the primary host.
- Include all required hostnames in `subjectAltName`.

## 3. Generate a new private key

Use a clear server key name (avoid `-ca` in filename to prevent confusion with certificate authority keys):

```bash
openssl genrsa -out bcenergysavingsprogram-tls.key 2048
chmod 600 bcenergysavingsprogram-tls.key
```

## 4. Generate the CSR

```bash
openssl req -new \
  -key bcenergysavingsprogram-tls.key \
  -out bcenergysavingsprogram-tls.csr \
  -config csr.conf
```

## 5. Verify the CSR before submission

```bash
openssl req -in bcenergysavingsprogram-tls.csr -noout -text
```

Confirm the output includes:

- `Subject: ... CN = bcenergysavingsprogram.ca`
- `X509v3 Subject Alternative Name` with:
  - `DNS:bcenergysavingsprogram.ca`
  - `DNS:www.bcenergysavingsprogram.ca`

## 6. Submit CSR to your provider

Send only the CSR content:

```bash
cat bcenergysavingsprogram-tls.csr
```

Complete your provider validation steps (DNS/email/HTTP, depending on provider).

## 7. After certificate issuance

You should receive:

- Server certificate
- Intermediate CA bundle (chain)

Install the certificate with the same private key generated in step 3.

## 8. Verify cert matches private key

For RSA keys:

```bash
openssl x509 -noout -modulus -in server.crt | openssl md5
openssl rsa  -noout -modulus -in bcenergysavingsprogram-tls.key | openssl md5
```

The two hashes must match.

## 9. Secure storage checklist

- Store `bcenergysavingsprogram-tls.key` in a secure secret store
- Restrict file permissions and access
- Keep backup copies in approved secure storage
- Do not commit key/cert files to source control
