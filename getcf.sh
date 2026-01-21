#!/bin/bash

# first, go to localhost:8888 and start a new kernel
SYSTEM_SERVICE_HOST=localhost
SYSTEM_SERVICE_PORT=7654
jupyter_token_name=jupyter
jupyter_token=$(curl -s -X PUT "http://${SYSTEM_SERVICE_HOST}:${SYSTEM_SERVICE_PORT}/tokens/${jupyter_token_name}")
JUPYTER_SERVICE_HOST=127.0.0.1
JUPYTER_SERVICE_PORT=8888
jupyter_kernel_id=$(curl -s -H "Authorization: Bearer $jupyter_token" http://${JUPYTER_SERVICE_HOST}:${JUPYTER_SERVICE_PORT}/jupyter/api/kernels | jq -r .[0].id)
docker exec -it jupyter jupyter --paths
# last path ('runtime:') should be /tmp
docker exec jupyter cat /tmp/kernel-${jupyter_kernel_id}.json > connection.json
# now you have a connection file!
