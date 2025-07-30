import { Box, Container, Flex, FormControl, Heading, Image, Text, VStack, VisuallyHidden } from '@chakra-ui/react';
import { Warning } from '@phosphor-icons/react/dist/ssr';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CustomAlert from '../../shared/base/custom-alert';
import QuestionCard from '../../shared/base/question-card';
import SuccessAlert from '../../shared/base/success-alert';
import { SubNavBar } from '../navigation/sub-nav-bar';

export const EligibilityCheck = observer(() => {
  const { t } = useTranslation();
  const eligibleHomes: string[] = t('auth.checkEligibility.kindOfHomes', { returnObjects: true });
  const eligibleHomeTypes: string[] = t('auth.checkEligibility.alert.typesOfhome', { returnObjects: true });
  const assesedValues: string[] = t('auth.checkEligibility.assesedValues', { returnObjects: true });
  const assesedValuesMultiUnit: string[] = t('auth.checkEligibility.assesedValuesMultiUnit', { returnObjects: true });
  const paymentValues: string[] = t('auth.checkEligibility.paymentOption', { returnObjects: true });

  // Option values for consistent comparisons
  const optionValues = t('auth.checkEligibility.optionValues', { returnObjects: true }) as {
    homeTypeOther: string;
    propertyValueHighSingle: string;
    propertyValueHighMulti: string;
    propertyValueUnsure: string;
    paymentYes: string;
    paymentNo: string;
    paymentUnsure: string;
  };

  const annualHouseholdOptions = t('auth.checkEligibility.annualHouseholdValues', { returnObjects: true });
  const [selectedHouseholdValues, setSelectedHouseholdValues] = useState<string[] | null>(null);

  const breadCrumb = [
    {
      href: '/check-eligible',
      title: t('auth.checkEligibility.seeEligible'),
    },
  ];

  const [isEligible, setIsEligible] = useState<null | boolean>(null);
  const [currentAssessedValues, setCurrentAssessedValues] = useState<string[]>(assesedValues);
  const [formData, setFormData] = useState({
    homeType: '',
    assessedValue: '',
    paysBills: '',
    totalPeople: '',
    annualHouseHold: '',
  });

  // Constants
  const MULTI_UNIT_START_INDEX = 5;
  const MULTI_UNIT_END_INDEX = 7;

  // Determine if home type is multi-unit (Group B: indices 5-7)
  const isMultiUnitHome = useCallback(
    (homeType: string) => {
      const homeTypeIndex = eligibleHomes.indexOf(homeType);
      return homeTypeIndex >= MULTI_UNIT_START_INDEX && homeTypeIndex <= MULTI_UNIT_END_INDEX;
    },
    [eligibleHomes],
  );

  // Helper function to render alerts consistently
  const renderAlert = (title: string, description: string, isWarning = false) => (
    <Box mt={4} role="alert" aria-live="polite">
      <Text fontSize="lg" fontWeight="bold">
        <CustomAlert
          title={title}
          description={description}
          linkText={t('auth.checkEligibility.alert.seeDetails')}
          linkHref={t('landing.iNeedLink')}
          {...(isWarning && {
            icon: <Warning />,
            iconColor: 'semantic.warning',
            borderColor: 'semantic.warning',
            backgroundColor: 'semantic.warningLight',
          })}
        />
      </Text>
    </Box>
  );

  // Handle form input changes
  const handleChange = (field: string) => (value: string) => {
    setFormData((prev) => {
      // Check if the field being updated is homeType
      if (field === 'homeType') {
        // Update assessed value options based on home type
        const newAssessedValues = isMultiUnitHome(value) ? assesedValuesMultiUnit : assesedValues;
        setCurrentAssessedValues(newAssessedValues);

        // Only reset assessed value if current value is not compatible with new home type
        let newAssessedValue = prev.assessedValue;
        if (prev.assessedValue && !newAssessedValues.includes(prev.assessedValue)) {
          newAssessedValue = '';
        }

        return { ...prev, [field]: value, assessedValue: newAssessedValue };
      }
      // Check if the field being updated is totalPeople
      if (field === 'totalPeople') {
        // If totalPeople changes, reset annualHouseHold
        return { ...prev, [field]: value, annualHouseHold: '' };
      }
      // Otherwise, just update the field normally
      return { ...prev, [field]: value };
    });
  };

  // Validate dynamically as formData changes
  useEffect(() => {
    const { homeType, assessedValue, paysBills, totalPeople, annualHouseHold } = formData;
    // Utility function to check for empty values
    const isNullOrEmpty = (value: string | null | undefined): boolean => !value;

    if (!homeType && !assessedValue && !paysBills && !totalPeople && !annualHouseHold) {
      setIsEligible(null);
      return;
    }

    // Select the corresponding annual household values when totalPeople selected changes
    const selectedHouseholdValues = annualHouseholdOptions[0][totalPeople];

    if (selectedHouseholdValues) {
      setSelectedHouseholdValues(selectedHouseholdValues);
    }

    // Calculate home type eligibility - only "Other" is ineligible
    const homeTypeEligible = homeType !== optionValues.homeTypeOther;

    // Calculate property value eligibility based on home type group
    const isMultiUnit = isMultiUnitHome(homeType);
    let propertyValueEligible = true;

    if (isMultiUnit) {
      // Group B (multi-unit): Over $772,000 makes ineligible
      propertyValueEligible = assessedValue !== optionValues.propertyValueHighMulti;
    } else {
      // Group A (single-family): Over $1,230,000 shows warning but still eligible
      propertyValueEligible = true;
    }

    // Calculate payment eligibility
    const paymentEligible = paysBills === optionValues.paymentYes;

    // Calculate income eligibility
    const incomeEligible = selectedHouseholdValues ? annualHouseHold !== selectedHouseholdValues[3] : true;

    // Calculate overall eligibility
    const eligibility =
      !isNullOrEmpty(homeType) &&
      homeTypeEligible &&
      propertyValueEligible &&
      !isNullOrEmpty(paysBills) &&
      paymentEligible &&
      !isNullOrEmpty(totalPeople) &&
      !isNullOrEmpty(annualHouseHold) &&
      incomeEligible;

    setIsEligible(eligibility);
  }, [formData, annualHouseholdOptions, isMultiUnitHome, optionValues]);

  return (
    <Flex direction="column" w="full" bg="greys.white">
      <SubNavBar staticBreadCrumbs={breadCrumb} borderBottom={'none'} />
      {/* Header Section */}
      <Flex align="center" h={{ base: 'calc(40vh - 200px)', sm: '180px' }} bg="theme.blueAltGradient">
        <Container maxW="container.lg" px={8} h="100%">
          <Flex align="center" h="100%" w="100%" position="relative">
            <Heading as="h1" color="white">
              {t('auth.checkEligibility.heading')}
            </Heading>
          </Flex>
        </Container>
      </Flex>

      {/* Content Section */}
      <Container maxW="container.lg" pt={{ md: 12 }} px={{ lg: 8 }} pb={{ md: 12 }}>
        <VStack spacing={{ base: 4, md: 12 }} align="flex-start">
          <Flex direction={{ base: 'column', md: 'row' }} gap={{ base: 6, md: 12 }}>
            <Box position="relative">
              <Image
                src="/images/eligibility-place-holder.png"
                alt="Couple reviewing home energy program information on tablet"
                objectFit="cover"
                width="100%"
                height="100%"
              />
            </Box>
            <VStack align="flex-start" flex={1} spacing={4} p={{ base: 6, md: 0 }}>
              <Heading as="h2" color="theme.blueAlt">
                {t('auth.checkEligibility.aboutProgram')}
              </Heading>
              <Text>{t('auth.checkEligibility.programIntro')}</Text>
              <Text>{t('auth.checkEligibility.programAffordability')}</Text>
            </VStack>
          </Flex>
          {/* Form Section */}
          <VStack p={{ base: 4, md: 0 }} alignItems={'flex-start'} width="100%">
            <Heading as="h2" color="theme.blueAlt">
              {t('auth.checkEligibility.seeEligible')}
            </Heading>
            <Text>{t('auth.checkEligibility.questionInstruction')}</Text>

            <Box as="form" w="100%" role="form" aria-label="Eligibility Check Form">
              {/* Home Type Question */}
              <FormControl as="fieldset" mb={4}>
                <VisuallyHidden as="legend">{t('auth.checkEligibility.homeQuestion')}</VisuallyHidden>
                <QuestionCard
                  question={t('auth.checkEligibility.homeQuestion')}
                  answers={t('auth.checkEligibility.kindOfHomes', { returnObjects: true })}
                  onAnswerSelect={handleChange('homeType')}
                />
              </FormControl>
              {/* Show Error Alert if home type is "Other" */}
              {formData.homeType === optionValues.homeTypeOther && (
                <Box mt={4}>
                  <Text fontSize="lg" fontWeight="bold">
                    <CustomAlert
                      title={t('auth.checkEligibility.alert.otherHomes')}
                      description={t('auth.checkEligibility.alert.currentlyEligibleHome')}
                      items={eligibleHomeTypes}
                      linkText={t('auth.checkEligibility.alert.seeDetails')}
                      linkHref={t('landing.iNeedLink')}
                    />
                  </Text>
                </Box>
              )}
              {/*Property Assessed Value Question */}
              <FormControl as="fieldset" mb={4}>
                <VisuallyHidden as="legend">{t('auth.checkEligibility.propertyAssesmentQuestion')}</VisuallyHidden>
                <QuestionCard
                  question={t('auth.checkEligibility.propertyAssesmentQuestion')}
                  answers={currentAssessedValues}
                  onAnswerSelect={handleChange('assessedValue')}
                  type={t('auth.checkEligibility.assesmentText')}
                />
              </FormControl>
              {/* Property Value Alerts - Different logic for single-family vs multi-unit */}
              {/* Single-family homes: Over $1,230,000 shows warning but still eligible */}
              {!isMultiUnitHome(formData.homeType) &&
                formData.assessedValue === optionValues.propertyValueHighSingle &&
                renderAlert(
                  t('auth.checkEligibility.alert.provideInformation'),
                  t('auth.checkEligibility.alert.propertyValueWarning'),
                  true,
                )}
              {/* Single-family homes: Unsure shows warning */}
              {!isMultiUnitHome(formData.homeType) &&
                formData.assessedValue === optionValues.propertyValueUnsure &&
                renderAlert(
                  t('auth.checkEligibility.alert.provideInformation'),
                  t('auth.checkEligibility.alert.assessedValDescription'),
                  true,
                )}
              {/* Multi-unit homes: Over $772,000 makes ineligible */}
              {isMultiUnitHome(formData.homeType) &&
                formData.assessedValue === optionValues.propertyValueHighMulti &&
                renderAlert(
                  t('auth.checkEligibility.alert.propertyValueHigh'),
                  t('auth.checkEligibility.alert.multiUnitNotEligible'),
                )}
              {/* Multi-unit homes: Unsure shows different warning */}
              {isMultiUnitHome(formData.homeType) &&
                formData.assessedValue === optionValues.propertyValueUnsure &&
                renderAlert(
                  t('auth.checkEligibility.alert.provideInformation'),
                  t('auth.checkEligibility.alert.multiUnitUnsure'),
                  true,
                )}
              {/* Payment Bills Question */}
              <FormControl as="fieldset" mb={4}>
                <VisuallyHidden as="legend">{t('auth.checkEligibility.paymentQuestion')}</VisuallyHidden>
                <QuestionCard
                  question={t('auth.checkEligibility.paymentQuestion')}
                  answers={paymentValues}
                  onAnswerSelect={handleChange('paysBills')}
                  type={t('auth.checkEligibility.paymentTextPrefix')}
                />
              </FormControl>
              {/* Payment Bills Alerts */}
              {formData.paysBills === optionValues.paymentNo &&
                renderAlert(t('auth.checkEligibility.alert.mustPay'), t('auth.checkEligibility.alert.mustPayDesc'))}
              {formData.paysBills === optionValues.paymentUnsure &&
                renderAlert(
                  t('auth.checkEligibility.alert.mustPay'),
                  t('auth.checkEligibility.alert.mustPayDesc'),
                  true,
                )}
              {/* Total People Question */}
              <FormControl as="fieldset" mb={4}>
                <VisuallyHidden as="legend">{t('auth.checkEligibility.totalPeople')}</VisuallyHidden>
                <QuestionCard
                  question={t('auth.checkEligibility.totalPeople')}
                  answers={t('auth.checkEligibility.peopleNumber', { returnObjects: true })}
                  onAnswerSelect={handleChange('totalPeople')}
                  type={t('auth.checkEligibility.peopleTextPrefix')}
                />
              </FormControl>
              {selectedHouseholdValues !== null && (
                <>
                  {/* Annual Household Question */}
                  <FormControl as="fieldset" mb={4}>
                    <VisuallyHidden as="legend">{t('auth.checkEligibility.annualHouseholdQuestion')}</VisuallyHidden>
                    <QuestionCard
                      question={t('auth.checkEligibility.annualHouseholdQuestion')}
                      answers={selectedHouseholdValues}
                      onAnswerSelect={handleChange('annualHouseHold')}
                    />
                  </FormControl>
                  {formData.annualHouseHold === selectedHouseholdValues?.[4] &&
                    renderAlert(
                      t('auth.checkEligibility.alert.provideInformation'),
                      t('auth.checkEligibility.alert.proofOfIncomeDesc'),
                      true,
                    )}

                  {formData.annualHouseHold === selectedHouseholdValues?.[3] &&
                    renderAlert(
                      t('auth.checkEligibility.alert.rangeNotEligible'),
                      t('auth.checkEligibility.alert.annualHouseholdDesc'),
                    )}
                </>
              )}
              {/* Eligibility Result */}
              {isEligible !== null && (
                <Box mt={4}>
                  <Text fontSize="lg" fontWeight="bold">
                    {isEligible && <SuccessAlert />}
                  </Text>
                </Box>
              )}
            </Box>
          </VStack>
        </VStack>
      </Container>
    </Flex>
  );
});
