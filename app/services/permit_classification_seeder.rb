class PermitClassificationSeeder
  def self.seed
    # Define Classification data
    classifications = [
      {
        name: "Small-scale/Multi-unit housing (Part 9 BCBC)",
        code: "low_residential",
        description:
          "Single detached, duplex, triplex / fourplex / townhouse, secondary suite, accessory dwelling unit (ADU) e.g. garden suite",
        enabled: true,
        type: "PermitType"
      },
      {
        name: "4+ Unit housing",
        code: "medium_residential",
        description: "Part 9 townhouses, small apartment buildings",
        enabled: false,
        type: "PermitType"
      },
      {
        name: "High density apartment buildings",
        code: "high_residential",
        description: "Highest density residential structures",
        enabled: true,
        type: "PermitType"
      },
      {
        name: "New Construction",
        code: "new_construction",
        description:
          "Includes the addition to an existing building (infill development) but not the renovation of an existing home to include a secondary suite.",
        enabled: true,
        type: "Activity"
      },
      {
        name: "Addition, Alteration, or Renovation",
        code: "addition_alteration_renovation",
        description:
          "Modification of an existing residential dwelling to include a (secondary) suite (within the existing building footprint).",
        enabled: true,
        type: "Activity"
      },
      {
        name: "Site Alteration",
        code: "site_alteration",
        description:
          "Modifies land contours through grading, excavation, or preparation for construction projects. This process involves adjusting the earth to support new structures or landscaping.",
        enabled: true,
        type: "Activity"
      },
      {
        name: "Demolition",
        code: "demolition",
        description:
          "Involves the systematic tearing down of buildings and other structures, including clearing debris and preparing the site for future construction or restoration activities.",
        enabled: true,
        type: "Activity"
      },
      {
        name: "Internal",
        code: "internal",
        description: "",
        enabled: true,
        type: "AudienceType"
      },
      {
        name: "External",
        code: "external",
        description: "",
        enabled: true,
        type: "AudienceType"
      },
      {
        name: "Contractor",
        code: "contractor",
        description: "",
        enabled: true,
        type: "UserGroupType"
      },
      {
        name: "Participant",
        code: "participant",
        description: "",
        enabled: true,
        type: "UserGroupType"
      },
      {
        name: "Application",
        code: "application",
        description: "",
        enabled: true,
        type: "SubmissionType"
      },
      {
        name: "Onboarding",
        code: "onboarding",
        description: "",
        enabled: true,
        type: "SubmissionType"
      },
      {
        name: "Support Request",
        code: "support_request",
        description: "",
        enabled: true,
        type: "SubmissionType"
      },
      {
        name: "Invoice",
        code: "invoice",
        description: "",
        enabled: true,
        type: "SubmissionType"
      }
    ]

    classifications.each do |attrs|
      record = PermitClassification.find_or_initialize_by(code: attrs[:code])
      record.update!(attrs)
    end

    invoice = SubmissionType.find_by(code: :invoice)

    invoice_variants = [
      {
        name: "Heat pump (space heating)",
        code: "invoice_heat_pump_space",
        description: "",
        enabled: true,
        type: "SubmissionVariant",
        parent_id: invoice.id
      },
      {
        name: "Heat pump water heater (including combined)",
        code: "invoice_heat_pump_water",
        description: "",
        enabled: true,
        type: "SubmissionVariant",
        parent_id: invoice.id
      },
      {
        name: "Insulation",
        code: "invoice_insulation",
        description: "",
        enabled: true,
        type: "SubmissionVariant",
        parent_id: invoice.id
      },
      {
        name: "Windows and doors",
        code: "invoice_windows_doors",
        description: "",
        enabled: true,
        type: "SubmissionVariant",
        parent_id: invoice.id
      },
      {
        name: "Ventilation",
        code: "invoice_ventilation",
        description: "",
        enabled: true,
        type: "SubmissionVariant",
        parent_id: invoice.id
      },
      {
        name: "Electrical service upgrade",
        code: "invoice_electrical_upgrade",
        description: "",
        enabled: true,
        type: "SubmissionVariant",
        parent_id: invoice.id
      },
      {
        name: "Health and safety remediation",
        code: "invoice_health_safety",
        description: "",
        enabled: true,
        type: "SubmissionVariant",
        parent_id: invoice.id
      }
    ]

    invoice_variants.each do |attrs|
      record = PermitClassification.find_or_initialize_by(code: attrs[:code])
      record.update!(attrs)
    end

    PermitApplication.reindex
    RequirementTemplate.reindex
  end
end
