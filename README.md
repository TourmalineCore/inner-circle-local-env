# Local Kubernetes Environment

## Prerequisites

1. Install Docker
2. Install Visual Studio Code
3. Install Visual Studio Code [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) Extension
3. Install [Lens (commercial)](https://k8slens.dev/) or [OpenLens (open source)](https://github.com/MuhammedKalkan/OpenLens/releases)

## Register local artificial domain in hosts (DO ONLY ONCE)

To be able to open locally the app you need to add its domain to your OS `hosts`.

### For Windows

Open this file `C:\Windows\System32\drivers\etc\hosts` in **Administrator** mode in e.g. `Notepad` and add the following line to it:
```
127.0.0.1       inner-circle.local.tourmalinecore.internal
```

### For MacOS

Execute the following command in terminal to open `hosts` file in sudo mode:
```
sudo nano /etc/hosts
```
and add the line:
```
127.0.0.1       inner-circle.local.tourmalinecore.internal
```
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

### Cluster Connection

Then you should be able to go and grap the created k8s cluster config here in the root of the repo `.inner-circle-cluster-kubeconfig` and use it in `Lens` to connect to the cluster.

In `Lens` you can go to `File` -> `Add Cluster` and put there the copied `config` file content and create it.
Then you should be able to connect to it.

### Deployment to Cluster

To deploy the stack to the cluster at the first time or re-deploy it after a change in charts or their configuration execute the following command:

```bash
helmfile cache cleanup && helmfile --environment local --namespace local -f deploy/helmfile.yaml apply
```

>Note: at the first time this really takes a while.

>Note: `helmfile cache cleanup` is needed to force to re-fetch remote values.yaml files from git repos. Otherwise it will never invalidate them. Links: https://github.com/roboll/helmfile/issues/720#issuecomment-1516613493 and https://helmfile.readthedocs.io/en/latest/#cache.

>Note: if one of your services version was updated e.g. a newer version was published to `inner-circle-ui:latest` you won't see the changes executing `helmfile apply` command. Instead you need to remove the respective service Pod that it can be re-created by its Deployment and fetch the latest docker image. 

### Debugging Helm Charts

To see how all charts manifest are going to look like before apply you can execute the following command:

```bash
helmfile cache cleanup && helmfile --environment local --namespace local -f deploy/helmfile.yaml template
```

## Services URLs

- ui: http://inner-circle.local.tourmalinecore.internal:40100/
- api: http://inner-circle.local.tourmalinecore.internal:40100/api/

## Troubleshooting
- OpenLens not showing any pods, deployments, etc.. Make sure the "Namespace" in view "Workloads" is set to "`local`" or "`All namespaces`"

- cannot open http://inner-circle.local.tourmalinecore.internal/
    ```
    This site can’t be reached inner-circle.local.tourmalinecore.internal refused to connect.
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

## Cluster Removal

To delete the previously created cluster by any reason execute the following command:

```bash
kind delete cluster --name inner-circle
```

## Useful Refs used to setup repo

- https://shisho.dev/blog/posts/docker-in-docker/
- https://devopscube.com/run-docker-in-docker/
- https://github.com/kubernetes-sigs/kind/issues/3196
- https://github.com/devcontainers/features
- https://fenyuk.medium.com/helm-for-kubernetes-helmfile-c22d1ab5e604
