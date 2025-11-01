kubectl delete job create-test-accounts -n local

helm uninstall create-test-accounts -n local

docker rmi my-script:0.0.1

docker exec inner-circle-control-plane crictl rmi my-script:0.0.1

docker build -t my-script:0.0.1 -f deploy/jobs/Dockerfile .

kind load docker-image my-script:0.0.1 --name inner-circle

helmfile cache cleanup && helmfile --environment local --namespace local -f deploy/helmfile.yaml apply

kubectl logs job/create-test-accounts -n local -f