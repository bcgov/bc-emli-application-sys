module "oc_deployer" {
  source = "../_module"

  name                  = "oc-deployer"
  namespace             = "bfc7dd-tools"
  privileged_namespaces = ["bfc7dd-tools"]
}

output "service_account_id" {
  value = module.oc_deployer.service_account_id
}
