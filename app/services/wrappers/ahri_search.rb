class Wrappers::AhriSearch < Wrappers::Base
  QUICK_SEARCH_PATH = "/SearchConfiguration/GetQuickSearchByReferenceId".freeze
  DETAIL_RESULTS_PATH = "/SearchConfiguration/GetSearchDetailResults".freeze

  def quick_search_by_reference_id(reference_id)
    post(QUICK_SEARCH_PATH, { ReferenceId: reference_id.to_s }.to_json)
  end

  def search_detail_results(program_id, reference_id)
    post(
      DETAIL_RESULTS_PATH,
      { ProgramId: program_id.to_i, ReferenceId: reference_id.to_s }.to_json
    )
  end

  protected

  def base_url
    ENV.fetch(
      "AHRI_SEARCH_BASE_URL",
      "https://beta-ahrisearch.ahridirectory.org"
    )
  end

  def default_headers
    { "Content-Type" => "application/json", "Accept" => "application/json" }
  end
end
