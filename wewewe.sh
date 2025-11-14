# uninstall chart (and job in this chart)
# needs to execute it again because otherwise it will not restart if it has already been executed
# there are no diffs so job doesnt run again
helm uninstall create-test-accounts -n local

helmfile cache cleanup && helmfile --environment local --namespace local -f deploy/helmfile.yaml apply

kubectl logs job/create-test-accounts -n local -f