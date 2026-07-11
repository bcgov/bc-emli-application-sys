# spec/models/revision_request_spec.rb
require "rails_helper"

RSpec.describe RevisionRequest, type: :model do
  describe "comment column" do
    it "allows comments up to the configured limit" do
      expect(RevisionRequest.columns_hash["comment"].limit).to eq(1000)
    end
  end
end
