import { Button, Container, Flex, Heading, InputGroup, Select, Switch, Td, Text, Tr } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { Controller, FormProvider, useForm, useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useMst } from "../../../setup/root"
import { EUserRoles } from "../../../types/enums"
import ErrorAlert from "../../shared/base/error-alert"
import { EmailFormControl } from "../../shared/form/email-form-control"
import { TextFormControl } from "../../shared/form/input-form-control"

interface IProfileScreenProps {}

export const ProfileScreen = observer(({}: IProfileScreenProps) => {
  const { t } = useTranslation()
  const required: string = t("user.required")

  const [isEditingEmail, setIsEditingEmail] = useState(false)

  const { userStore } = useMst()
  const { currentUser, updateProfile } = userStore

  const confirmationRequired =
    currentUser.unconfirmedEmail || (currentUser.isUnconfirmed && currentUser.confirmationSentAt)

  const getDefaults = () => {
    const { firstName, lastName, nickname, certified, organization, preference, email, address } = currentUser
    return {
      firstName,
      lastName,
      certified,
      organization,
      preferenceAttributes: preference,
      email,
      address,
    }
  }
  const formMethods = useForm({
    mode: "onSubmit",
    defaultValues: getDefaults(),
  })
  const { handleSubmit, formState, control, reset, setValue } = formMethods
  const { isSubmitting, errors } = formState

  const navigate = useNavigate()

  const onSubmit = async (formData) => {
    await updateProfile(formData)
    setIsEditingEmail(false)
    reset(getDefaults())
  }

  // Remember: Need to check if Confirmation Email functionality still required
  const handleResendConfirmationEmail = async () => {
    await currentUser.resendConfirmation()
  }

  // Check if email is required but empty
  const isEmailRequiredError = errors?.email && errors.email.type === required

  return (
    <Container maxW="container.sm" p={8} as="main">
      <FormProvider {...formMethods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Flex as="section" direction="column" w="full" gap={6}>
            <Heading as="h1" m={0} color="theme.blueAlt">
              {t("user.accountCreation")}
            </Heading>
            {/*Remember: Need to confirm if it is still required */}
            {!currentUser.isSubmitter && (
              <InputGroup>
                <Flex direction="column" w="full">
                  <Select
                    disabled
                    defaultValue={currentUser.role}
                    w={{ base: "100%", md: "50%" }}
                    textTransform="capitalize"
                  >
                    <option value={currentUser.role}>{t(`user.roles.${currentUser.role as EUserRoles}`)}</option>
                  </Select>
                </Flex>
              </InputGroup>
            )}

            <Section>
              <Flex gap={{ base: 4, md: 6 }} direction={{ base: "column", md: "row" }}>
                <TextFormControl label={t("user.firstName")} fieldName="firstName" required />
                <TextFormControl label={t("user.lastName")} fieldName="lastName" required />
              </Flex>
              <TextFormControl label={t("user.address")} fieldName="address" required />
              <EmailFormControl fieldName="email" label={t("user.emailAddress")} showIcon required />
            </Section>
            <Section>
              <Flex alignItems="center" alignSelf="stretch">
                <Flex direction="column" flex={1}>
                  <Text fontWeight={"bold"}>{t("user.termsandConditions")}</Text>
                  <Text color="text.secondary" pr={4}>
                    {/* Remember: To append date on which terms and conditions accepted */}
                    {t("user.acceptedConditions")}
                  </Text>
                </Flex>
                <Flex>
                  <Button variant="secondary">View</Button>
                </Flex>
              </Flex>
            </Section>
            {/* Conditional rendering of ErrorAlert when email is required but empty */}
            {isEmailRequiredError && <ErrorAlert description={t("user.emailValidationError")} />}
            <Flex as="section" gap={4} mt={4}>
              <Button variant="primary" type="submit" isLoading={isSubmitting} loadingText={t("ui.loading")}>
                {t("ui.createAccount")}
              </Button>
              {!currentUser.isUnconfirmed && (
                <Button variant="secondary" isDisabled={isSubmitting} onClick={() => navigate(-1)}>
                  {t("ui.cancel")}
                </Button>
              )}
            </Flex>
          </Flex>
        </form>
      </FormProvider>
    </Container>
  )
})

function Section({ children }) {
  return (
    <Flex as="section" direction="column" gap={4} w="full" p={6} borderWidth={1} borderColor="border.light">
      {children}
    </Flex>
  )
}
