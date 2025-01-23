import { Box, Container, Flex, FormControl, Heading, Image, Text, VStack } from "@chakra-ui/react"
import { Warning } from "@phosphor-icons/react/dist/ssr"
import { observer } from "mobx-react-lite"
import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import ErrorAlert from "../../shared/base/error-alert"
import QuestionCard from "../../shared/base/question-card"
import SuccessAlert from "../../shared/base/success-alert"
import { SubNavBar } from "../navigation/sub-nav-bar"

interface IEligibilityCheckProps {}

export const EligibilityCheck = observer(({}: IEligibilityCheckProps) => {
  const { t } = useTranslation()
  const eligibleHomes: string[] = t("auth.checkEligibility.kindOfHomes", { returnObjects: true })
  const eligibleHomeTypes: string[] = t("auth.checkEligibility.alert.typesOfhome", { returnObjects: true })
  const assesedValues: string[] = t("auth.checkEligibility.assesedValues", { returnObjects: true })
  const paymentValues: string[] = t("auth.checkEligibility.paymentOption", { returnObjects: true })

  const annualHouseholdOptions = t("auth.checkEligibility.annualHouseholdValues", { returnObjects: true })
  const [selectedHouseholdValues, setSelectedHouseholdValues] = useState<string[] | null>(null)

  const breadCrumb = [
    {
      href: "/check-eligible",
      title: t("auth.checkEligibility.seeEligible"),
    },
  ]

  const [isEligible, setIsEligible] = useState<null | boolean>(null)
  const [isHomeTypeEligible, setIsHomeTypeEligible] = useState<boolean | null>(null)
  const [formData, setFormData] = useState({
    homeType: "",
    assessedValue: "",
    paysBills: "",
    totalPeople: "",
    annualHouseHold: "",
  })

  // Handle form input changes
  const handleChange = (field: string) => (value: string) => {
    setFormData((prev) => {
      // Check if the field being updated is totalPeople
      if (field === "totalPeople") {
        // If totalPeople changes, reset annualHouseHold
        return { ...prev, [field]: value, annualHouseHold: "" }
      }
      // Otherwise, just update the field normally
      return { ...prev, [field]: value }
    })
  }

  // Validate dynamically as formData changes
  useEffect(() => {
    const { homeType, assessedValue, paysBills, totalPeople, annualHouseHold } = formData
    // Utility function to check for empty values
    const isNullOrEmpty = (value: string | null | undefined): boolean => !value

    if (!homeType && !assessedValue && !paysBills && !totalPeople && !annualHouseHold) {
      setIsHomeTypeEligible(null)
      setIsEligible(null)
      return
    }

    // Select the corresponding annual household values when totalPeople selected changes
    const selectedHouseholdValues = annualHouseholdOptions[0][totalPeople]

    if (selectedHouseholdValues) {
      setSelectedHouseholdValues(selectedHouseholdValues)
    }

    // Calculate home type eligibility based on conditions
    const homeTypeEligible = homeType === eligibleHomes[4] ? false : true
    const ineligibleHomes = [eligibleHomes[4], eligibleHomes[5]]

    const areEligibleHomes = !ineligibleHomes.includes(homeType)
    setIsHomeTypeEligible(homeTypeEligible)

    // Calculate overall eligibility
    const eligibility =
      !isNullOrEmpty(homeType) &&
      areEligibleHomes &&
      assessedValue !== assesedValues[1] &&
      !isNullOrEmpty(paysBills) &&
      paysBills !== paymentValues[1] &&
      !isNullOrEmpty(totalPeople) &&
      !isNullOrEmpty(annualHouseHold) &&
      annualHouseHold !== selectedHouseholdValues[3]

    setIsEligible(eligibility)
  }, [formData])

  return (
    <Flex direction="column" w="full" bg="greys.white">
      <SubNavBar staticBreadCrumbs={breadCrumb} borderBottom={"none"} />
      {/* Header Section */}
      <Flex align="center" h={{ base: "calc(40vh - 200px)", sm: "180px" }} bg="theme.blueAltGradient">
        <Container maxW="container.lg" px={8} h="100%">
          <Flex align="center" h="100%" w="100%" position="relative">
            <Heading as="h1" color="white">
              {t("auth.checkEligibility.heading")}
            </Heading>
          </Flex>
        </Container>
      </Flex>

      {/* Content Section */}
      <Container maxW="container.lg" pt={{ md: 12 }} px={{ lg: 8 }} pb={{ md: 12 }}>
        <VStack spacing={{ base: 4, md: 12 }} align="flex-start">
          <Flex direction={{ base: "column", md: "row" }} gap={{ base: 6, md: 12 }}>
            <Box position="relative">
              <Image
                src="/images/eligibility-place-holder.png"
                alt="Place holder"
                objectFit="cover"
                width="100%"
                height="100%"
              />
            </Box>
            <VStack align="flex-start" flex={1} spacing={4} p={{ base: 6, md: 0 }}>
              <Heading as="h2" color="theme.blueAlt">
                {t("auth.checkEligibility.aboutProgram")}
              </Heading>
              <Text>{t("auth.checkEligibility.programIntro")}</Text>
              <Text>{t("auth.checkEligibility.programAffordability")}</Text>
            </VStack>
          </Flex>
          {/* Form Section */}
          <VStack p={{ base: 4, md: 0 }} alignItems={"flex-start"} width="100%">
            <Heading as="h2" color="theme.blueAlt">
              {t("auth.checkEligibility.seeEligible")}
            </Heading>
            <Text>{t("auth.checkEligibility.questionInstruction")}</Text>

            <Box as="form" w="100%">
              {/* Home Type Question */}
              <FormControl as="fieldset" mb={4}>
                <QuestionCard
                  question={t("auth.checkEligibility.homeQuestion")}
                  answers={t("auth.checkEligibility.kindOfHomes", { returnObjects: true })}
                  onAnswerSelect={handleChange("homeType")}
                />
              </FormControl>
              {/* Show Error Alert if home type is not eligible */}
              {isHomeTypeEligible === false && (
                <Box mt={4}>
                  <Text fontSize="lg" fontWeight="bold">
                    <ErrorAlert
                      title={t("auth.checkEligibility.alert.condoEligible")}
                      description={t("auth.checkEligibility.alert.currentlyEligibleHome")}
                      items={eligibleHomeTypes}
                      linkText={t("auth.checkEligibility.alert.seeDetails")}
                      linkHref={t("landing.iNeedLink")}
                    />
                  </Text>
                </Box>
              )}
              {formData.homeType === eligibleHomes[5] && (
                <ErrorAlert
                  title={t("auth.checkEligibility.alert.otherHomes")}
                  description={t("auth.checkEligibility.alert.currentlyEligibleHome")}
                  items={eligibleHomeTypes}
                  linkText={t("auth.checkEligibility.alert.seeDetails")}
                  linkHref={t("landing.iNeedLink")}
                />
              )}
              {formData.homeType === eligibleHomes[6] && (
                <ErrorAlert
                  title={t("auth.checkEligibility.alert.certainHomes")}
                  description={t("auth.checkEligibility.alert.currentlyEligibleHome")}
                  items={eligibleHomeTypes}
                  linkText={t("auth.checkEligibility.alert.seeDetails")}
                  linkHref={t("landing.iNeedLink")}
                  icon={<Warning />}
                  iconColor="semantic.warning"
                  borderColor="semantic.warning"
                  backgroundColor="semantic.warningLight"
                />
              )}
              {/*Property Assessed Value Question */}
              <FormControl as="fieldset" mb={4}>
                <QuestionCard
                  question={t("auth.checkEligibility.propertyAssesmentQuestion")}
                  answers={assesedValues}
                  onAnswerSelect={handleChange("assessedValue")}
                  type={t("auth.checkEligibility.assesmentText")}
                />
              </FormControl>
              {/* Show Error Alert if assesed value is not eligible */}
              {formData.assessedValue === assesedValues[1] && (
                <Box mt={4}>
                  <Text fontSize="lg" fontWeight="bold">
                    <ErrorAlert
                      title={t("auth.checkEligibility.alert.propertyValueHigh")}
                      description={t("auth.checkEligibility.alert.propertyValueHighDesc")}
                      linkText={t("auth.checkEligibility.alert.seeDetails")}
                      linkHref={t("landing.iNeedLink")}
                    />
                  </Text>
                </Box>
              )}
              {formData.assessedValue === assesedValues[2] && (
                <Box mt={4}>
                  <Text fontSize="lg" fontWeight="bold">
                    <ErrorAlert
                      title={t("auth.checkEligibility.alert.provideInformation")}
                      description={t("auth.checkEligibility.alert.assessedValDescription")}
                      linkText={t("auth.checkEligibility.alert.seeDetails")}
                      linkHref={t("landing.iNeedLink")}
                      icon={<Warning />}
                      iconColor="semantic.warning"
                      borderColor="semantic.warning"
                      backgroundColor="semantic.warningLight"
                    />
                  </Text>
                </Box>
              )}
              {/* Payment Bills Question */}
              <FormControl as="fieldset" mb={4}>
                <QuestionCard
                  question={t("auth.checkEligibility.paymentQuestion")}
                  answers={paymentValues}
                  onAnswerSelect={handleChange("paysBills")}
                  type={t("auth.checkEligibility.paymentTextPrefix")}
                />
              </FormControl>
              {formData.paysBills === paymentValues[2] && (
                <Box mt={4}>
                  <Text fontSize="lg" fontWeight="bold">
                    <ErrorAlert
                      title={t("auth.checkEligibility.alert.mustPay")}
                      description={t("auth.checkEligibility.alert.mustPayDesc")}
                      linkText={t("auth.checkEligibility.alert.seeDetails")}
                      linkHref={t("landing.iNeedLink")}
                      icon={<Warning />}
                      iconColor="semantic.warning"
                      borderColor="semantic.warning"
                      backgroundColor="semantic.warningLight"
                    />
                  </Text>
                </Box>
              )}
              {/* Total People Question */}
              <FormControl as="fieldset" mb={4}>
                <QuestionCard
                  question={t("auth.checkEligibility.totalPeople")}
                  answers={t("auth.checkEligibility.peopleNumber", { returnObjects: true })}
                  onAnswerSelect={handleChange("totalPeople")}
                  type={t("auth.checkEligibility.peopleTextPrefix")}
                />
              </FormControl>
              {selectedHouseholdValues !== null && (
                <>
                  {/* Annual Household Question */}
                  <FormControl as="fieldset" mb={4}>
                    <QuestionCard
                      question={t("auth.checkEligibility.annualHouseholdQuestion")}
                      answers={selectedHouseholdValues}
                      onAnswerSelect={handleChange("annualHouseHold")}
                    />
                  </FormControl>
                  {selectedHouseholdValues !== null && (
                    <>
                      {formData.annualHouseHold === selectedHouseholdValues[4] && (
                        <Box mt={4}>
                          <Text fontSize="lg" fontWeight="bold">
                            <ErrorAlert
                              title={t("auth.checkEligibility.alert.provideInformation")}
                              description={t("auth.checkEligibility.alert.proofOfIncomeDesc")}
                              linkText={t("auth.checkEligibility.alert.seeDetails")}
                              linkHref={t("landing.iNeedLink")}
                              icon={<Warning />}
                              iconColor="semantic.warning"
                              borderColor="semantic.warning"
                              backgroundColor="semantic.warningLight"
                            />
                          </Text>
                        </Box>
                      )}
                    </>
                  )}

                  {formData.annualHouseHold === selectedHouseholdValues[3] && (
                    <Box mt={4}>
                      <Text fontSize="lg" fontWeight="bold">
                        <ErrorAlert
                          title={t("auth.checkEligibility.alert.rangeNotEligible")}
                          description={t("auth.checkEligibility.alert.annualHouseholdDesc")}
                          linkText={t("auth.checkEligibility.alert.seeDetails")}
                          linkHref={t("landing.iNeedLink")}
                        />
                      </Text>
                    </Box>
                  )}
                </>
              )}
              {/* Eligibility Result */}
              {isEligible !== null && (
                <Box mt={4}>
                  <Text fontSize="lg" fontWeight="bold">
                    {isEligible && <SuccessAlert />}
                    {/* // ) : (
                    //   <ErrorAlert title={t("auth.checkEligibility.alert.notEligible")} />
                    // )} */}
                  </Text>
                </Box>
              )}
            </Box>
          </VStack>
        </VStack>
      </Container>
    </Flex>
  )
})
