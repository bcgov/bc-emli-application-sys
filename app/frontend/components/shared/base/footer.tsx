import { Box, Container, Divider, Flex, Link, Show, Text, Wrap } from "@chakra-ui/react"
import { ArrowSquareOut } from "@phosphor-icons/react"
import { observer } from "mobx-react-lite"
import React from "react"
import { useTranslation } from "react-i18next"
import { useLocation } from "react-router-dom"
import { useMst } from "../../../setup/root"
import { RouterLink } from "../navigation/router-link"

export const Footer = observer(() => {
  const location = useLocation()
  const {
    sessionStore: { loggedIn },
  } = useMst()
  const { t } = useTranslation()
  const onlyShowFooterOnRoutes = [
    "/reset-password",
    "/accept-invitation",
    "/login",
    "/forgot-password",
    "/welcome",
    "/contact",
    "/check-eligible",
  ]

  const shouldShowFooter = onlyShowFooterOnRoutes.some((route) => location.pathname.startsWith(route))

  return (
    <>
      {shouldShowFooter && (
        <Flex
          direction="column"
          as="footer"
          w="full"
          justifySelf="flex-end"
          borderTop="2px solid"
          borderColor="border.light"
          zIndex={10}
        >
          <Flex py={8} borderY="4px solid" borderColor="theme.yellow" bg="text.primary" color="greys.white">
            <Container maxW="container.lg">
              <Text>{t("site.territorialAcknowledgement")}</Text>
              <Wrap spacing={2} justify="flex-start">
                <Text>{t("site.privacyAndTermsPrefix")}</Text>
                <Link href="" isExternal color="white" gap="0.2rem" _hover={{ opacity: 0.4 }}>
                  {t("site.privacyText")} <ArrowSquareOut />
                </Link>
                <Text>{t("site.midText")}</Text>
                <Link href="" isExternal color="white" gap="0.2rem" _hover={{ opacity: 0.4 }}>
                  {t("site.termsText")} <ArrowSquareOut />
                </Link>
                <Text>{t("site.privacyAndTermsSuffix")} </Text>
              </Wrap>
            </Container>
          </Flex>
          <Show above="md">
            <Box py={14} bg="greys.grey03" w="full">
              <Container maxW="container.lg">
                <Flex direction={{ base: "column", md: "row" }} gap={12}>
                  <Flex direction={"row"} align="center" justify="center" wrap="wrap" gap={8}>
                    <RouterLink to="" color="text.secondary" style={{ textDecoration: "none" }}>
                      {t("site.betterHomes")}
                    </RouterLink>
                    <Divider orientation="vertical" h="25px" mx={4} borderColor="text.secondary" />
                    <RouterLink to="" color="text.secondary" style={{ textDecoration: "none" }}>
                      {t("site.disclaimer")}
                    </RouterLink>
                    <Divider orientation="vertical" h="25px" mx={4} borderColor="text.secondary" />
                    <RouterLink to="" color="text.secondary" style={{ textDecoration: "none" }}>
                      {t("site.accessibility")}
                    </RouterLink>
                    <Divider orientation="vertical" h="25px" mx={4} borderColor="text.secondary" />
                    <RouterLink to="" color="text.secondary" style={{ textDecoration: "none" }}>
                      {t("site.copyright")}
                    </RouterLink>
                    <Divider orientation="vertical" h="25px" mx={4} borderColor="text.secondary" />
                    <RouterLink to="" color="text.secondary" style={{ textDecoration: "none" }}>
                      {t("site.dataAndPrivacy")}
                    </RouterLink>
                  </Flex>
                </Flex>
              </Container>
            </Box>
          </Show>
        </Flex>
      )}
    </>
  )
})
