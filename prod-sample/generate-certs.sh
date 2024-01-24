#!/bin/bash
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj "/CN=$1" \
  -keyout ./$2/$2-privkey.pem -out ./$2/$2-cert.pem

# Append cert to aggregate cert file
cat ./$2/$2-cert.pem >> extra-certs.pem
# Append a new line
echo >> extra-certs.pem
