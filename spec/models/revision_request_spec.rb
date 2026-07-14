# spec/models/revision_request_spec.rb
require "rails_helper"

RSpec.describe RevisionRequest, type: :model do
  describe "comment column" do
    it "has a DB column limit of 1000 characters" do
      expect(RevisionRequest.columns_hash["comment"].limit).to eq(1000)
    end
  end

  describe "comment validation" do
    let(:revision_request) do
      build(:revision_request, user: build(:user, role: :admin))
    end

    it "is valid at exactly 1000 characters" do
      revision_request.comment = "a" * 1000
      expect(revision_request).to be_valid
    end

    it "is invalid over 1000 characters, without raising a DB error" do
      revision_request.comment = "a" * 1001
      expect(revision_request).not_to be_valid
      expect(revision_request.errors[:comment]).to be_present
    end
  end
end
