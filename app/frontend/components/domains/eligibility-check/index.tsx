import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Container,
  Flex,
  Heading,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React from "react"
import { useTranslation } from "react-i18next"
import QuestionCard from "../../shared/base/question-card"

interface IEligibilityCheckProps {}

export const EligibilityCheck = observer(({}: IEligibilityCheckProps) => {
  const { t } = useTranslation()

  const handleAnswerSelect = (answer: string) => {
    alert(`You selected: ${answer}`)
  }

  return (
    <Flex direction="column" w="full" bg="greys.white">
      {/* Breadcrumb Section */}
      <Container maxW="container.lg" px={8}>
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href="/welcome" color="text.link">
              {t("auth.checkEligibility.home")}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <Text as="b">{t("auth.checkEligibility.seeEligible")}</Text>
          </BreadcrumbItem>
        </Breadcrumb>
      </Container>

      {/* Header Section */}
      <Flex
        align="center"
        h={{ base: "calc(40vh - 200px)", sm: "180px" }}
        bg="linear-gradient(124.8deg, #142B43 -52.7%, #142B43 -52.68%, #054277 47.38%, #142B43 137.55%)"
      >
        <Container maxW="container.lg" px={8} h="100%">
          <Flex align="center" h="100%" w="100%" position="relative">
            <Heading as="h1" color="white">
              {t("auth.checkEligibility.seeEligible")}
            </Heading>
            <Box
              position="absolute"
              inset="0"
              bgImage="url('/images/eligibility-header.png')"
              bgRepeat="no-repeat"
              bgSize="contain"
              bgPosition="right"
              opacity={0.1}
            />
          </Flex>
        </Container>
      </Flex>

      {/* Content Section */}
      <Container maxW="container.lg" pt={{ md: 12 }} px={{ lg: 8 }} pb={{ md: 12 }}>
        <VStack spacing={{ base: 4, md: 12 }} align="flex-start">
          <Flex direction={{ base: "column", md: "row" }} gap={{ base: 6, md: 12 }}>
            {/* Image Box */}
            <Box flex={1}>
              <Image src="/images/place-holder.png" alt="Place holder" />
            </Box>

            {/* Text Content */}
            <VStack align="flex-start" flex={1} spacing={4} p={{ base: 6, md: 0 }}>
              <Heading as="h2" color="theme.blueAlt">
                {t("auth.checkEligibility.aboutProgram")}
              </Heading>
              <Text>{t("auth.checkEligibility.programIntro")}</Text>
              <Text>{t("auth.checkEligibility.programAffordability")}</Text>
            </VStack>
          </Flex>
          <VStack p={{ base: 4, md: 0 }} alignItems={"flex-start"} width="100%">
            <Heading as="h2" color="theme.blueAlt">
              {t("auth.checkEligibility.seeEligible")}
            </Heading>
            <Text>{t("auth.checkEligibility.questionInstruction")}</Text>
            <QuestionCard
              question={t("auth.checkEligibility.homeQuestion")}
              answers={t("auth.checkEligibility.kindOfHomes", { returnObjects: true })}
              onAnswerSelect={handleAnswerSelect}
            />
            <QuestionCard
              question={t("auth.checkEligibility.propertyAssesmentQuestion")}
              answers={t("auth.checkEligibility.assesedValues", { returnObjects: true })}
              onAnswerSelect={handleAnswerSelect}
              type={t("auth.checkEligibility.assesmentText")}
            />
            <QuestionCard
              question={t("auth.checkEligibility.paymentQuestion")}
              answers={t("auth.checkEligibility.paymentOption", { returnObjects: true })}
              onAnswerSelect={handleAnswerSelect}
              type={t("auth.checkEligibility.paymentTextPrefix")}
            />
            <QuestionCard
              question={t("auth.checkEligibility.totalPeople")}
              answers={t("auth.checkEligibility.peopleNumber", { returnObjects: true })}
              onAnswerSelect={handleAnswerSelect}
              type={t("auth.checkEligibility.peopleTextPrefix")}
            />
          </VStack>
        </VStack>
      </Container>
    </Flex>
  )
})
