import { Box, Container, Flex, Heading, Link, Text, VStack } from "@chakra-ui/react"
import { ArrowSquareOut } from "@phosphor-icons/react"
import i18next from "i18next"
import React from "react"
import { useTranslation } from "react-i18next"
import { RouterLinkButton } from "../../shared/navigation/router-link-button"

export const SupportScreen = () => {
  const { t } = useTranslation()
  const mailto = `mailto:${t("site.contactEmail")}`

  const contactTeamInstructions = i18next.t("site.contactTeamInstructions", {
    returnObjects: true,
  }) as string[]

  return (
    <Container maxW="container.lg" p={20} gap={4}>
      {/* Heading */}
      <Heading as="h1" color="theme.blueAlt">
        {t("site.support.getSupport")}
      </Heading>

      {/* Contact Information */}
      <Text>
        {t("site.support.contactAt")}
        <Link href={mailto} isExternal ml={1}>
          {t("site.support.contactTeamCTA")}
        </Link>{" "}
        {t("site.support.contactUs")}
      </Text>

      <Flex direction={{ base: "column", md: "row" }} mt={20} gap={8}>
        <Flex direction="column" gap={4} flex={1}>
          {/* Secondary Heading */}
          <Heading as="h2" variant="greenline" color="theme.blueAlt">
            {t("site.support.hereToHelp")}
          </Heading>

          <Text>
            <strong>{t("site.support.speakWithEnergyCoach")}</strong>
          </Text>
          <Text>{t("site.support.anyQuestions")}</Text>
          <RouterLinkButton to="/" variant="secondary" rightIcon={<ArrowSquareOut size={16} />}>
            {t("site.support.bookACall")}
          </RouterLinkButton>
        </Flex>
        {/* Instructions Section */}
        <VStack as="section" borderRadius="md" width="350px" bg="theme.blueLightBg" maxWidth="full" p={8}>
          <Box>
            <Text as="h2" color="theme.blueAlt" fontWeight="bold" lineHeight="normal">
              {t("site.support.learnMore")}
            </Text>
            <Text mt={4}>
              {t("site.support.offers")}{" "}
              <Link href={t("landing.iNeedLink")} isExternal>
                {t("site.support.betterHomes")} <ArrowSquareOut />
              </Link>
            </Text>
          </Box>
        </VStack>
      </Flex>
    </Container>
  )
}
