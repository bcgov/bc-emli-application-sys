import { Box, Container, Flex, FormControl, Heading, Image, Text, VStack } from "@chakra-ui/react"
import { Warning } from "@phosphor-icons/react/dist/ssr"
import { observer } from "mobx-react-lite"
import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import ErrorAlert from "../../shared/base/error-alert"
import QuestionCard from "../../shared/base/question-card"
import SuccessAlert from "../../shared/base/success-alert"

interface IEligibilityCheckProps {}

export const EligibilityCheck = observer(({}: IEligibilityCheckProps) => {
  const { t } = useTranslation()
  const eligibleHomes: string[] = t("auth.checkEligibility.kindOfHomes", { returnObjects: true })
  const eligibleHomeTypes: string[] = t("auth.checkEligibility.alert.typesOfhome", { returnObjects: true })
  const assesedValues: string[] = t("auth.checkEligibility.assesedValues", { returnObjects: true })
  const paymentValue: string[] = t("auth.checkEligibility.paymentOption", { returnObjects: true })

  const [isEligible, setIsEligible] = useState<null | boolean>(null)
  const [isHomeTypeEligible, setIsHomeTypeEligible] = useState<boolean | null>(null)
  const [isAssessedValueEligible, setIsAssessedValueEligible] = useState<boolean | null>(null)

  const [formData, setFormData] = useState({
    homeType: "",
    assessedValue: "",
    paysBills: "",
    totalPeople: "",
  })

  // Handle form input changes
  const handleChange = (field: string) => (value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Validate dynamically as formData changes
  useEffect(() => {
    const { homeType, assessedValue, paysBills, totalPeople } = formData

    if (!homeType && !assessedValue && !paysBills && !totalPeople) {
      setIsHomeTypeEligible(null)
      setIsAssessedValueEligible(null)
      setIsEligible(null)
      return
    }

    // Calculate home type eligibility based on conditions
    const homeTypeEligible = homeType === eligibleHomes[4] ? false : true
    const ineligibleHomes = [eligibleHomes[4], eligibleHomes[5], eligibleHomes[6]]

    const areEligibleHomes = !ineligibleHomes.includes(homeType)
    setIsHomeTypeEligible(homeTypeEligible)

    // Calculate assesed value eligibility based on conditions
    const assessedValueEligible = assessedValue === assesedValues[2] ? false : true
    setIsAssessedValueEligible(assessedValueEligible)

    // Calculate overall eligibility
    const eligibility =
      areEligibleHomes && assessedValue === assesedValues[1] && paysBills === paymentValue[0] && totalPeople !== ""
    setIsEligible(eligibility)
  }, [formData])

  return (
    <Flex direction="column" w="full" bg="greys.white">
      {/* Header Section */}
      <Flex align="center" h={{ base: "calc(40vh - 200px)", sm: "180px" }} bg="theme.blueAltGradient">
        <Container maxW="container.lg" px={8} h="100%">
          <Flex align="center" h="100%" w="100%" position="relative">
            <Heading as="h1" color="white">
              {t("auth.checkEligibility.seeEligible")}
            </Heading>
          </Flex>
        </Container>
      </Flex>

      {/* Content Section */}
      <Container maxW="container.lg" pt={{ md: 12 }} px={{ lg: 8 }} pb={{ md: 12 }}>
        <VStack spacing={{ base: 4, md: 12 }} align="flex-start">
          <Flex direction={{ base: "column", md: "row" }} gap={{ base: 6, md: 12 }}>
            <Box flex={1}>
              <Image src="/images/place-holder.png" alt="Place holder" />
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

              {/* Assessed Value Question */}
              <FormControl as="fieldset" mb={4}>
                <QuestionCard
                  question={t("auth.checkEligibility.propertyAssesmentQuestion")}
                  answers={t("auth.checkEligibility.assesedValues", { returnObjects: true })}
                  onAnswerSelect={handleChange("assessedValue")}
                />
              </FormControl>

              {/* Show Error Alert if assesed value is not eligible */}
              {isAssessedValueEligible === false && (
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
                  answers={t("auth.checkEligibility.paymentOption", { returnObjects: true })}
                  onAnswerSelect={handleChange("paysBills")}
                />
              </FormControl>

              {/* Total People Question */}
              <FormControl as="fieldset" mb={4}>
                <QuestionCard
                  question={t("auth.checkEligibility.totalPeople")}
                  answers={t("auth.checkEligibility.peopleNumber", { returnObjects: true })}
                  onAnswerSelect={handleChange("totalPeople")}
                />
              </FormControl>

              {/* Eligibility Result */}
              {isEligible !== null && (
                <Box mt={4}>
                  <Text fontSize="lg" fontWeight="bold">
                    {isEligible ? <SuccessAlert /> : <ErrorAlert title="You're not eligible to apply" />}
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
