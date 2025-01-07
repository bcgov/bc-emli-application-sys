import { Button, Divider, Flex, Heading, Link, Text, VStack,HStack, IconButton } from "@chakra-ui/react"
import React from "react"
import { useTranslation } from "react-i18next"
import { CenterContainer } from "../../shared/containers/center-container"
import {Phone } from "@phosphor-icons/react"
import { RouterLinkButton } from "../../shared/navigation/router-link-button"
import { EnergyCoachInfoBlock } from "../../shared/bcservicecard/energy-coach"
import { VirtualAssistantInfoBlock } from "../../shared/bcservicecard/virtual-assistant"

interface ILoginScreenProps {
  isAdmin?: boolean
}

export const LoginScreen = ({ isAdmin }: ILoginScreenProps) => {
  const { t } = useTranslation()

  return (
    <CenterContainer h="full">
      <Flex
        direction="column"
        maxW="500px"
        gap={6}
        w="full"
        flex={1}
        p={10}
        border="solid 1px"
        borderColor="border.light"
        bg="greys.white"
      >
        <VStack spacing={2} align="start">
          <Heading as="h1" mb={0} color="theme.blueAlt">
            {isAdmin ? t("auth.adminLogin") : t("auth.login")}
          </Heading>
          {!isAdmin && <Text fontSize="md">{t("auth.prompt")}</Text>}
        </VStack>
        <form action="/api/auth/keycloak" method="post">
          <input type="hidden" name="kc_idp_hint" value={isAdmin ? "idir" : "bceidboth"} />
          {/* @ts-ignore */}
          <input type="hidden" name="authenticity_token" value={document.querySelector("[name=csrf-token]").content} />
          <Button variant="primary" w="full" type="submit">
          {t("auth.idir_login")}
          </Button>
              {/* <RouterLinkButton to="/" w="full"  rightIcon={<ArrowSquareOut size={16} />}>{t("auth.bcservice_login")}</RouterLinkButton> */}
        </form>
        {isAdmin ? (
          <Text>{t("auth.adminAccountAccess")}</Text>
        ) : (
          <>
            <Text>
              {t("auth.loginHelp")}
              <Link href="https://www.bceid.ca/clp/account_recovery.aspx" isExternal>
              </Link>
            </Text>
            <Text>{t("auth.troubleLogging")}</Text>
                           
            <Flex direction="row" align="center" gap={2}><Phone size={12.5}/><Text flex={1}>{t("auth.phoneNumber")}</Text></Flex>
            <Divider my={4} />
            <Heading as="h2" m={0} color="theme.blueAlt">
              {t("auth.bceidInfo.needHelp")}
            </Heading>

            <EnergyCoachInfoBlock/>
            <VirtualAssistantInfoBlock />

          </>
        )}
      </Flex>
    </CenterContainer>
  )
}
