class Wrappers::EligibilityCodeChecker < Wrappers::Base
  def check(code)
    get(
      "/api/ESP_EligibilityCodeChecker/triggers/code/invoke/#{URI.encode_www_form_component(code)}",
      {
        "api-version" => "2022-05-01",
        :sp => "/triggers/code/run",
        :sv => "1.0",
        :sig => ENV["ELIGIBILITY_CODE_CHECKER_SIG"]
      }
    )
  end

  protected

  def base_url
    "https://c50028plog001.azurewebsites.net"
  end

  def default_headers
    { "Content-Type" => "application/json" }
  end
end
