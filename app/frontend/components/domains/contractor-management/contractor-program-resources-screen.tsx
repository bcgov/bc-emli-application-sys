import { Box, Container, Flex, Heading, Link, Text, VStack } from '@chakra-ui/react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BlueTitleBar } from '../../shared/base/blue-title-bar';
import { SubNavBar } from '../navigation/sub-nav-bar';

interface ProgramResource {
  id: string;
  title: string;
  size?: string;
  type?: string;
  url: string;
  description?: string;
}

type ResourceCategory = 'programGuidance' | 'qualifiedProductList' | 'sampleInvoices' | 'resourcesForCustomers';

const PROGRAM_RESOURCES: Record<ResourceCategory, ProgramResource[]> = {
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
      id: 'contractor-terms-conditions',
      title: 'contractor.programResources.resources.contractorTermsConditions',
      size: '257 KB',
      type: 'PDF',
      url: 'https://www.betterhomesbc.ca/app/uploads/sites/956/2025/08/Contractor_TsCs_ESP_July152025.pdf',
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
      url: 'https://www.betterhomesbc.ca/app/uploads/sites/956/2025/06/Air-to-Water-Eligibility-List-V10.pdf',
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
      size: '233 KB',
      type: 'PDF',
      url: 'https://www.betterhomesbc.ca/app/uploads/sites/956/2024/08/SampleInvoice_ESP_HeatPump.pdf',
    },
    {
      id: 'heat-pump-water-heater',
      title: 'contractor.programResources.resources.heatPumpWaterHeater',
      size: '1 MB',
      type: 'PDF',
      url: 'https://www.betterhomesbc.ca/app/uploads/sites/956/2021/11/CleanBC-IQP_SampleInvoices_HPWaterheater-Nov2021.pdf',
    },
    {
      id: 'windows-and-doors',
      title: 'contractor.programResources.resources.windowsAndDoors',
      size: '207 KB',
      type: 'PDF',
      url: 'https://www.betterhomesbc.ca/app/uploads/sites/956/2024/08/SampleInvoice_ESP_WindowDoors.pdf',
    },
    {
      id: 'insulation',
      title: 'contractor.programResources.resources.insulation',
      size: '268 KB',
      type: 'PDF',
      url: 'https://www.betterhomesbc.ca/app/uploads/sites/956/2025/06/SampleInvoice_ESP_NEWInsulation_062725.pdf',
    },
    {
      id: 'electric-service-upgrade',
      title: 'contractor.programResources.resources.electricServiceUpgrade',
      size: '201 KB',
      type: 'PDF',
      url: 'https://www.betterhomesbc.ca/app/uploads/sites/956/2024/08/SampleInvoice_ESP_ESU.pdf',
    },
    {
      id: 'ventilation',
      title: 'contractor.programResources.resources.ventilation',
      size: '198 KB',
      type: 'PDF',
      url: 'https://www.betterhomesbc.ca/app/uploads/sites/956/2024/08/SampleInvoice_ESP_Ventilation.pdf',
    },
    {
      id: 'health-and-safety',
      title: 'contractor.programResources.resources.healthAndSafety',
      size: '200 KB',
      type: 'PDF',
      url: 'https://www.betterhomesbc.ca/app/uploads/sites/956/2024/08/SampleInvoice_ESP_HealthSafety.pdf',
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
      id: 'rebate-eligibility-requirements',
      title: 'contractor.programResources.resources.rebateEligibilityRequirements',
      size: '604 KB',
      type: 'PDF',
      url: 'https://www.betterhomesbc.ca/app/uploads/sites/956/2025/07/RebateEligibilityRequirements_ESP_15July2025.pdf',
    },
    {
      id: 'participant-terms-and-conditions',
      title: 'contractor.programResources.resources.participantTermsAndConditions',
      size: '216 KB',
      type: 'PDF',
      url: 'https://esp.clearesult.ca/contractor/sites/default/files/2024-10/Contractor_TsCs_ESP_4September2024.pdf',
    },
  ],
};

const SIDEBAR_CATEGORIES: { key: ResourceCategory; label: string }[] = [
  { key: 'programGuidance', label: 'contractor.programResources.programGuidance' },
  { key: 'qualifiedProductList', label: 'contractor.programResources.qualifiedProductList' },
  { key: 'sampleInvoices', label: 'contractor.programResources.sampleInvoices' },
  { key: 'resourcesForCustomers', label: 'contractor.programResources.resourcesForCustomers' },
];

interface ContractorProgramResourcesScreenProps {
  hideBlueSection?: boolean;
}

export const ContractorProgramResourcesScreen = ({
  hideBlueSection = false,
}: ContractorProgramResourcesScreenProps) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory>('programGuidance');

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
          {t('contractor.programResources.programResourcesPrefix')}{' '}
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
            role="navigation"
            aria-label="Resource categories"
            id="main-content"
            tabIndex={-1}
            bg="greys.white"
          >
            <VStack align="stretch" spacing={0} role="tablist">
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

          {/* Right Content Area - Resource List */}
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
            {PROGRAM_RESOURCES[selectedCategory].length > 0 ? (
              PROGRAM_RESOURCES[selectedCategory].map((resource) => (
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
                  {resource.description && (
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
                  )}
                </Box>
              ))
            ) : (
              <Text sx={baseTextSx} color="greys.grey60" fontStyle="italic">
                {t('contractor.programResources.noResources')}
              </Text>
            )}
          </VStack>
        </Flex>
      </Container>
    </Flex>
  );
};
