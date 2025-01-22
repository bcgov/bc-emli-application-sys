import { Alert, AlertDescription, AlertTitle, Button, IconButton, Stack } from "@chakra-ui/react"
import { CheckCircle } from "@phosphor-icons/react"
import React from "react"
import { useTranslation } from "react-i18next"

function SuccessAlert() {
  const { t } = useTranslation()

  const handleReload = () => {
    window.location.href = "/login?showContractor=false"
  }
  return (
    <Stack
      p={4}
      mt={4}
      bg="semantic.successLight"
      border="1px"
      borderColor="success"
      borderRadius="lg"
      width="100%"
      align="stretch"
    >
      <Alert status="success" variant="subtle" bg="transparent" alignItems="start" p={0}>
        <IconButton variant="ghost" icon={<CheckCircle size={26} color="green" />} zIndex={1} aria-label="Check" />
        <Stack>
          <AlertTitle fontSize="md" fontWeight="bold">
            {t("auth.checkEligibility.alert.eligible")}
          </AlertTitle>
          <Button size="sm" variant="secondary" onClick={handleReload}>
            {t("auth.checkEligibility.alert.loginWithAccount")}
          </Button>
        </Stack>
      </Alert>
    </Stack>
  )
}

export default SuccessAlert
