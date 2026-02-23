import { Box, Center } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { Suspense, lazy, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useMst } from '../../../setup/root';
import { EFlashMessageStatus } from '../../../types/enums';
import { FlashMessage } from '../../shared/base/flash-message';
import { LoadingScreen } from '../../shared/base/loading-screen';
import { SupportScreen } from '../misc/support-screen';
import { EULAScreen } from '../onboarding/eula';
import { NavBar } from './nav-bar';
import { ProtectedRoute } from './protected-route';
import { AdminPortalLogin } from '../admin/login';
import { ProgramsIndexScreen } from '../programs';
import { ProgramInviteUserScreen } from '../programs/invite-users';
import { RejectApplicationScreen } from '../energy-savings-application/application-rejection-reason';
import { BlankTemplateScreen } from '../requirement-template/screens/blank-template';
import { ContractorLandingScreen } from '../contractor-landing';
import { ContractorManagementScreen } from '../contractor-management';
import { ContractorEmployeeIndexScreen } from '../contractor-management/employees';
import { ContractorProgramResourcesScreen } from '../contractor-management/contractor-program-resources-screen';
import { ContractorDashboardScreen } from '../contractor-dashboard/contractor-dashboard-screen';
import { ContractorOnboardingImport } from '../contractor-landing/import';
import { SuspendReasonPage } from '../contractor-management/suspend-reason-page';
import { RemoveReasonPage } from '../contractor-management/remove-reason-page';
import { ContractorSuspendConfirmedScreen } from '../energy-savings-application/successful-action-screens';
import { ContractorUnsuspendConfirmedScreen } from '../energy-savings-application/successful-action-screens';
import { ContractorRemoveConfirmedScreen } from '../energy-savings-application/successful-action-screens';
import { trackPageViewEvent } from '../../../utils/snowplow';

const ExternalApiKeysIndexScreen = lazy(() =>
  import('../external-api-key').then((module) => ({ default: module.ExternalApiKeysIndexScreen })),
);

const AdminInviteScreen = lazy(() =>
  import('../users/admin-invite-screen').then((module) => ({ default: module.AdminInviteScreen })),
);

const AuditLogScreen = lazy(() => import('../audit-log').then((module) => ({ default: module.AuditLogScreen })));

const ExternalApiKeyModalSubRoute = lazy(() =>
  import('../external-api-key/external-api-key-modal-sub-route').then((module) => ({
    default: module.ExternalApiKeyModalSubRoute,
  })),
);

const NotFoundScreen = lazy(() =>
  import('../../shared/base/not-found-screen').then((module) => ({ default: module.NotFoundScreen })),
);

const PermitApplicationPDFViewer = lazy(() =>
  import('../../shared/energy-savings-applications/pdf-content/viewer').then((module) => ({
    default: module.PermitApplicationPDFViewer,
  })),
);

const EmailConfirmedScreen = lazy(() =>
  import('../authentication/email-confirmed-screen').then((module) => ({ default: module.EmailConfirmedScreen })),
);

const EligibilityCheck = lazy(() =>
  import('../eligibility-check').then((module) => ({ default: module.EligibilityCheck })),
);
const LoginScreen = lazy(() =>
  import('../authentication/login-screen').then((module) => ({ default: module.LoginScreen })),
);
const HomeScreen = lazy(() => import('../home').then((module) => ({ default: module.HomeScreen })));
const ConfigurationManagementScreen = lazy(() =>
  import('../home/review-manager/configuration-management-screen').then((module) => ({
    default: module.ConfigurationManagementScreen,
  })),
);
const EnergyStepRequirementsScreen = lazy(() =>
  import('../home/review-manager/configuration-management-screen/energy-step-requirements-screen').then((module) => ({
    default: module.EnergyStepRequirementsScreen,
  })),
);
const SubmissionsInboxSetupScreen = lazy(() =>
  import('../home/review-manager/configuration-management-screen/submissions-inbox-setup-screen').then((module) => ({
    default: module.SubmissionsInboxSetupScreen,
  })),
);

const NewProgramScreen = lazy(() =>
  import('../programs/new-program-screen').then((module) => ({ default: module.NewProgramScreen })),
);

const JurisdictionIndexScreen = lazy(() =>
  import('../jurisdictions/index').then((module) => ({ default: module.JurisdictionIndexScreen })),
);
const JurisdictionScreen = lazy(() =>
  import('../jurisdictions/jurisdiction-screen').then((module) => ({ default: module.JurisdictionScreen })),
);
const LimitedJurisdictionIndexScreen = lazy(() =>
  import('../jurisdictions/limited-jurisdiction-index-screen').then((module) => ({
    default: module.LimitedJurisdictionIndexScreen,
  })),
);
const NewJurisdictionScreen = lazy(() =>
  import('../jurisdictions/new-jurisdiction-screen').then((module) => ({ default: module.NewJurisdictionScreen })),
);
const ProgramSubmissionInboxScreen = lazy(() =>
  import('../programs/submission-inbox/program-submisson-inbox-screen').then((module) => ({
    default: module.ProgramSubmissionInboxScreen,
  })),
);
const JurisdictionUserIndexScreen = lazy(() =>
  import('../jurisdictions/users').then((module) => ({ default: module.JurisdictionUserIndexScreen })),
);
const ProgramUserIndexScreen = lazy(() =>
  import('../programs/users').then((module) => ({ default: module.ProgramUserIndexScreen })),
);
const LandingScreen = lazy(() => import('../landing').then((module) => ({ default: module.LandingScreen })));
const ContactScreen = lazy(() =>
  import('../misc/contact-screen').then((module) => ({ default: module.ContactScreen })),
);
const EnergySavingsApplicationIndexScreen = lazy(() =>
  import('../energy-savings-application').then((module) => ({ default: module.EnergySavingsApplicationIndexScreen })),
);
const EditPermitApplicationScreen = lazy(() =>
  import('../energy-savings-application/edit-energy-savings-application-screen').then((module) => ({
    default: module.EditPermitApplicationScreen,
  })),
);

const NewApplicationScreen = lazy(() =>
  import('../energy-savings-application/new-application').then((module) => ({
    default: module.NewApplicationScreen,
  })),
);
const NewInvoiceScreen = lazy(() =>
  import('../energy-savings-application/new-invoice-screen').then((module) => ({
    default: module.NewInvoiceScreen,
  })),
);
const ReviewPermitApplicationScreen = lazy(() =>
  import('../energy-savings-application/review-permit-application-screen').then((module) => ({
    default: module.ReviewPermitApplicationScreen,
  })),
);
const SuccessfulSubmissionScreen = lazy(() =>
  import('../energy-savings-application/successful-submission').then((module) => ({
    default: module.SuccessfulSubmissionScreen,
  })),
);
const SuccessfulWithdrawalScreen = lazy(() =>
  import('../energy-savings-application/successful-action-screens').then((module) => ({
    default: module.SuccessfulWithdrawalScreen,
  })),
);
const SuccessfulScreenedInScreen = lazy(() =>
  import('../energy-savings-application/successful-action-screens').then((module) => ({
    default: module.SuccessfulScreenedInScreen,
  })),
);
const SuccessfulApprovedPendingScreen = lazy(() =>
  import('../energy-savings-application/successful-action-screens').then((module) => ({
    default: module.SuccessfulApprovedPendingScreen,
  })),
);
const SuccessfulApprovedPaidScreen = lazy(() =>
  import('../energy-savings-application/successful-action-screens').then((module) => ({
    default: module.SuccessfulApprovedPaidScreen,
  })),
);
const SuccessfulIneligibleScreen = lazy(() =>
  import('../energy-savings-application/successful-action-screens').then((module) => ({
    default: module.SuccessfulIneligibleScreen,
  })),
);
const SuccessfulUpdateScreeen = lazy(() =>
  import('../energy-savings-application/successful-action-screens').then((module) => ({
    default: module.SuccessfulUpdateScreen,
  })),
);
const SuccessfulTrainingPendingScreen = lazy(() =>
  import('../energy-savings-application/successful-action-screens').then((module) => ({
    default: module.SuccessfulTrainingPendingScreen,
  })),
);
const SuccessfulOnboardingApprovalScreen = lazy(() =>
  import('../energy-savings-application/successful-action-screens').then((module) => ({
    default: module.SuccessfulOnboardingApprovalScreen,
  })),
);
const NewRequirementTemplateScreen = lazy(() =>
  import('../requirement-template/new-requirement-template-screen').then((module) => ({
    default: module.NewRequirementTemplateScreen,
  })),
);
const EditRequirementTemplateScreen = lazy(() =>
  import('../requirement-template/screens/edit-requirement-template-screen').then((module) => ({
    default: module.EditRequirementTemplateScreen,
  })),
);
const JurisdictionDigitalPermitScreen = lazy(() =>
  import('../requirement-template/screens/jurisdiction-digital-permit-screen').then((module) => ({
    default: module.JurisdictionDigitalPermitScreen,
  })),
);
const JurisdictionEditDigitalPermitScreen = lazy(() =>
  import('../requirement-template/screens/jurisdiction-edit-digital-permit-screen').then((module) => ({
    default: module.JurisdictionEditDigitalPermitScreen,
  })),
);
const JurisdictionApiMappingsSetupIndexScreen = lazy(() =>
  import('../requirement-template/screens/jurisdiction-api-mappings-setup-index-screen').then((module) => ({
    default: module.JurisdictionApiMappingsSetupIndexScreen,
  })),
);

const EditJurisdictionApiMappingScreen = lazy(() =>
  import('../requirement-template/screens/edit-jurisdiction-api-mapping-screen').then((module) => ({
    default: module.EditJurisdictionApiMappingScreen,
  })),
);

const RequirementTemplatesScreen = lazy(() =>
  import('../requirement-template/screens/requirement-template-screen').then((module) => ({
    default: module.RequirementTemplatesScreen,
  })),
);
const TemplateVersionScreen = lazy(() =>
  import('../requirement-template/screens/template-version-screen').then((module) => ({
    default: module.TemplateVersionScreen,
  })),
);

const ExportTemplatesScreen = lazy(() =>
  import('../jurisdictions/exports/export-templates-screen').then((module) => ({
    default: module.ExportTemplatesScreen,
  })),
);

const RequirementsLibraryScreen = lazy(() =>
  import('../requirements-library').then((module) => ({ default: module.RequirementsLibraryScreen })),
);
const StepCodeForm = lazy(() => import('../step-code').then((module) => ({ default: module.StepCodeForm })));
const StepCodeChecklistPDFViewer = lazy(() =>
  import('../step-code/checklist/pdf-content/viewer').then((module) => ({
    default: module.StepCodeChecklistPDFViewer,
  })),
);
const SiteConfigurationManagementScreen = lazy(() =>
  import('../super-admin/site-configuration-management').then((module) => ({
    default: module.SiteConfigurationManagementScreen,
  })),
);
const SitewideMessageScreen = lazy(() =>
  import('../super-admin/site-configuration-management/sitewide-message-screen').then((module) => ({
    default: module.SitewideMessageScreen,
  })),
);
const HelpDrawerSetupScreen = lazy(() =>
  import('../super-admin/site-configuration-management/help-drawer-setup-screen').then((module) => ({
    default: module.HelpDrawerSetupScreen,
  })),
);

const RevisionReasonSetupScreen = lazy(() =>
  import('../super-admin/site-configuration-management/revision-reason-setup-screen').then((module) => ({
    default: module.RevisionReasonSetupScreen,
  })),
);

const LandingSetupScreen = lazy(() =>
  import('../super-admin/site-configuration-management/landing-setup-screen').then((module) => ({
    default: module.LandingSetupScreen,
  })),
);

const AdminUserIndexScreen = lazy(() =>
  import('../super-admin/site-configuration-management/users-screen').then((module) => ({
    default: module.AdminUserIndexScreen,
  })),
);

const ReportingScreen = lazy(() =>
  import('../super-admin/reporting/reporting-screen').then((module) => ({ default: module.ReportingScreen })),
);

const ExportTemplateSummaryScreen = lazy(() =>
  import('../super-admin/reporting/export-template-summary-screen').then((module) => ({
    default: module.ExportTemplateSummaryScreen,
  })),
);

const EarlyAccessScreen = lazy(() =>
  import('../super-admin/early-access/early-access-screen').then((module) => ({
    default: module.EarlyAccessScreen,
  })),
);

const EarlyAccessRequirementTemplatesIndexScreen = lazy(() =>
  import('../super-admin/early-access/requirement-templates').then((module) => ({
    default: module.EarlyAccessRequirementTemplatesIndexScreen,
  })),
);

const EarlyAccessRequirementTemplateScreen = lazy(() =>
  import('../super-admin/early-access/requirement-templates/early-access-requirement-template-screen').then(
    (module) => ({
      default: module.EarlyAccessRequirementTemplateScreen,
    }),
  ),
);

const NewEarlyAccessRequirementTemplateScreen = lazy(() =>
  import('../super-admin/early-access/requirement-templates/new-early-access-requirement-template-screen').then(
    (module) => ({
      default: module.NewEarlyAccessRequirementTemplateScreen,
    }),
  ),
);

const EditEarlyAccessRequirementTemplateScreen = lazy(() =>
  import('../super-admin/early-access/requirement-templates/edit-early-access-requirement-template-screen').then(
    (module) => ({
      default: module.EditEarlyAccessRequirementTemplateScreen,
    }),
  ),
);

const EarlyAccessRequirementsLibraryScreen = lazy(() =>
  import('../super-admin/early-access/requirements-library').then((module) => ({
    default: module.EarlyAccessRequirementsLibraryScreen,
  })),
);

const AcceptInvitationScreen = lazy(() =>
  import('../programs/accept-invitation-screen').then((module) => ({ default: module.AcceptInvitationScreen })),
);
//const InviteScreen = lazy(() => import('../users/invite-screen').then((module) => ({ default: module.InviteScreen })));
const InviteEmployeeScreen = lazy(() =>
  import('../users/invite-employee-screen').then((module) => ({ default: module.InviteEmployeeScreen })),
);
const ProfileScreen = lazy(() =>
  import('../users/profile-screen').then((module) => ({ default: module.ProfileScreen })),
);
const RedirectScreen = lazy(() =>
  import('../../shared/base/redirect-screen').then((module) => ({ default: module.RedirectScreen })),
);

const Footer = lazy(() => import('../../shared/base/footer').then((module) => ({ default: module.Footer })));

export const Navigation = observer(() => {
  const { sessionStore, siteConfigurationStore } = useMst();
  const { isLoggingOut } = sessionStore;
  const { displaySitewideMessage, sitewideMessage } = siteConfigurationStore;
  const { validateToken, isValidating } = sessionStore;
  const { t } = useTranslation();

  useEffect(() => {
    validateToken();
  }, []);

  if (isLoggingOut) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Box pos="relative" w="full">
        <Box pos="absolute" top={0} zIndex="toast" w="full">
          <FlashMessage />
        </Box>
      </Box>
      {displaySitewideMessage && (
        <Center h={16} bg={siteConfigurationStore.sitewideMessageColor || 'theme.yellowLight'}>
          {sitewideMessage}
        </Center>
      )}
      <NavBar />

      {isValidating ? (
        <LoadingScreen />
      ) : (
        <Suspense fallback={<LoadingScreen />}>
          <AppRoutes />

          <Footer />
        </Suspense>
      )}
    </BrowserRouter>
  );
});

const AppRoutes = observer(() => {
  const rootStore = useMst();
  const { sessionStore, userStore, uiStore } = rootStore;
  const { loggedIn, tokenExpired } = sessionStore;
  const location = useLocation();
  const background = location.state && location.state.background;
  const enableStepCodeRoute = location.state?.enableStepCodeRoute;

  const { currentUser } = userStore;
  const { afterLoginPath, setAfterLoginPath, resetAuth, entryPoint } = sessionStore;

  const navigate = useNavigate();
  const { t } = useTranslation();

  // Track page views on route changes (Snowplow)
  useEffect(() => {
    // Skip tracking for BC Services Card login route and external BC Gov login pages
    if (
      location.pathname.includes('/bcsc') ||
      window.location.href.includes('idtest.gov.bc.ca') ||
      window.location.href.includes('id.gov.bc.ca')
    ) {
      return;
    }

    trackPageViewEvent();
  }, [location.pathname]);

  useEffect(() => {
    if (tokenExpired) {
      resetAuth();
      setAfterLoginPath(location.pathname);
      console.log('entry point value:', entryPoint);
      if (entryPoint) {
        navigate('/admin');
      } else {
        navigate('/login');
      }
      uiStore.flashMessage.show(EFlashMessageStatus.warning, t('auth.tokenExpired'), null);
    }
  }, [tokenExpired]);

  useEffect(() => {
    if (loggedIn && afterLoginPath) {
      setAfterLoginPath(null);
      navigate(afterLoginPath);
    }
  }, [afterLoginPath, loggedIn]);

  const superAdminOnlyRoutes = (
    <>
      <Route path="/programs" element={<ProgramsIndexScreen />} />
      <Route path="/programs/new-program" element={<NewProgramScreen />} />
      <Route path="/programs/:programId/edit" element={<NewProgramScreen />} />
      <Route path="/programs/:programId/users" element={<ProgramUserIndexScreen />} />
      <Route path="/programs/:programId/invite" element={<ProgramInviteUserScreen />} />
      <Route path="/programs/:programId/api-settings" element={<ExternalApiKeysIndexScreen />}>
        <Route path="create" element={<ExternalApiKeyModalSubRoute />} />
        <Route path=":externalApiKeyId/manage" element={<ExternalApiKeyModalSubRoute />} />
      </Route>
      {/* <Route path="/jurisdictions/new" element={<NewJurisdictionScreen />} /> */}
      <Route path="/requirements-library" element={<RequirementsLibraryScreen />} />
      <Route path="/early-access/requirements-library" element={<EarlyAccessRequirementsLibraryScreen />} />
      <Route path="/requirement-templates" element={<RequirementTemplatesScreen />} />
      <Route path="/early-access/requirement-templates" element={<EarlyAccessRequirementTemplatesIndexScreen />} />
      <Route path="/early-access/requirement-templates/new" element={<NewEarlyAccessRequirementTemplateScreen />} />
      <Route
        path="/early-access/requirement-templates/:requirementTemplateId/edit"
        element={<EditEarlyAccessRequirementTemplateScreen />}
      />
      <Route path="/requirement-templates/new-template" element={<NewRequirementTemplateScreen />} />
      <Route path="/requirement-templates/:requirementTemplateId/edit" element={<EditRequirementTemplateScreen />} />
      <Route path="/template-versions/:templateVersionId" element={<TemplateVersionScreen />} />
      <Route path="/configuration-management" element={<SiteConfigurationManagementScreen />} />
      <Route path="/configuration-management/sitewide-banner" element={<SitewideMessageScreen />} />
      <Route path="/configuration-management/help-drawer-setup" element={<HelpDrawerSetupScreen />} />
      <Route path="/configuration-management/revision-reason-setup" element={<RevisionReasonSetupScreen />} />
      <Route path="/configuration-management/landing-setup" element={<LandingSetupScreen />} />
      <Route path="/configuration-management/users" element={<AdminUserIndexScreen />} />
      <Route path="/configuration-management/users/invite" element={<AdminInviteScreen />} />
      <Route path="/configuration-management/invite-employee" element={<InviteEmployeeScreen />} />
      <Route path="/audit-log" element={<AuditLogScreen />} />
      <Route path="/reporting" element={<ReportingScreen />} />
      <Route path="/reporting/export-template-summary" element={<ExportTemplateSummaryScreen />} />
      <Route path="/early-access" element={<EarlyAccessScreen />} />
    </>
  );

  const adminManagerRoutes = (
    <>
      <Route path="/configure-users" element={<ProgramsIndexScreen />} />
      <Route path="/configure-users/:programId/users" element={<ProgramUserIndexScreen />} />
      <Route path="/configure-users/:programId/invite" element={<ProgramInviteUserScreen />} />
      <Route path="/audit-log" element={<AuditLogScreen />} />
    </>
  );

  const adminManagerOrAdmin = (
    <>
      <Route path="/submission-inbox" element={<ProgramSubmissionInboxScreen />} />
      <Route path="/applications/:permitApplicationId" element={<ReviewPermitApplicationScreen />} />
      <Route path="/blank-template/:templateVersionId" element={<BlankTemplateScreen />} />
      <Route path="/contractor-management" element={<ContractorManagementScreen />} />
      <Route path="/contractor-management/:contractorId/employees" element={<ContractorEmployeeIndexScreen />} />
      <Route path="/contractor-management/:contractorId/invite-employee" element={<InviteEmployeeScreen />} />
      <Route path="/contractor-management/:contractorId/suspend/reason" element={<SuspendReasonPage />} />
      <Route
        path="/contractor-management/:contractorId/suspend/confirmation"
        element={<ContractorSuspendConfirmedScreen />}
      />
      <Route
        path="/contractor-management/:contractorId/unsuspend-confirmation"
        element={<ContractorUnsuspendConfirmedScreen />}
      />
      <Route path="/contractor-management/:contractorId/remove/removal-reason" element={<RemoveReasonPage />} />
      <Route
        path="/contractor-management/:contractorId/remove/removal-confirmation"
        element={<ContractorRemoveConfirmedScreen />}
      />
      <Route path="/contractor-program-resources" element={<ContractorProgramResourcesScreen />} />
      // view blank applications and view supported applications to go here
      {import.meta.env.DEV && (
        <>
          <Route
            path="/applications/:permitApplicationId/pdf-content"
            element={<PermitApplicationPDFViewer mode={'pdf'} />}
          />
          <Route
            path="/applications/:permitApplicationId/pdf-html"
            element={<PermitApplicationPDFViewer mode={'html'} />}
          />
          <Route
            path="/applications/:permitApplicationId/step-code-pdf-content"
            element={<StepCodeChecklistPDFViewer mode={'pdf'} />}
          />
          <Route
            path="/applications/:permitApplicationId/step-code-pdf-html"
            element={<StepCodeChecklistPDFViewer mode={'html'} />}
          />
        </>
      )}
    </>
  );

  const reviewManagerOnlyRoutes = (
    <>
      <Route
        path="/digital-building-permits/:templateVersionId/edit"
        element={<JurisdictionEditDigitalPermitScreen />}
      />
      <Route
        path="/jurisdictions/:jurisdictionId/configuration-management"
        element={<ConfigurationManagementScreen />}
      />
      <Route path="/digital-building-permits" element={<JurisdictionDigitalPermitScreen />} />
      <Route path="/api-settings/api-mappings" element={<JurisdictionApiMappingsSetupIndexScreen />} />
      <Route
        path="/jurisdictions/:jurisdictionId/api-settings/api-mappings/digital-building-permits/:templateVersionId/edit"
        element={<EditJurisdictionApiMappingScreen />}
      />
      <Route
        path="/api-settings/api-mappings/digital-building-permits/:templateVersionId/edit"
        element={<EditJurisdictionApiMappingScreen />}
      />
    </>
  );

  //const mustAcceptEula = loggedIn && !currentUser.eulaAccepted && !currentUser.isSuperAdmin;
  const mustAcceptEula = loggedIn && currentUser && !currentUser.eulaAccepted;
  return (
    <>
      <Routes location={background || location}>
        {mustAcceptEula && (
          // Onboarding step 1: EULA
          <Route path="/" element={<EULAScreen />} />
        )}
        {loggedIn && currentUser && currentUser.eulaAccepted && !currentUser.isReviewed && (
          // Onboarding step 2: confirm email
          <Route path="/" element={<ProfileScreen />} />
        )}
        {loggedIn ? (
          <Route path="/" element={<HomeScreen />} />
        ) : (
          <Route path="/" element={<RedirectScreen path="/welcome" />} />
        )}
        <Route
          element={<ProtectedRoute isAllowed={loggedIn && !mustAcceptEula} redirectPath={mustAcceptEula && '/'} />}
        >
          <Route path="/applications" element={<EnergySavingsApplicationIndexScreen />} />
          <Route path="/new-application" element={<NewApplicationScreen />} />
          <Route path="/new-invoice" element={<NewInvoiceScreen />} />
          <Route path="/blank-applications" element={<NewApplicationScreen />} />
          <Route path="/supported-applications" element={<EnergySavingsApplicationIndexScreen />} />
          <Route path="/contractor-dashboard" element={<ContractorDashboardScreen />} />
          <Route path="/applications/:permitApplicationId/edit" element={<EditPermitApplicationScreen />}>
            <Route path="step-code" element={<StepCodeForm />} />
          </Route>
          <Route path="/applications/:permitApplicationId/withdrawl-success" element={<SuccessfulWithdrawalScreen />} />
          <Route
            path="/applications/:permitApplicationId/ineligible-success"
            element={<SuccessfulIneligibleScreen />}
          />
          <Route
            path="/applications/:permitApplicationId/screened-in-success"
            element={<SuccessfulScreenedInScreen />}
          />
          <Route
            path="/applications/:permitApplicationId/approved-pending-success"
            element={<SuccessfulApprovedPendingScreen />}
          />
          <Route
            path="/applications/:permitApplicationId/approved-paid-success"
            element={<SuccessfulApprovedPaidScreen />}
          />
          <Route
            path="/applications/:permitApplicationId/successful-submission"
            element={<SuccessfulSubmissionScreen />}
          />
          <Route
            path="/applications/:permitApplicationId/successful-training-pending"
            element={<SuccessfulTrainingPendingScreen />}
          />
          <Route
            path="/applications/:permitApplicationId/onboarding-approved"
            element={<SuccessfulOnboardingApprovalScreen />}
          />
          <Route path="/applications/:permitApplicationId/successful-update" element={<SuccessfulUpdateScreeen />} />
        </Route>

        <Route element={<ProtectedRoute isAllowed={loggedIn} />}>
          <Route path="/profile" element={<ProfileScreen />} />
        </Route>

        <Route element={<ProtectedRoute isAllowed={loggedIn && !currentUser?.isSuperAdmin} />}>
          <Route path="/profile/eula" element={<EULAScreen withClose />} />
        </Route>

        <Route
          element={
            <ProtectedRoute
              isAllowed={
                loggedIn && !mustAcceptEula && currentUser && (currentUser.isAdminManager || currentUser.isSuperAdmin)
              }
              redirectPath={(mustAcceptEula && '/') || (loggedIn && '/not-found')}
            />
          }
        >
          {adminManagerRoutes}
        </Route>

        <Route
          element={
            <ProtectedRoute
              isAllowed={loggedIn && currentUser && currentUser.isSuperAdmin}
              redirectPath={loggedIn && '/not-found'}
            />
          }
        >
          {superAdminOnlyRoutes}
        </Route>

        <Route
          element={
            <ProtectedRoute
              isAllowed={
                loggedIn && !mustAcceptEula && currentUser && (currentUser.isAdminManager || currentUser.isAdmin)
              }
              redirectPath={(mustAcceptEula && '/') || (loggedIn && '/not-found')}
            />
          }
        >
          {adminManagerOrAdmin}
        </Route>

        <Route
          element={
            <ProtectedRoute
              isAllowed={
                loggedIn && !mustAcceptEula && currentUser && currentUser.isReviewStaff && !currentUser.isReviewer
              }
              redirectPath={(mustAcceptEula && '/') || (loggedIn && '/not-found')}
            />
          }
        >
          {reviewManagerOnlyRoutes}
        </Route>

        {/* TODO: we need to add security around some of the role logins */}
        <Route element={<ProtectedRoute isAllowed={!loggedIn} redirectPath="/" />}>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/contractor" element={<AdminPortalLogin isContractor />} />
          <Route path="/admin" element={<AdminPortalLogin isAdmin />} />
          {/* <Route path="/psr" element={<AdminPortalLogin isPSR />} /> */}
          <Route path="/admin-mgr" element={<AdminPortalLogin isAdminMgr />} />
          <Route path="/sys-admin" element={<AdminPortalLogin isSysAdmin />} />
        </Route>
        {/* Public Routes */}
        <Route path="/rejection-reason/:permitApplicationId" element={<RejectApplicationScreen />} />
        <Route path="/programs/:programId/accept-invitation" element={<AcceptInvitationScreen />} />
        {/* <Route path="/accept-invitation" element={<AcceptInvitationScreen />} /> */}

        <Route path="/contact" element={<ContactScreen />} />
        <Route path="/confirmed" element={<EmailConfirmedScreen />} />
        <Route path="/welcome" element={<LandingScreen />} />
        <Route path="/welcome/contractor" element={<ContractorLandingScreen />} />
        <Route path="/welcome/contractor/invite" element={<ContractorOnboardingImport />} />
        <Route path="/terms" element={<EULAScreen withClose />} />
        <Route path="/check-eligible" element={<EligibilityCheck />} />
        <Route path="/get-support" element={<SupportScreen />} />
        <Route
          path="/early-access/requirement-templates/:requirementTemplateId"
          element={<EarlyAccessRequirementTemplateScreen />}
        />
        <Route path="/jurisdictions/:jurisdictionId" element={<JurisdictionScreen />} />
        <Route path="/not-found" element={<NotFoundScreen />} />
        <Route path="*" element={<Navigate replace to="/not-found" />} />
      </Routes>
      {enableStepCodeRoute && (
        <Routes>
          <Route path="/applications/:permitApplicationId/edit/step-code" element={<StepCodeForm />} />
        </Routes>
      )}
    </>
  );
});
