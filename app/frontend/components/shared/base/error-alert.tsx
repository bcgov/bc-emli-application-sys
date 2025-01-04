import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  IconButton,
  Link,
  ListItem,
  Stack,
  Text,
  UnorderedList,
} from "@chakra-ui/react"
import { ArrowSquareOut, WarningCircle } from "@phosphor-icons/react"
import React from "react"
import { useTranslation } from "react-i18next"

function ErrorAlert() {
  const { t } = useTranslation()
  let homes: string[] = t("auth.checkEligibility.alert.typesOfhome", { returnObjects: true })

  return (
    <Stack
      p={4}
      mt={4}
      bg="semantic.errorLight"
      border="1px"
      borderColor="error"
      borderRadius="lg"
      width="100%"
      align="stretch"
    >
      <Alert status="success" variant="subtle" bg="transparent" alignItems="start" p={0}>
        <IconButton variant="ghost" icon={<WarningCircle size={20} />} zIndex={1} color="error" aria-label="Check" />
        <Stack mt={2}>
          <AlertTitle fontSize="md" fontWeight="bold">
            {t("auth.checkEligibility.alert.condoEligible")}
          </AlertTitle>
          <AlertDescription fontSize="sm">
            <Box>
              <Text fontSize="sm" mb={2}>
                {t("auth.checkEligibility.alert.currentlyEligibleHome")}
              </Text>
              <UnorderedList fontSize="sm" spacing={1}>
                {homes.map((home, index) => (
                  <ListItem key={index}>{home}</ListItem>
                ))}
              </UnorderedList>
            </Box>
          </AlertDescription>
          <Link href="" isExternal>
            <Text color="text.secondary">
              {t("auth.checkEligibility.alert.seeDetails")} <ArrowSquareOut />
            </Text>
          </Link>
        </Stack>
      </Alert>
    </Stack>
  )
}

export default ErrorAlert
