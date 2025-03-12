module "oc_deployer" {
  source = "../_module"

  name                  = "oc-deployer"
  namespace             = "bfc7dd-dev"
  privileged_namespaces = ["bfc7dd-dev"]
}

output "service_account_id" {
  value = module.oc_deployer.service_account_id
}
