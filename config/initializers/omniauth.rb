OmniAuth.config.before_request_phase do |env|
  request = Rack::Request.new(env)
  kc_idp_hint = request.params["kc_idp_hint"]

  # Replace kc_idp_hint with KEYCLOAK_CLIENT if needed
  if kc_idp_hint == "bcsc"
    request.update_param("kc_idp_hint", ENV["KEYCLOAK_CLIENT"])
    #request.update_param("kc_idp_hint", "bceidboth")
  end
end
