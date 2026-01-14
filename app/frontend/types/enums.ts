/* eslint-disable no-unused-vars */
export enum EFlashMessageStatus {
  error = 'error',
  success = 'success',
  warning = 'warning',
  info = 'info',
}

export enum EPreviewStatus {
  invited = 'invited',
  access = 'access',
  expired = 'expired',
  revoked = 'revoked',
}

export enum EPermitClassificationType {
  AudienceType = 'AudienceType',
  UserGroupType = 'UserGroupType',
  SubmissionType = 'SubmissionType',
  PermitType = 'PermitType',
  Activity = 'Activity',
  SubmissionVariant = 'SubmissionVariant',
}

export enum ERequirementTemplateType {
  EarlyAccessRequirementTemplate = 'EarlyAccessRequirementTemplate',
  LiveRequirementTemplate = 'LiveRequirementTemplate',
}

export enum EPermitClassificationCode {
  lowResidential = 'low_residential',
  mediumResidential = 'medium_residential',
  highResidential = 'high_residential',
  newConstruction = 'new_construction',
  additionAlterationRenovation = 'addition_alteration_renovation',
  siteAlteration = 'site_alteration',
  demolition = 'demolition',
  internal = 'internal',
  external = 'external',
  participant = 'participant',
  contractor = 'contractor',
  invoice = 'invoice',
  application = 'application',
  supportRequest = 'support_request',
  onboarding = 'onboarding',
  invoiceHeatPumpSpace = 'invoice_heat_pump_space',
  invoiceHeatPumpWater = 'invoice_heat_pump_water',
  invoiceInsulation = 'invoice_insulation',
  invoiceWindowsDoors = 'invoice_windows_doors',
  invoiceVentilation = 'invoice_ventilation',
  invoiceElectricalUpgrade = 'invoice_electrical_upgrade',
  invoiceHealthSafety = 'invoice_health_safety',
}

export enum ESubmissionInboxTypes {
  participant = 'participant',
  contractor = 'contractor',
  onboarding = 'onboarding',
}

export enum EPermitApplicationStatus {
  draft = 'new_draft',
  submitted = 'newly_submitted',
  revisionsRequested = 'revisions_requested',
  resubmitted = 'resubmitted',
  ephemeral = 'ephemeral',
  inReview = 'in_review',
  trainingPending = 'training_pending',
  approvedPending = 'approved_pending',
  approvedPaid = 'approved_paid',
  approved = 'approved',
  ineligible = 'ineligible',
}

export enum EPermitApplicationStatusGroup {
  draft = 'draft',
  submitted = 'submitted',
  inReview = 'inReview',
  trainingPending = 'trainingPending',
  approvedPending = 'approvedPending',
  approvedPaid = 'approvedPaid',
  approved = 'approved',
  ineligible = 'ineligible',
  revisionsRequested = 'revisionsRequested',
  resubmitted = 'resubmitted',
}

export enum ETemplateVersionStatus {
  published = 'published',
  scheduled = 'scheduled',
  deprecated = 'deprecated',
  draft = 'draft',
}

export enum ExternalApiKeyStatus {
  active = 'active',
  notActive = 'notActive',
}

export enum EUserRoles {
  participant = 'participant',
  //regionalReviewManager = "regional_review_manager",
  //participantSupportRep = 'participant_support_rep',
  adminManager = 'admin_manager',
  admin = 'admin',
  systemAdmin = 'system_admin',
  contractor = 'contractor',
  unassigned = 'unassigned',
}

export enum EUpdateRoles {
  applicant = 'applicant',
  staff = 'staff',
}
export enum ERequirementLibrarySortFields {
  name = 'name',
  firstNations = 'first_nations',
  associations = 'associations',
  requirementLabels = 'requirement_labels',
  updatedAt = 'updated_at',
  configurations = 'configurations',
}

export enum EJurisdictionTypes {
  subDistrict = 'SubDistrict',
  regionalDistrict = 'RegionalDistrict',
}

export enum EJurisdictionSortFields {
  reverseQualifiedName = 'reverse_qualified_name',
  reviewManagersSize = 'review_managers_size',
  reviewersSize = 'reviewers_size',
  permitApplicationsSize = 'permit_applications_size',
  regionalDistrict = 'regional_district_name',
  submissionInboxSetUp = 'submission_inbox_set_up',
  templatesUsed = 'templates_used',
}

export enum EProgramSortFields {
  programName = 'program_name',
  adminManagersSize = 'admin_managers_size',
  adminSize = 'admins_size',
  permitApplicationsSize = 'permit_applications_size',
  regionalDistrict = 'regional_district_name',
  //templatesUsed = 'templates_used',
}

export enum EProgramUserGroupType {
  contractors = 'contractors',
  participants = 'participants',
}

export enum EUserSortFields {
  role = 'role',
  email = 'email',
  name = 'name',
  createdAt = 'created_at',
  lastSignInAt = 'last_sign_in_at',
}

export enum EActiveUserSortFields {
  name = 'name',
  email = 'email',
  role = 'role',
  submissionInbox = 'submission_inbox',
  createdAt = 'created_at',
  lastSignInAt = 'last_sign_in_at',
}

export enum EPendingUserSortFields {
  email = 'email',
  role = 'role',
  submissionInbox = 'submission_inbox',
  createdAt = 'created_at',
  lastSignInAt = 'last_sign_in_at',
  status = 'status',
}

export enum EDeactivatedUserSortFields {
  name = 'name',
  email = 'email',
  role = 'role',
  submissionInbox = 'submission_inbox',
  createdAt = 'created_at',
  lastSignInAt = 'last_sign_in_at',
}

export enum ERequirementTemplateSortFields {
  programName = 'program',
  userGroupType = 'user_group_type',
  audienceType = 'audience_type',
  submissionType = 'submission_type',
  nickname = 'nickname',
  // activity = 'activity',
  // firstNations = 'first_nations',
  // description = 'description',

  currentVersion = 'current_version',
  actions = 'actions',
}

export enum EEarlyAccessRequirementTemplateSortFields {
  nickname = 'nickname',
  applicationName = 'application_name',
  activity = 'activity',
  firstNations = 'first_nations',
  sharedWith = 'shared_with',
  updatedAt = 'updated_at',
  assignee = 'assignee',
}

export enum EContactSortFields {
  title = 'role/position',
  name = 'name',
  email = 'email',
  phone = 'phone',
  address = 'address',
}

export enum EPermitApplicationSortFields {
  number = 'number',
  permitClassification = 'permit_classification',
  submitter = 'submitter',
  submittedAt = 'submitted_at',
  viewedAt = 'viewed_at',
  status = 'status',
}

export enum EPermitApplicationSubmitterSortFields {
  // number = 'number',
  // permitClassification = 'permit_classification',
  // submitter = 'submitter',
  // submittedAt = 'submitted_at',
  // viewedAt = 'viewed_at',
  updatedAt = 'updated_at',
  // status = 'status',
}

export enum EPermitApplicationReviewerSortFields {
  status = 'status',
  number = 'number',
  submissionType = 'submission_type',
  // referenceNumber = 'reference_number',
  // permitClassification = 'permit_classification',
  submitter = 'submitter',
  // viewedAt = 'viewed_at',
  submittedAt = 'submitted_at',
  assigned = 'assigned',
  actions = 'actions',
}

export enum ESortDirection {
  ascending = 'asc',
  descending = 'desc',
}

export enum ELastUpdatedSortDirection {
  oldestFirst = 'asc',
  newestFirst = 'desc',
}

export enum ETagType {
  requirementBlock = 'RequirementBlock',
}

export enum ERequirementType {
  text = 'text',
  number = 'number',
  checkbox = 'checkbox',
  select = 'select',
  multiOptionSelect = 'multi_option_select',
  date = 'date',
  file = 'file',
  radio = 'radio',
  address = 'address',
  bcaddress = 'bcaddress',
  signature = 'signature',
  textArea = 'textarea',
  energyStepCode = 'energy_step_code',
  pidInfo = 'pid_info',
  phone = 'phone',
  email = 'email',
  generalContact = 'general_contact',
  professionalContact = 'professional_contact',
  serviceInformation = 'service_information',
}

export enum ENumberUnit {
  mm = 'mm',
  cm = 'cm',
  m = 'm',
  in = 'in',
  ft = 'ft',
  mi = 'mi',
  sqm = 'sqm',
  sqft = 'sqft',
  cad = 'cad',
}

export enum EPermitBlockStatus {
  draft = 'draft',
  inProgress = 'in_progress',
  ready = 'ready',
}

export enum EStepCodeChecklistStage {
  preConstruction = 'pre_construction',
  midConstruction = 'mid_construction',
  asBuilt = 'as_built',
}

export enum EStepCodeChecklistStatus {
  draf = 'draft',
  complete = 'complete',
}

export enum EStepCodeCompliancePath {
  stepCodeERS = 'step_code_ers',
  stepCodeNECB = 'step_code_necb',
  passiveHouse = 'passive_house',
  stepCode = 'step_code',
}

export enum EStepCodePrescriptiveValue {
  zeroCarbon = 'zero_carbon',
  carbon = 'carbon',
}

export enum EStepCodeAirtightnessValue {
  twoPointFive = 'two_point_five',
  threePointTwo = 'three_point_two',
}

export enum EStepCodeEPCTestingTargetType {
  ach = 'ach',
  nla = 'nla',
  nlr = 'nlr',
}

export enum EStepCodeBuildingType {
  laneway = 'laneway',
  singleDetached = 'single_detached',
  doulbleDetached = 'double_detached',
  row = 'row',
  multiPlex = 'multi_plex',
  singleDetachedWithSuite = 'single_detached_with_suite',
  lowRiseMURB = 'low_rise_murb',
  stackedDuplex = 'stacked_duplex',
  triplex = 'triplex',
  retail = 'retail',
  other = 'other',
}

export enum ESpaceHeatingCoolingVariant {
  principal = 'principal',
  secondary = 'secondary',
}

export enum EWindowsGlazedDoorsPerformanceType {
  usi = 'usi',
  uimp = 'u_imp',
}

export enum EDoorsPerformanceType {
  rsi = 'rsi',
  usi = 'usi',
}

export enum ESpaceHeatingCoolingPerformanceType {
  afue = 'afue',
  hspf = 'hspf',
  sse = 'sse',
  cop = 'cop',
  seer = 'seer',
}

export enum EHotWaterPerformanceType {
  percentEff = 'percent_eff',
  afue = 'afue',
  uef = 'uef',
  ef = 'ef',
  eer = 'eer',
}

export enum EFossilFuelsPresence {
  yes = 'yes',
  no = 'no',
  unknown = 'unknown',
}

export enum EEnergyStep {
  three = '3',
  four = '4',
  five = '5',
}

export enum EZeroCarbonStep {
  one = '1',
  two = '2',
  three = '3',
  four = '4',
}

export enum ERequirementContactFieldItemType {
  firstName = 'firstName',
  lastName = 'lastName',
  email = 'email',
  phone = 'phone',
  title = 'title',
  address = 'address',
  organization = 'organization',
  businessName = 'businessName',
  businessLicense = 'businessLicense',
  professionalAssociation = 'professionalAssociation',
  professionalNumber = 'professionalNumber',
}

export enum EGovFeedbackResponseNoReason {
  unclear = 'This information is unclear',
  missingInfo = 'This page is missing the information I need',
  notRelated = 'This page is not related to what I searched for',
  other = 'Other',
}

export enum ESocketDomainTypes {
  notification = 'notification',
  permitApplication = 'permit_application',
  template_version = 'template_version',
}

export enum ESocketEventTypes {
  update = 'update',
  new = 'new',
}

export enum EPermitApplicationSocketEventTypes {
  updateCompliance = 'update_compliance',
  updateSupportingDocuments = 'update_supporting_documents',
  updatePermitBlockStatus = 'update_permit_block_status',
}

export enum EEnabledElectiveFieldReason {
  bylaw = 'bylaw',
  zoning = 'zoning',
  policy = 'policy',
}

export enum ECustomEvents {
  handlePermitApplicationUpdate = 'handlePermitApplicationUpdate',
  openRequestRevision = 'openRequestRevision',
  openPreviousSubmission = 'openPreviousSubmission',
}

export enum EExportFormat {
  csv = 'csv',
  json = 'json',
}

export enum EReportingColumns {
  name = 'name',
  description = 'description',
  href = 'href',
}

export enum EEnergyStepCodeDependencyRequirementCode {
  energyStepCodeMethod = 'energy_step_code_method',
  energyStepCodeToolPart9 = 'energy_step_code_tool_part_9',
  energyStepCodeReportFile = 'energy_step_code_report_file',
  energyStepCodeH2000File = 'energy_step_code_h2000_file',
}

export enum EOmniauthProvider {
  idir = 'azureidir',
  basicBceid = 'bceidbasic',
  businessBceid = 'bceidbusiness',
  bcsc = 'bcsc',
}

export enum EAutoComplianceModule {
  DigitalSealValidator = 'DigitalSealValidator',
  ParcelInfoExtractor = 'ParcelInfoExtractor',
  PermitApplication = 'PermitApplication',
  HistoricSite = 'HistoricSite',
}

export enum EAutoComplianceType {
  fileValidator = 'file_validator',
  externalValueExtractor = 'external_value_extractor',
  internalValueExtractor = 'internal_value_extractor',
  externalOptionsMapper = 'external_options_mapper',
}

export enum EDeprecationReason {
  newPublish = 'new_publish',
  unscheduled = 'unscheduled',
}

export enum EFollowableTypes {
  permitTemplate = 'PermitTemplate',
}

export enum ERequirementChangeAction {
  added = 'added',
  changed = 'changed',
  removed = 'removed',
}

export enum ENotificationActionType {
  newTemplateVersionPublish = 'new_template_version_publish',
  publishedTemplateMissingRequirementsMapping = 'published_template_missing_requirements_mapping',
  scheduledTemplateMissingRequirementsMapping = 'scheduled_template_missing_requirements_mapping',
  customizationUpdate = 'customization_update',
  submissionCollaborationAssignment = 'submission_collaboration_assignment',
  submissionCollaborationUnassignment = 'submission_collaboration_unassignment',
  reviewCollaborationAssignment = 'review_collaboration_assignment',
  reviewCollaborationUnassignment = 'review_collaboration_unassignment',
  permitBlockStatusReady = 'permit_block_status_ready',
  applicationSubmission = 'application_submission',
  applicationRevisionsRequest = 'application_revisions_request',
  applicationView = 'application_view',
  applicationIneligible = 'application_ineligible',
  applicationWithdrawal = 'application_withdrawal',
  applicationAssignment = 'application_assignment',
  adminUpdatedParticipantApp = 'admin_updated_participant_app',
  participantIncompleteDraftNotification = 'participant_incomplete_draft_notification',
  accountUpdate = 'account_update',
  newSubmissionReceived = 'new_submission_received',
  templatePublished = 'template_published',
  newSupportingFilesRequested = 'supporting_files_requested',
  newSupportingFilesUploaded = 'supporting_files_uploaded',
}

export enum ECollaboratorableType {
  Jurisdiction = 'Jurisdiction',
  User = 'User',
}

export enum ECollaborationType {
  submission = 'submission',
  review = 'review',
}

export enum ECollaboratorType {
  delegatee = 'delegatee',
  assignee = 'assignee',
}

export enum EVisibility {
  live = 'live',
  earlyAccess = 'early_access',
  any = 'any',
}

export enum EJurisdictionExternalApiState {
  jOn = 'j_on',
  jOff = 'j_off',
  gOff = 'g_off',
}

export enum EProgramExternalApiState {
  jOn = 'j_on',
  jOff = 'j_off',
  gOff = 'g_off',
}

export enum ELandingTemplateKeys {
  SmallScale = 'small_scale_requirement_template_id',
  // FourPlus = "four_plus_template_version_id",
}

export enum EOnboardingRevisionFields {
  BUSINESS_NAME = 'business_name',
  BUSINESS_EMAIL = 'business_email',
  DOING_BUSINESS_AS = 'doing_business_as_if_different_from_business_name',
  BUSINESS_LICENCE_ISSUER = 'business_licence_issuer',
  BUSINESS_LICENCE_NUMBER = 'business_licence_number',
  YEAR_INCORPORATED = 'year_the_business_was_incorporated_if_applicable',
  NUMBER_OF_EMPLOYEES = 'approximate_number_of_employees',
  GST_NUMBER = 'gst_number',
  WORKSAFEBC_NUMBER = 'worksafebc_number',
  TYPE_OF_BUSINESS = 'type_of_business',
  PRIMARY_PROGRAM_MEASURES = 'primary_program_measures',
  RETROFIT_ENABLING_MEASURES = 'retrofit_enabling_measures',
  SERVICE_LANGUAGES = 'what_language_s_does_your_business_provide_services_in',
  SERVICE_INFO = 'service_info_v2',
}
