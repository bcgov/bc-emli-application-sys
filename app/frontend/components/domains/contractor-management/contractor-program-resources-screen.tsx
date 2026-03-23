import { Box, Button, Container, Flex, Heading, Input, Link, Text, VStack } from '@chakra-ui/react';
import { CheckCircle } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMst } from '../../../setup/root';
import CustomAlert from '../../shared/base/custom-alert';
import { BlueTitleBar } from '../../shared/base/blue-title-bar';
import { SubNavBar } from '../navigation/sub-nav-bar';
import { EDescriptionPartType } from '../../../types/enums';
import { DescriptionPart } from '../../../types/types';
interface ProgramResource {
  id: string;
  title: string;
  size?: string;
  type?: string;
  url: string;
  description?: string;
  descriptionPart?: string;
}

type ResourceCategory =
  | 'checkEligibilityCode'
  | 'addEmployees'
  | 'programGuidance'
  | 'qualifiedProductList'
  | 'sampleInvoices'
  | 'resourcesForCustomers';
type ResourceListCategory = Exclude<ResourceCategory, 'checkEligibilityCode'>;

const PROGRAM_RESOURCES: Record<ResourceListCategory, ProgramResource[]> = {
  addEmployees: [
    {
      id: 'step-1-create-employees-accounts',
      title: 'contractor.programResources.resources.createEmployeesAccounts',
      description: 'contractor.programResources.descriptions.createEmployeesAccounts',
      url: 'https://www.bceid.ca/',
    },
    {
      id: 'step-2-form-to-add-employees',
      title: 'contractor.programResources.resources.formToAddEmployees',
      url: 'https://submit.digital.gov.bc.ca/app/form/submit?f=eaa33ef3-f969-4987-9186-993f5385c6de',
      descriptionPart: 'contractor.programResources.descriptionPart.formToAddEmployees',
    },
  ],
  programGuidance: [
    {
      id: 'contractor-rebate-journey',
      title: 'contractor.programResources.resources.contractorRebateJourney',
      size: '173 KB',
      type: 'PDF',
      url: 'https://esp.clearesult.ca/contractor/sites/default/files/2025-01/ESP%20Contractor%20Journey.pdf',
    },
    {
      id: 'heat-pump-exception-form',
      title: 'contractor.programResources.resources.heatPumpExceptionForm',
      size: '429 KB',
      type: 'PDF',
      url: 'https://esp.clearesult.ca/contractor/sites/default/files/2024-10/CleanBC%20ESP%20Heat%20Pump%20Exception%20Form.pdf',
    },
    {
      id: 'heat-pump-requirements',
      title: 'contractor.programResources.resources.heatPumpRequirements',
      size: '129 KB',
      type: 'PDF',
      url: 'https://esp.clearesult.ca/contractor/sites/default/files/2024-10/Heat%20Pump%20Requirements%20Guide.pdf',
    },
    {
      id: 'rebate-eligibility',
      title: 'contractor.programResources.resources.rebateEligibility',
      size: '604 KB',
      type: 'PDF',
      url: 'https://www.betterhomesbc.ca/app/uploads/sites/956/2025/07/RebateEligibilityRequirements_ESP_15July2025.pdf',
    },
    {
      id: 'insulation-cut-sheet',
      title: 'contractor.programResources.resources.insulationCutSheet',
      size: '181 KB',
      type: 'PDF',
      url: 'https://esp.clearesult.ca/contractor/sites/default/files/2024-10/CleanBC%20Energy%20Savings%20Program%20Insulation_Final0925.pdf',
    },
    {
      id: 'windows-doors-cut-sheet',
      title: 'contractor.programResources.resources.windowsDoorsCutSheet',
      size: '443 KB',
      type: 'PDF',
      url: 'https://esp.clearesult.ca/contractor/sites/default/files/2024-10/CleanBC%20Energy%20Savings%20Program%20Windows%20and%20Doors_Final0925.pdf',
    },
    {
      id: 'contractor-terms-conditions-ground-oriented',
      title: 'contractor.programResources.resources.contractorTermsConditionsgroundOriented',
      size: '250 KB',
      type: 'PDF',
      url: 'https://betterhomesbc.ca/wp-content/uploads/2026/02/ESP_Contractor_TsCs_10November2025.pdf',
    },
    {
      id: 'contractor-terms-conditions-condo-apartament',
      title: 'contractor.programResources.resources.contractorTermsConditionsCondoApartment',
      size: '248 KB',
      type: 'PDF',
      url: 'https://betterhomesbc.ca/wp-content/uploads/2026/02/CondoApartment_Contractor_TsCs_July152025.pdf',
    },
    {
      id: 'rebate-eligibility-ground-oriented',
      title: 'contractor.programResources.resources.rebateElibilityGroundOriented',
      size: '650 KB',
      type: 'PDF',
      url: 'https://betterhomesbc.ca/wp-content/uploads/2026/03/RebateEligibilityRequirements_ESP_10Nov2025V2.pdf',
    },
    {
      id: 'rebate-eligibility-condo-apartment',
      title: 'contractor.programResources.resources.rebateElibilityCondoApartment',
      size: '380 KB',
      type: 'PDF',
      url: 'https://betterhomesbc.ca/wp-content/uploads/2026/03/CondoApartment_RebateEligibilityRequirements_July152025V2.pdf',
    },
  ],
  qualifiedProductList: [
    {
      id: 'mini-split-heat-pumps',
      title: 'contractor.programResources.resources.miniSplitHeatPumps',
      description: 'contractor.programResources.descriptions.miniSplitHeatPumps',
      url: 'https://app.bchydro.com/hero/HeatPumpLookup',
    },
    {
      id: 'air-to-water-heat-pumps',
      title: 'contractor.programResources.resources.airToWaterHeatPumps',
      description: 'contractor.programResources.descriptions.airToWaterHeatPumps',
      url: 'https://www.betterhomesbc.ca/qualified-product-list-air-to-water-heat-pumps-PDF',
    },
    {
      id: 'heat-pump-water-heater-list',
      title: 'contractor.programResources.resources.heatPumpWaterHeaterList',
      description: 'contractor.programResources.descriptions.heatPumpWaterHeaterList',
      url: 'https://neea.org/wp-content/uploads/2025/03/residential-HPWH-qualified-products-list.pdf',
    },
    {
      id: 'windows-and-doors-list',
      title: 'contractor.programResources.resources.windowsAndDoorsList',
      description: 'contractor.programResources.descriptions.windowsAndDoorsList',
      url: '#',
    },
    {
      id: 'ventilation-list',
      title: 'contractor.programResources.resources.ventilationList',
      description: 'contractor.programResources.descriptions.ventilationList',
      url: 'https://oee.nrcan.gc.ca/pml-lmp/index.cfm?action=app.search-recherche&appliance=HERV?',
    },
    {
      id: 'bathroom-fan-product-list',
      title: 'contractor.programResources.resources.bathroomFanProductList',
      description: 'contractor.programResources.descriptions.bathroomFanProductList',
      url: 'https://www.energystar.gov/productfinder/product/certified-ventilating-fans/results',
    },
  ],
  sampleInvoices: [
    {
      id: 'heat-pump',
      title: 'contractor.programResources.resources.heatPump',
      size: '281 KB',
      type: 'PDF',
      url: 'https://betterhomesbc.ca/wp-content/uploads/2026/02/SampleInvoice_ESP_HeatPump_20251124.pdf',
    },
    {
      id: 'heat-pump-condo-apartament',
      title: 'contractor.programResources.resources.heatPumpCondoApartment',
      size: '270 MB',
      type: 'PDF',
      url: 'https://betterhomesbc.ca/wp-content/uploads/2026/02/CondoApartment_SampleInvoiceHeatpump_July152025.pdf',
    },
    {
      id: 'heat-pump-water-condo-apartament',
      title: 'contractor.programResources.resources.heatPumpWaterCondoApartment',
      size: '258 MB',
      type: 'PDF',
      url: 'https://betterhomesbc.ca/wp-content/uploads/2026/02/CondoApartment_SampleInvoiceHPWaterheater_July152025.pdf',
    },
    {
      id: 'heat-pump-water-heater',
      title: 'contractor.programResources.resources.heatPumpWaterHeater',
      size: '1027 KB',
      type: 'PDF',
      url: 'https://betterhomesbc.ca/wp-content/uploads/2026/02/ESP_Sample_Invoice_HPWaterheater.pdf',
    },
    {
      id: 'windows-and-doors',
      title: 'contractor.programResources.resources.windowsAndDoors',
      size: '292 KB',
      type: 'PDF',
      url: 'https://betterhomesbc.ca/wp-content/uploads/2026/02/SampleInvoice_ESP_WindowDoors_20251124.pdf',
    },
    {
      id: 'insulation',
      title: 'contractor.programResources.resources.insulation',
      size: '273 KB',
      type: 'PDF',
      url: 'https://betterhomesbc.ca/wp-content/uploads/2026/02/SampleInvoice_ESP_Insulation_20251124.pdf',
    },
    {
      id: 'electric-service-upgrade',
      title: 'contractor.programResources.resources.electricServiceUpgrade',
      size: '276 KB',
      type: 'PDF',
      url: 'https://betterhomesbc.ca/wp-content/uploads/2026/02/SampleInvoice_ESP_ESU_20251124.pdf',
    },
    {
      id: 'ventilation',
      title: 'contractor.programResources.resources.ventilation',
      size: '269 KB',
      type: 'PDF',
      url: 'https://betterhomesbc.ca/wp-content/uploads/2026/02/SampleInvoice_ESP_Ventilation_20251124.pdf',
    },
    {
      id: 'health-and-safety',
      title: 'contractor.programResources.resources.healthAndSafety',
      size: '253 KB',
      type: 'PDF',
      url: 'https://betterhomesbc.ca/wp-content/uploads/2026/02/SampleInvoice_ESP_HealthSafety_20251124.pdf',
    },
  ],
  resourcesForCustomers: [
    {
      id: 'participant-info-sheet',
      title: 'contractor.programResources.resources.participantInfoSheet',
      size: '380 KB',
      type: 'PDF',
      url: 'https://esp.clearesult.ca/contractor/sites/default/files/2024-10/CleanBC%20Better%20Homes%20Energy%20Savings%20Program%20Brochure_Final0925.pdf',
    },
    {
      id: 'rebate-eligibility-ground-oriented',
      title: 'contractor.programResources.resources.rebateElibilityGroundOriented',
      url: 'https://betterhomesbc.ca/learn-about-programs/energy-savings-program/energy-savings-program-requirements/',
    },
    {
      id: 'rebate-eligibility-condo-apartment',
      title: 'contractor.programResources.resources.rebateElibilityCondoApartment',
      url: 'https://betterhomesbc.ca/learn-about-programs/energy-savings-program/energy-savings-program-condo-and-apartment-rebate-requirements/',
    },
    {
      id: 'participant-terms-conditions-ground-oriented',
      title: 'contractor.programResources.resources.participantTermsConditionsgroundOriented',
      size: '173 KB',
      type: 'PDF',
      url: 'https://betterhomesbc.ca/wp-content/uploads/2026/02/ESP_Participant_TsCs_10November2025.pdf',
    },
    {
      id: 'participant-terms-conditions-condo-apartament',
      title: 'contractor.programResources.resources.participantTermsConditionsCondoApartment',
      size: '172 KB',
      type: 'PDF',
      url: 'https://betterhomesbc.ca/wp-content/uploads/2026/02/CondoApartment_Participant_TsCs_July152025.pdf',
    },
  ],
};

const ELIGIBILITY_CODE_REGEX = /^ESP\d-[A-Za-z0-9]+$/;

const formatExpiryDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getUTCDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-CA', { month: 'short', timeZone: 'UTC' });
  const year = date.getUTCFullYear();
  return `${day}. ${month}, ${year}`;
};

const SIDEBAR_CATEGORIES: { key: ResourceCategory; label: string }[] = [
  { key: 'checkEligibilityCode', label: 'contractor.programResources.checkEligibilityCode' },
  { key: 'addEmployees', label: 'contractor.programResources.addEmployees' },
  { key: 'programGuidance', label: 'contractor.programResources.programGuidance' },
  { key: 'qualifiedProductList', label: 'contractor.programResources.qualifiedProductList' },
  { key: 'sampleInvoices', label: 'contractor.programResources.sampleInvoices' },
  { key: 'resourcesForCustomers', label: 'contractor.programResources.resourcesForCustomers' },
];

interface ContractorProgramResourcesScreenProps {
  hideBlueSection?: boolean;
}

export const ContractorProgramResourcesScreen = observer(function ContractorProgramResourcesScreen({
  hideBlueSection = false,
}: ContractorProgramResourcesScreenProps) {
  const { t } = useTranslation();
  const { environment } = useMst();
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory>('addEmployees');
  const [eligibilityCode, setEligibilityCode] = useState('');
  const [checkResult, setCheckResult] = useState<{
    valid: boolean;
    expiryDate?: string;
    invalidFormat?: boolean;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState(false);

  const handleCheckEligibility = async () => {
    const code = eligibilityCode.trim();
    if (!ELIGIBILITY_CODE_REGEX.test(code)) {
      setCheckResult({ valid: false, invalidFormat: true });
      return;
    }
    setChecking(true);
    setCheckResult(null);
    setCheckError(false);
    const response = await environment.api.checkEligibilityCode(code);
    setChecking(false);
    if (response.ok) {
      setCheckResult(response.data);
    } else {
      setCheckError(true);
    }
  };

  const baseTextSx = { fontSize: '16px', lineHeight: '27px', color: 'text.primary' };

  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const getResourceAriaLabel = (resource: ProgramResource) => {
    const title = t(resource.title);
    const type = resource.type === 'type' ? 'PDF' : resource.type || 'document';
    const size = resource.size === 'size' ? '' : resource.size || '';
    return `Download ${title} ${type}${size ? ` (${size})` : ''}`;
  };

  const returnDescriptionParts = (translationName) => {
    debugger;
    const descriptionParts = t(translationName, {
      returnObjects: true,
    }) as Array<DescriptionPart>;
    return (
      <Text sx={baseTextSx} color="greys.grey60" mt={2}>
        {descriptionParts.map((part, index) =>
          part.type === EDescriptionPartType.Link ? (
            <Link
              key={index}
              href={part.content?.href}
              isExternal={part.content?.isExternal ?? true}
              fontSize="md"
              fontWeight="normal"
            >
              {part.content?.text}
            </Link>
          ) : (
            <Text as="span" key={index} {...(part.type === EDescriptionPartType.Bold && { fontWeight: 'bold' })}>
              {part.content}
            </Text>
          ),
        )}
      </Text>
    );
  };

  return (
    <Flex
      as="main"
      direction="column"
      w="full"
      bg={hideBlueSection ? 'white' : 'greys.grey04'}
      pb={hideBlueSection ? 0 : '16'}
    >
      {/* Blue Header Bar */}
      {!hideBlueSection && <BlueTitleBar title={t('contractor.programResources.title')} />}

      {/* Main Content */}
      <Container
        maxW={hideBlueSection ? 'full' : 'container.lg'}
        py={hideBlueSection ? 0 : 16}
        bg="white"
        px={hideBlueSection ? 0 : 10}
      >
        <Heading as="h1" fontSize="5xl" fontWeight="700" color="greys.grey60" mb={4} mt={hideBlueSection ? 10 : 0}>
          {selectedCategory !== 'checkEligibilityCode' && `${t('contractor.programResources.programResourcesPrefix')} `}
          {t(SIDEBAR_CATEGORIES.find((cat) => cat.key === selectedCategory)?.label || '')}
        </Heading>
        {selectedCategory === 'qualifiedProductList' && (
          <Text fontSize="md" color="greys.grey60" mb={12} lineHeight="tall">
            {t('contractor.programResources.qualifiedProductListSubheading')} 
          </Text>
        )}
        {selectedCategory !== 'qualifiedProductList' && <Box mb={12} />}
        <Flex direction={{ base: 'column', lg: 'row' }} gap={8} align="flex-start">
          {/* Left Sidebar - Category Navigation */}
          <Box
            as="aside"
            w={{ base: '100%', lg: '280px' }}
            flexShrink={0}
            overflow="visible"
            role="navigation"
            aria-label="Resource categories"
            id="main-content"
            tabIndex={-1}
            bg="greys.white"
          >
            <VStack align="stretch" spacing={0} role="tablist" overflow="visible">
              {SIDEBAR_CATEGORIES.map((category) => (
                <Box
                  key={category.key}
                  as="button"
                  onClick={() => setSelectedCategory(category.key)}
                  onKeyDown={(e: React.KeyboardEvent) => handleKeyDown(e, () => setSelectedCategory(category.key))}
                  bg={selectedCategory === category.key ? 'theme.blueLight02' : 'greys.white'}
                  color={selectedCategory === category.key ? 'theme.blueAlt' : 'text.primary'}
                  px={6}
                  py={4}
                  textAlign="left"
                  fontSize="16px"
                  fontWeight={selectedCategory === category.key ? '600' : '400'}
                  border="none"
                  borderLeft="4px solid"
                  borderLeftColor={selectedCategory === category.key ? 'theme.blueAlt' : 'transparent'}
                  transition="all 0.2s"
                  sx={{
                    '&:focus:not(:focus-visible)': {
                      outline: 'none',
                    },
                  }}
                  _hover={{
                    bg: 'theme.blueLight02',
                  }}
                  _focusVisible={{
                    outline: '3px solid',
                    outlineColor: 'theme.blue',
                    outlineOffset: '2px',
                    zIndex: 1,
                    position: 'relative',
                  }}
                  _first={{
                    borderTop: 'none',
                  }}
                  cursor="pointer"
                  role="tab"
                  aria-selected={selectedCategory === category.key}
                  aria-controls="resource-panel"
                  tabIndex={0}
                  id={`tab-${category.key}`}
                >
                  {t(category.label)}
                </Box>
              ))}
            </VStack>
          </Box>

          {/* Right Content Area */}
          {selectedCategory === 'checkEligibilityCode' ? (
            <VStack
              flex={1}
              align="flex-start"
              spacing={4}
              id="resource-panel"
              role="tabpanel"
              aria-labelledby="tab-checkEligibilityCode"
              tabIndex={-1}
            >
              <Text sx={baseTextSx}>{t('contractor.programResources.checkEligibilityCode_description')}</Text>
              <Flex gap={2} align="center" w="full">
                <Input
                  aria-label={t('contractor.programResources.checkEligibilityCode')}
                  placeholder={t('contractor.programResources.checkEligibilityCode_inputPlaceholder')}
                  value={eligibilityCode}
                  onChange={(e) => {
                    setEligibilityCode(e.target.value);
                    setCheckResult(null);
                    setCheckError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && eligibilityCode.trim()) handleCheckEligibility();
                  }}
                  maxW="400px"
                  borderColor="border.input"
                />
                <Button
                  onClick={handleCheckEligibility}
                  isDisabled={!eligibilityCode.trim() || checking}
                  isLoading={checking}
                  variant="primary"
                >
                  {t('contractor.programResources.checkEligibilityCode_search')}
                </Button>
              </Flex>
              {checkResult?.valid &&
                (() => {
                  const today = new Date();
                  const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
                  const isExpired = !!checkResult.expiryDate && new Date(checkResult.expiryDate) < todayUTC;

                  if (isExpired) {
                    return (
                      <CustomAlert
                        description={t('contractor.programResources.checkEligibilityCode_validExpired', {
                          date: formatExpiryDate(checkResult.expiryDate),
                        })}
                      />
                    );
                  }

                  return (
                    <CustomAlert
                      description={
                        !checkResult.expiryDate
                          ? t('contractor.programResources.checkEligibilityCode_validNoExpiry')
                          : t('contractor.programResources.checkEligibilityCode_validWithExpiry', {
                              date: formatExpiryDate(checkResult.expiryDate),
                            })
                      }
                      icon={<CheckCircle size={27} />}
                      borderColor="success"
                      backgroundColor="semantic.successLight"
                      iconColor="green"
                    />
                  );
                })()}
              {checkResult && !checkResult.valid && (
                <CustomAlert
                  description={t(
                    checkResult.invalidFormat
                      ? 'contractor.programResources.checkEligibilityCode_invalidFormat'
                      : 'contractor.programResources.checkEligibilityCode_invalid',
                  )}
                />
              )}
              {checkError && <CustomAlert description={t('contractor.programResources.checkEligibilityCode_error')} />}
            </VStack>
          ) : (
            <VStack
              flex={1}
              align="flex-start"
              spacing={3}
              id="resource-panel"
              role="tabpanel"
              aria-labelledby={`tab-${selectedCategory}`}
              border={selectedCategory === 'qualifiedProductList' ? 'none' : '1px solid'}
              borderColor={selectedCategory === 'qualifiedProductList' ? 'transparent' : '#D8D8D8'}
              borderRadius={selectedCategory === 'qualifiedProductList' ? '0' : '8px'}
              bg={selectedCategory === 'qualifiedProductList' ? 'transparent' : 'greys.white'}
              p={selectedCategory === 'qualifiedProductList' ? 0 : 6}
              tabIndex={-1}
            >
              {PROGRAM_RESOURCES[selectedCategory as ResourceListCategory].length > 0 ? (
                PROGRAM_RESOURCES[selectedCategory as ResourceListCategory].map((resource) => (
                  <Box
                    key={resource.id}
                    w="full"
                    mb={resource.description ? 4 : 0}
                    p={selectedCategory === 'qualifiedProductList' ? 8 : 0}
                    pb={selectedCategory === 'qualifiedProductList' ? 16 : undefined}
                    border={selectedCategory === 'qualifiedProductList' ? '1px solid' : 'none'}
                    borderColor={selectedCategory === 'qualifiedProductList' ? '#D8D8D8' : 'transparent'}
                    borderRadius={selectedCategory === 'qualifiedProductList' ? '4px' : '0'}
                    bg={selectedCategory === 'qualifiedProductList' ? 'greys.white' : 'transparent'}
                  >
                    {resource.url === '#' ? (
                      <Text
                        fontWeight="bold"
                        sx={{
                          ...baseTextSx,
                          fontSize: 'xl',
                          color: 'text.link',
                        }}
                      >
                        {t(resource.title)}
                        {resource.size && resource.type && (
                          <Text as="span" color="greys.grey60" fontWeight="bold" ml={1} aria-hidden="true">
                            [{resource.size}, {resource.type}]
                          </Text>
                        )}
                      </Text>
                    ) : (
                      <Link
                        href={resource.url}
                        textDecoration="underline"
                        fontWeight="bold"
                        _hover={{ color: 'theme.blue' }}
                        _focusVisible={{
                          outline: '3px solid',
                          outlineColor: 'theme.blue',
                          outlineOffset: '2px',
                          color: 'theme.blue',
                        }}
                        sx={{
                          ...baseTextSx,
                          fontSize: 'xl',
                          color: 'text.link',
                          '&:focus:not(:focus-visible)': {
                            outline: 'none',
                          },
                        }}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={getResourceAriaLabel(resource)}
                      >
                        {t(resource.title)}
                        {resource.size && resource.type && (
                          <Text as="span" color="greys.grey60" fontWeight="bold" ml={1} aria-hidden="true">
                            [{resource.size}, {resource.type}]
                          </Text>
                        )}
                      </Link>
                    )}
                    {resource.description ? (
                      <Text sx={baseTextSx} color="greys.grey60" mt={2}>
                        {resource.id === 'mini-split-heat-pumps' ? (
                          <>
                            {
                              t('contractor.programResources.descriptions.miniSplitHeatPumps').split(
                                t('contractor.programResources.linkText.qualifyingProductList'),
                              )[0]
                            }
                            <Link
                              href={resource.url}
                              color="theme.blueAlt"
                              textDecoration="underline"
                              _hover={{ color: 'theme.blue' }}
                              _focusVisible={{
                                outline: '3px solid',
                                outlineColor: 'theme.blue',
                                outlineOffset: '2px',
                              }}
                              sx={{
                                '&:focus:not(:focus-visible)': {
                                  outline: 'none',
                                },
                              }}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open Qualifying Product List in new tab"
                            >
                              {t('contractor.programResources.linkText.qualifyingProductList')}
                            </Link>
                          </>
                        ) : resource.id === 'air-to-water-heat-pumps' ? (
                          <>
                            {
                              t('contractor.programResources.descriptions.airToWaterHeatPumps').split(
                                t('contractor.programResources.linkText.productList'),
                              )[0]
                            }
                            <Link
                              href={resource.url}
                              color="theme.blueAlt"
                              textDecoration="underline"
                              _hover={{ color: 'theme.blue' }}
                              _focusVisible={{
                                outline: '3px solid',
                                outlineColor: 'theme.blue',
                                outlineOffset: '2px',
                              }}
                              sx={{
                                '&:focus:not(:focus-visible)': {
                                  outline: 'none',
                                },
                              }}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open product list PDF in new tab"
                            >
                              {t('contractor.programResources.linkText.productList')}
                            </Link>
                            {t('contractor.programResources.fileInfoAirToWater')}
                          </>
                        ) : resource.id === 'heat-pump-water-heater-list' ? (
                          <>
                            {
                              t('contractor.programResources.descriptions.heatPumpWaterHeaterList').split(
                                t('contractor.programResources.linkText.eligibleModelsList'),
                              )[0]
                            }
                            <Link
                              href={resource.url}
                              color="theme.blueAlt"
                              textDecoration="underline"
                              _hover={{ color: 'theme.blue' }}
                              _focusVisible={{
                                outline: '3px solid',
                                outlineColor: 'theme.blue',
                                outlineOffset: '2px',
                              }}
                              sx={{
                                '&:focus:not(:focus-visible)': {
                                  outline: 'none',
                                },
                              }}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open Eligible Models List PDF in new tab"
                            >
                              {t('contractor.programResources.linkText.eligibleModelsList')}
                            </Link>
                            {t('contractor.programResources.fileInfoHPWH')}
                          </>
                        ) : resource.id === 'ventilation-list' ? (
                          <>
                            {
                              t('contractor.programResources.descriptions.ventilationList').split(
                                t('contractor.programResources.linkText.productList'),
                              )[0]
                            }
                            <Link
                              href={resource.url}
                              color="theme.blueAlt"
                              textDecoration="underline"
                              _hover={{ color: 'theme.blue' }}
                              _focusVisible={{
                                outline: '3px solid',
                                outlineColor: 'theme.blue',
                                outlineOffset: '2px',
                              }}
                              sx={{
                                '&:focus:not(:focus-visible)': {
                                  outline: 'none',
                                },
                              }}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open Natural Resources Canada product list in new tab"
                            >
                              {t('contractor.programResources.linkText.productList')}
                            </Link>
                            {
                              t('contractor.programResources.descriptions.ventilationList').split(
                                t('contractor.programResources.linkText.productList'),
                              )[1]
                            }
                          </>
                        ) : resource.id === 'bathroom-fan-product-list' ? (
                          <>
                            {
                              t('contractor.programResources.descriptions.bathroomFanProductList').split(
                                t('contractor.programResources.linkText.productList'),
                              )[0]
                            }
                            <Link
                              href={resource.url}
                              color="theme.blueAlt"
                              textDecoration="underline"
                              _hover={{ color: 'theme.blue' }}
                              _focusVisible={{
                                outline: '3px solid',
                                outlineColor: 'theme.blue',
                                outlineOffset: '2px',
                              }}
                              sx={{
                                '&:focus:not(:focus-visible)': {
                                  outline: 'none',
                                },
                              }}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open EPA and DOE product list in new tab"
                            >
                              {t('contractor.programResources.linkText.productList')}
                            </Link>
                            {
                              t('contractor.programResources.descriptions.bathroomFanProductList').split(
                                t('contractor.programResources.linkText.productList'),
                              )[1]
                            }
                          </>
                        ) : (
                          t(resource.description)
                        )}
                      </Text>
                    ) : (
                      resource.descriptionPart && returnDescriptionParts(resource.descriptionPart)
                    )}
                  </Box>
                ))
              ) : (
                <Text sx={baseTextSx} color="greys.grey60" fontStyle="italic">
                  {t('contractor.programResources.noResources')}
                </Text>
              )}
            </VStack>
          )}
        </Flex>
      </Container>
    </Flex>
  );
});
