import { Box, Divider, Flex, Heading, HStack, Link, Text, VStack, Button } from "@chakra-ui/react"
import { ArrowSquareOut, Phone } from "@phosphor-icons/react"
import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { ContractorInfoBlock } from "../../shared/bcservicecard/contractor"
import { EnergyCoachInfoBlock } from "../../shared/bcservicecard/energy-coach"
import { CenterContainer } from "../../shared/containers/center-container"
import { RouterLinkButton } from "../../shared/navigation/router-link-button"
import { useLocation } from "react-router-dom"

interface ILoginScreenProps {
  isAdmin?: boolean
  isPSR?: boolean
  isAdminMgr?: boolean
  isSysAdmin?: boolean
}

export const AdminPortalLogin = ({ isAdmin, isPSR, isAdminMgr, isSysAdmin }: ILoginScreenProps) => {
  const { t } = useTranslation()
  const location = useLocation()

  const loginType = () => {
    if (isAdmin) {
      return t("auth.adminLogin");
    } else if (isPSR) {
      return t("auth.psrLogin");
    } else if (isAdminMgr) {
      return t("auth.adminMgrLogin");
    } else if (isSysAdmin) {
      return t("auth.sysAdminLogin");
    } else {
      return t("auth.adminLogin"); // Fallback in case none of the booleans are true
    }
  };

  // Usage
  const loginMessage = loginType();
  
  return (
    <CenterContainer h="full">
      <Flex direction={{ base: "column", md: "row" }} gap={10}>
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
              {loginMessage}
            </Heading>
            <Text fontSize="md">{t("auth.adminPortalLoginInfo.login")}</Text>
          </VStack>
          <form action="/api/auth/keycloak" method="post">
            <input type="hidden" name="kc_idp_hint" value="azureidir" />
            {/* @ts-ignore */}
            <input
              type="hidden"
              name="authenticity_token"
              value={document.querySelector("[name=csrf-token]").content}
            />
            <Button variant="primary" w="full" type="submit" rightIcon={<ArrowSquareOut size={16} />}>
              {t("auth.adminPortalLoginInfo.button")}
            </Button>
          </form>
          <Box>
            <HStack>
              <Text>
                <Link href={t("auth.adminPortalLoginInfo.trouble.link")} color="text.primary" isExternal>
                  {t("auth.adminPortalLoginInfo.trouble.linkText")}{" "}
                </Link>
                {t("auth.adminPortalLoginInfo.trouble.text")}
              </Text>
            </HStack>
          </Box>
              
          <Box>
            <Text fontWeight="bold">{t("auth.adminPortalLoginInfo.noAccount.text")}</Text>
            <form id="authForm" action="/api/auth/keycloak" method="post">
              <input type="hidden" name="kc_idp_hint" value="bceidbusiness" />
              {/* @ts-ignore */}
              <input
                type="hidden"
                name="authenticity_token"
                value={document.querySelector("[name=csrf-token]").content}
              />
            </form>

            <Link href="#" onClick={() => document.getElementById('authForm').submit()}>
              {t("auth.adminPortalLoginInfo.noAccount.altLoginText")}
            </Link>

          </Box>
          <Divider my={4} />            
        </Flex>
      </Flex>
    </CenterContainer>
  )
}