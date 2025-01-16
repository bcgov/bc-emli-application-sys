import { Box, Divider, Flex, Heading, HStack, Link, Text, VStack, Button } from "@chakra-ui/react"
import { ArrowSquareOut, Phone } from "@phosphor-icons/react"
import React from "react"
import { useTranslation } from "react-i18next"
import { ContractorInfoBlock } from "../../shared/bcservicecard/contractor"
import { EnergyCoachInfoBlock } from "../../shared/bcservicecard/energy-coach"
import { CenterContainer } from "../../shared/containers/center-container"
import { RouterLinkButton } from "../../shared/navigation/router-link-button"

interface ILoginScreenProps {
  isAdmin?: boolean
}

export const LoginScreen = ({ isAdmin }: ILoginScreenProps) => {
  const { t } = useTranslation()

  return (
    <CenterContainer h="full">
      <Flex direction={{ base: "column", md: "row" }} gap={4}>
        <Flex
          direction="column"
          gap={6}
          flex={1}
          p={"10"}
          border="solid 1px"
          borderColor="border.light"
          bg="greys.white"
          boxSizing="border-box"
          w={{ md: "500px" }}
        >
          <VStack spacing={2} align="start">
            <Heading as="h1" mb={0} color="theme.blueAlt">
              {isAdmin ? t("auth.adminLogin") : t("auth.login")}
            </Heading>
            {!isAdmin && <Text fontSize="md">{t("auth.bcServiceCardInfo.prompt")}</Text>}
          </VStack>
          <form action="/api/auth/keycloak" method="post">
            <input type="hidden" name="kc_idp_hint" value={isAdmin ? "idir" : "bcsc"} />
            {/* @ts-ignore */}
            <input
              type="hidden"
              name="authenticity_token"
              value={document.querySelector("[name=csrf-token]").content}
            />
            <Button variant="primary" w="full" type="submit">
          {t("auth.bcsc_login")}
          </Button>
            {/* <RouterLinkButton to="/" bg="theme.blue" color="white" rightIcon={<ArrowSquareOut size={16} />}>
              {t("auth.bcServiceCardInfo.bcservice_login")}
            </RouterLinkButton> */}
          </form>
          {isAdmin ? (
            <Text>{t("auth.adminAccountAccess")}</Text>
          ) : (
            <>
              <Box>
                <Text fontWeight="bold">{t("auth.noAccount")}</Text>
                <HStack>
                  <Text>
                    <Link href={t("auth.bcServiceCardInfo.learnMoreLink")} color="text.primary" isExternal>
                      {t("auth.bcServiceCardInfo.learnMore")}{" "}
                    </Link>
                    {t("auth.bcServiceCardInfo.loginHelp")}
                  </Text>
                </HStack>
              </Box>
              <Box>
                <Text fontWeight="bold">{t("auth.bcServiceCardInfo.noSmartPhone")}</Text>
                <Text>
                  {t("auth.bcServiceCardInfo.phoneService")}{" "}
                  <Link href={t("auth.bcServiceCardInfo.learnMoreTokensLink")} color="text.primary" isExternal>
                    {t("auth.bcServiceCardInfo.serviceCardTokens")}
                  </Link>
                </Text>
              </Box>
              <Text>{t("auth.troubleLogging")}</Text>

              <Flex direction="row" align="center" gap={2}>
                <Phone size={16} />
                <Text flex={1}>{t("auth.phoneNumber")}</Text>
              </Flex>
              <Divider my={4} />
              <Heading as="h2" m={0} color="theme.blueAlt">
                {t("auth.bceidInfo.needHelp")}
              </Heading>

              <EnergyCoachInfoBlock />
            </>
          )}
        </Flex>
        <Box height="auto">
          <ContractorInfoBlock />
        </Box>
      </Flex>
    </CenterContainer>
  )
}