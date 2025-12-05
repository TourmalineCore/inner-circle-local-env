# Local Kubernetes Environment
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/TourmalineCore/inner-circle-local-env?quickstart=1)
## Table of contents

- [Local Kubernetes Environment](#local-kubernetes-environment)
  * [Table of contents](#table-of-contents)
  * [Prerequisites](#prerequisites)
  * [VSCode Dev Container](#vscode-dev-container)
  * [Manage Local k8s Cluster](#manage-local-k8s-cluster)
    + [Cluster Creation](#cluster-creation)
    + [Cluster Connection](#cluster-connection)
    + [Deployment to Cluster](#deployment-to-cluster)
    + [Debugging Helm Charts](#debugging-helm-charts)
    + [Cluster Removal](#cluster-removal)
  * [Services URLs after cluster creation and service deployment](#services-urls-after-cluster-creation-and-service-deployment)
  * [Troubleshooting](#troubleshooting)
  * [Useful Refs used to setup repo](#useful-refs-used-to-setup-repo)
  * [Deploy Specific Configuration](#deploy-specific-configuration)
    + [Using Specific Image from GitHub Registry](#using-specific-image-from-github-registry)
    + [Using Local Docker Image](#using-local-docker-image)
  
## Prerequisites

1. Install Docker
2. Install Visual Studio Code
3. Install Visual Studio Code [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) Extension
3. Install [Lens](https://k8slens.dev/) or [OpenLens](https://github.com/MuhammedKalkan/OpenLens/releases)

## VSCode Dev Container

Open this repo's folder in VSCode, it might immediately propose you to re-open it in a Dev Container or you can click on `Remote Explorer`, find plus button and choose the `Open Current Folder in Container` option and wait when it is ready.

When your Dev Container is ready, the VS Code window will be re-opened. Open a new terminal in this Dev Container which will be executing the commands under this prepared Linux container where we have already pre-installed and pre-configured:
- Docker Outside of Docker aka Docker from Docker to be able to use host's docker daemon from inside the container 
- [kind](https://kind.sigs.k8s.io/) to create a k8s cluster locally in Docker
- [kubectl](https://kubernetes.io/docs/reference/kubectl/) to call k8s cluster from CLI (bypassing Lens)
- [helm, helmfile](https://github.com/helmfile/helmfile) to deploy all services [helm](https://helm.sh/) charts at once to the local k8s cluster created with `kind`
- [helm-diff](https://github.com/databus23/helm-diff) show nicely what has changed since the last `helmfile apply`

>Note: You **don't** need to install these packages in your OS, these are part of the Dev Container already. Thus, it is a clean way to run the stack for any host OS.

## Manage Local k8s Cluster

### Cluster Creation

To create a new cluster where you will work execute the following command **once**:

```bash
kind create cluster --name inner-circle --config kind-local-config.yaml --kubeconfig ./.inner-circle-cluster-kubeconfig
```

### Using Docker Desktop Cluster

1. In Docker Desktop, go to settings (the gear on the top left);
2. Select Kubernetes in the settings on the right;
3. Turn on Kubernetes;
4. Apply the settings with the “Apply & restart” button;
5. Create `.to-dos-cluster-kubeconfig` file in this repo root folder;
6. Go to your system user `.kube` folder and open `config` file (on Windows: `C:/Users/<USERNAME>/.kube`, on masOS `Users/<USERNAME>/.kube/config`);
7. Copy this config file content and paste to `.to-dos-cluster-kubeconfig` file, created in the first step.

### Cluster Connection

Then you should be able to go and grap the created k8s cluster config here in the root of the repo `.inner-circle-cluster-kubeconfig` and use it in `Lens` (or `OpenLens`) to connect to the cluster.

In `Lens`/`OpenLens` you can go to `File` -> `Add Cluster` and put there the copied `config` file content and create it.
Then you should be able to connect to it.

### Deployment to Cluster

To deploy the stack to the cluster at the first time or re-deploy it after a change in charts or their configuration execute the following command:

```bash
helmfile cache cleanup && helmfile --environment local --namespace local -f deploy/helmfile.yaml apply
```
If you are running project in GitHub Codespaces use this command with 'concurrency' flag which sets the count of services that will be processed by helm in parallel and decreases RAM consumption:
```bash
helmfile cache cleanup && helmfile --environment local --namespace local -f deploy/helmfile.yaml apply --concurrency 1
```
>Note: at the first time this really takes a while.

>Note: `helmfile cache cleanup` is needed to force to re-fetch remote values.yaml files from git repos. Otherwise it will never invalidate them. Links: https://github.com/roboll/helmfile/issues/720#issuecomment-1516613493 and https://helmfile.readthedocs.io/en/latest/#cache.

>Note: if one of your services version was updated e.g. a newer version was published to `inner-circle-ui:latest` you won't see the changes executing `helmfile apply` command. Instead you need to remove the respective service Pod that it can be re-created by its Deployment and fetch the latest docker image. 

### Debugging Helm Charts

To see how all charts manifest are going to look like before apply you can execute the following command:

```bash
helmfile cache cleanup && helmfile --environment local --namespace local -f deploy/helmfile.yaml template
```

### Cluster Removal

To delete the previously created cluster by any reason execute the following command:

```bash
kind delete cluster --name inner-circle
```

## Services URLs after cluster creation and service deployment

When the all k8s pods are running inside **`local`** namespace you should be able to navigate to this URL's in your browser and see Inner Circle.

### Local Run
- UI: http://localhost:30090/
- API: http://localhost:30090/api/

### Run in GitHub Codespaces

- UI: <AUTOGENERATED_RANDOM_HOST>/
- API: <AUTOGENERATED_RANDOM_HOST>/api/

>Note: Comparing to local run where you specify 30090 port in case of Codespaces run the port is not specified. Instead GitHub makes it a part of the host, e.g. that is an example of a generated host `https://curly-cod-xx4645g6q52pxpx-30090.app.github.dev`, you can find `30090` as part of the subdomain "random" name. 

## Troubleshooting
- OpenLens not showing any pods, deployments, etc.. Make sure the "Namespace" in view "Workloads" is set to "`local`" or "`All namespaces`"

- cannot open http://localhost/
    ```
    This site can’t be reached localhost refused to connect.
    ```
    if you see this in your browser please try to open in Incognito Mode
- cannot install inner-circle-ui chart
    ```
    COMBINED OUTPUT:
    Release "inner-circle-ui" does not exist. Installing it now.
    coalesce.go:286: warning: cannot overwrite table with non table for nginx.ingress.annotations (map[])
    coalesce.go:286: warning: cannot overwrite table with non table for nginx.ingress.annotations (map[])
    Error: context deadline exceeded
    ```
    if you see this after you try to run `helmfile apply` command, simply retry `helmfile apply` command.

- in case of any other weird issue:
    1. Remove the `inner-circle-control-plane` docker container.
    2. Remove the cluster from Lens.
    3. Re-try over starting from `kind create` command.


## Useful Refs used to setup repo

- https://shisho.dev/blog/posts/docker-in-docker/
- https://devopscube.com/run-docker-in-docker/
- https://github.com/kubernetes-sigs/kind/issues/3196
- https://github.com/devcontainers/features
- https://fenyuk.medium.com/helm-for-kubernetes-helmfile-c22d1ab5e604

## Deploy Specific Configuration

How to deploy images from GitHub Registry or local Docker environments

### Using Specific Image from GitHub Registry

To deploy specific image tag published to GitHub Registry, use the following configuration for `values-your-service.yaml.gotmpl` file:

```
# layout-ui as example

image:
  registry: ghcr.io
  repository: "tourmalinecore/inner-circle-layout-ui"
  # Write tag of your image for deploy (change only symbols after "sha-")
  tag: "sha-f1c1e64bcb3401f602ac3b2afdf6066c6e2d4876"
```

### Using Local Docker Image

To deploy local Docker image, first load it into the kind cluster using the following command:

```
kind load docker-image your-local-image:your-tag --name your-cluster-name
```

Then use the following configuration for `values-your-service.yaml.gotmpl` file:

```
image:
  registry: ""
  repository: "my-layout"
  tag: "0.0.1"
  pullPolicy: "Never"
```

repository and tag are `your-local-image` and `your-tag` from deploy command


### job

after helm apply the job is considered completed, so you need to remove release from lens or uninstall chart (and job in this chart) locally and run helm apply again for it to work. it needs to execute it again because otherwise it will not restart if it has already been completed

```
helm uninstall create-test-accounts -n local
```

command to see job logs

```
kubectl logs job/create-test-accounts -n local -f
```
