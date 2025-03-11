terraform {
  required_version = ">=1.10.0"

  backend "kubernetes" {
    namespace     = "bfc7dd-tools"
    secret_suffix = "state" # pragma: allowlist secret
    config_path   = "~/.kube/config"
  }
}

provider "kubernetes" {
  config_path = "~/.kube/config"
}
