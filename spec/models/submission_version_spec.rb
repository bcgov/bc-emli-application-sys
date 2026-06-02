# spec/models/submission_version_spec.rb
require "rails_helper"

RSpec.describe SubmissionVersion, type: :model do
  describe "Scopes" do
    # Create sandboxed and non-sandboxed permit applications
    let!(:jurisdiction) { create(:sub_district) }
    let!(:sandbox) { create(:sandbox, jurisdiction: jurisdiction) }
    let!(:sandboxed_application) do
      create(:permit_application, sandbox: sandbox, jurisdiction: jurisdiction)
    end
    let!(:live_application) do
      create(:permit_application, jurisdiction: jurisdiction)
    end

    # Create submission versions associated with the permit applications
    let!(:sandboxed_submission) do
      create(:submission_version, permit_application: sandboxed_application)
    end
    let!(:live_submission) do
      create(:submission_version, permit_application: live_application)
    end

    describe ".all" do
      it "returns only submission versions associated with non-sandboxed permit applications due to live scope" do
        expect(SubmissionVersion.live).to include(live_submission)
        expect(SubmissionVersion.live).not_to include(sandboxed_submission)
      end
    end

    describe ".sandboxed" do
      it "returns only submission versions associated with sandboxed permit applications" do
        expect(SubmissionVersion.sandboxed).to include(sandboxed_submission)
        expect(SubmissionVersion.sandboxed).not_to include(live_submission)
      end
    end

    describe ".live" do
      it "returns only submission versions associated with non-sandboxed permit applications" do
        expect(SubmissionVersion.live).to include(live_submission)
        expect(SubmissionVersion.live).not_to include(sandboxed_submission)
      end
    end

    describe "Default Scope" do
      it "includes all submission versions" do
        expect(SubmissionVersion.all).to include(sandboxed_submission)
        expect(SubmissionVersion.all).to include(live_submission)
      end
    end
  end

  describe "#missing_pdfs" do
    let(:app) { create(:permit_application) }
    let(:version) { create(:submission_version, permit_application: app) }

    it "reports the application PDF as missing when no supporting_documents exist" do
      expect(version.missing_pdfs).to include(
        "#{SupportingDocument::APPLICATION_PDF_DATA_KEY}_#{version.id}"
      )
    end

    it "does not fire queries when supporting_documents are preloaded" do
      SubmissionVersion
        .includes(:supporting_documents)
        .where(id: version.id)
        .each do |loaded|
          queries = count_queries { loaded.missing_pdfs }
          expect(queries).to eq(0),
          "N+1 detected: #{queries} queries fired on preloaded association"
        end
    end

    it "returns the same result whether or not supporting_documents are preloaded" do
      expected = version.missing_pdfs
      SubmissionVersion
        .includes(:supporting_documents)
        .where(id: version.id)
        .each { |loaded| expect(loaded.missing_pdfs).to eq(expected) }
    end
  end

  describe "#missing_permit_application_pdf?" do
    let(:app) { create(:permit_application) }
    let(:version) { create(:submission_version, permit_application: app) }

    it "does not fire queries when supporting_documents are preloaded" do
      SubmissionVersion
        .includes(:supporting_documents)
        .where(id: version.id)
        .each do |loaded|
          queries = count_queries { loaded.missing_permit_application_pdf? }
          expect(queries).to eq(0),
          "N+1 detected: #{queries} queries fired on preloaded association"
        end
    end
  end
end
