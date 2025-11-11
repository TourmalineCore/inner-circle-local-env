kubectl delete job create-test-accounts -n local

helm uninstall create-test-accounts -n local

docker rmi create-test-accounts-for-local-env:0.0.1

docker exec inner-circle-control-plane crictl rmi create-test-accounts-for-local-env:0.0.1

docker build -t create-test-accounts-for-local-env:0.0.1 ./deploy/jobs

kind load docker-image create-test-accounts-for-local-env:0.0.1 --name inner-circle

helmfile cache cleanup && helmfile --environment local --namespace local -f deploy/helmfile.yaml apply

kubectl logs job/create-test-accounts -n local -f