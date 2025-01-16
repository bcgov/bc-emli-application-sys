import { Box, Button, Flex, Heading, Link, Text, VStack } from "@chakra-ui/react"
import { t } from "i18next"
import React from "react"

export function ContractorInfoBlock() {
  return (
    <Flex
      direction="column"
      gap={6}
      flex={1}
      p={10}
      border="solid 1px"
      borderColor="border.light"
      bg="greys.white"
      w={{ md: "500px" }}
    >
      <VStack spacing={2} align="start">
        <Heading as="h1" mb={0} color="theme.blueAlt">
          {t("auth.bceidInfo.contractor.title")}
        </Heading>
        {/* <Text fontSize="md">{t("auth.bceidInfo.contractor.description")}</Text> */}
      </VStack>
      {/* <RouterLinkButton to="/" w="full" bg="theme.blue" color="white" rightIcon={<ArrowSquareOut size={16} />}>
        {t("auth.bceidInfo.contractor.ctaText")}
      </RouterLinkButton> */}
      <form action="/api/auth/keycloak" method="post">
        <input type="hidden" name="kc_idp_hint" value="bceidbusiness" />
        {/* @ts-ignore */}
        <input type="hidden" name="authenticity_token" value={document.querySelector("[name=csrf-token]").content} />
        <Button variant="primary" w="full" type="submit">
          {t("auth.bceidInfo.contractor.ctaText")}
        </Button>
      </form>
      <Box>
        <Text fontWeight="bold">{t("auth.noAccount")}</Text>
        <Text></Text>
        <Text>
          <Link href={t("auth.bcServiceCardInfo.learnMoreLink")} color="text.primary" isExternal>
            {t("auth.bceidInfo.contractor.learnMore")}{" "}
          </Link>
          {t("auth.bceidInfo.contractor.setupAccount")}
        </Text>
      </Box>
    </Flex>
  )
}
