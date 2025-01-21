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
            </Container>
          </Flex>
          <Show above="md">
            <Box py={14} bg="greys.grey03" w="full">
              <Container maxW="container.lg">
                <Flex direction={{ base: "column", md: "row" }} gap={12}>
                  <Flex direction={"row"} align="center" justify="center" wrap="wrap" gap={8}>
                    <RouterLink to={t("site.footerLinks.betterHomes")} color="text.secondary">
                      {t("site.betterHomes")}
                    </RouterLink>
                    <Divider orientation="vertical" h="25px" mx={4} borderColor="text.secondary" />
                    <RouterLink to={t("site.footerLinks.disclaimer")} color="text.secondary">
                      {t("site.disclaimer")}
                    </RouterLink>
                    <Divider orientation="vertical" h="25px" mx={4} borderColor="text.secondary" />
                    <RouterLink to={t("site.footerLinks.accessibility")} color="text.secondary">
                      {t("site.accessibility")}
                    </RouterLink>
                    <Divider orientation="vertical" h="25px" mx={4} borderColor="text.secondary" />
                    <RouterLink to={t("site.footerLinks.copyright")} color="text.secondary">
                      {t("site.copyright")}
                    </RouterLink>
                    <Divider orientation="vertical" h="25px" mx={4} borderColor="text.secondary" />
                    <RouterLink to={t("site.footerLinks.dataAndPrivacy")} color="text.secondary">
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
