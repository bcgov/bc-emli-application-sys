module "oc_deployer" {
  source = "../_module"

  name                  = "oc-deployer"
  namespace             = "bfc7dd-test"
  privileged_namespaces = ["bfc7dd-test"]
}

output "service_account_id" {
  value = module.oc_deployer.service_account_id
}
