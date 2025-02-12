import {
  Alert,
  Button,
  Checkbox,
  Container,
  Divider,
  Flex,
  Heading,
  InputGroup,
  InputRightElement,
  Select,
  Tag,
  TagLabel,
  Text,
} from "@chakra-ui/react"
import { Info, Warning } from "@phosphor-icons/react"
import { observer } from "mobx-react-lite"
import React, { useState } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { useLocation, useNavigate } from "react-router-dom"
import { useMst } from "../../../setup/root"
import { EUserRoles } from "../../../types/enums"
import { EmailFormControl } from "../../shared/form/email-form-control"
import { TextFormControl } from "../../shared/form/input-form-control"
import CustomAlert from "../../shared/base/custom-alert"

interface IProfileScreenProps {}

export const ProfileScreen = observer(({}: IProfileScreenProps) => {
  const { t } = useTranslation()
  const location = useLocation()
  const currentPath = location.pathname

  const [isEditingEmail, setIsEditingEmail] = useState(false)

  const { userStore } = useMst()
  const { currentUser, updateProfile } = userStore

  const confirmationRequired =
    currentUser.unconfirmedEmail || (currentUser.isUnconfirmed && currentUser.confirmationSentAt)

  // Function to get defaults
  const getDefaults = () => {
    const {
      firstName,
      lastName,
      certified,
      organization,
      preference,
      email,
      physicalAddress,
      mailingAddress,
      city,
      province,
      postalCode,
      country,
    } = currentUser
    return {
      firstName,
      lastName,
      certified,
      organization,
      preferenceAttributes: preference,
      email,
      address: physicalAddress?.streetAddress,
      city: physicalAddress?.locality,
      province: physicalAddress?.region,
      postalCode: physicalAddress?.postalCode,
      country: physicalAddress?.country,
      postalAddress: mailingAddress?.streetAddress,
      postalAddressCity: mailingAddress?.locality,
      postalAddressProvince: mailingAddress?.region,
      postalAddressPostalcode: mailingAddress?.postalCode,
      postalAddressCountry: mailingAddress?.country,
      isSameAddress: false,
    }
  }
  const formMethods = useForm({
    mode: "onSubmit",
    defaultValues: getDefaults(),
  })
  const [formValues, setFormValues] = useState(getDefaults())
  const [isSameAddress, setIsSameAddress] = useState(false)
  const { handleSubmit, register, reset, formState } = formMethods
  const { isSubmitting, errors } = formState

  const navigate = useNavigate()
  const onSubmit = async (formData) => {
    console.log(formData);
    await updateProfile(formData)
    setIsEditingEmail(false)
    reset(getDefaults())
  }

  const handleResendConfirmationEmail = async () => {
    await currentUser.resendConfirmation()
  }

  // Handle checkbox change to sync physical address with postal address
  const handleCheckboxChange = (event) => {
    const checked = event.target.checked
    setFormValues((prevValues) => ({
      ...prevValues,
      isSameAddress: checked,
      ...(checked && {
        postalAddress: prevValues.address,
        postalAddressCity: prevValues.city,
        postalAddressProvince: prevValues.province,
        postalAddressPostalcode: prevValues.postalCode,
        postalAddressCountry: prevValues.country,
      }),
      // If unchecked, reset postal address fields
      ...(!checked && {
        postalAddress: "",
        postalAddressCity: "",
        postalAddressProvince: "",
        postalAddressPostalcode: "",
        postalAddressCountry: "",
      }),
    }))
  }
  
  return (
    <Container maxW="container.sm" p={8} as="main">
      <Flex mb={6}> {Object.keys(errors).length > 0 && <CustomAlert description={t("ui.correctFields")} />} </Flex>
      <FormProvider {...formMethods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Flex as="section" direction="column" w="full" gap={6}>
            <Heading as="h1" m={0} color="theme.blueAlt">
              {currentPath === "/profile" ? "My account" : <>{t("user.accountCreation")}</>}
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
                <TextFormControl
                  label={t("user.firstName")}
                  fieldName="firstName"
                  required
                  disabled={true}
                  value={formValues.firstName}
                  onChange={(e) => setFormValues({ ...formValues, firstName: e.target.value })}
                />
                <TextFormControl
                  label={t("user.lastName")}
                  fieldName="lastName"
                  required
                  disabled={true}
                  value={formValues.lastName}
                  onChange={(e) => setFormValues({ ...formValues, lastName: e.target.value })}
                />
              </Flex>
              <TextFormControl
                label={t("user.address")}
                fieldName="streetAddressAttributes.streetAddress"
                required
                value={formValues.address}
                onChange={(e) => setFormValues({ ...formValues, address: e.target.value })}
              />
              <TextFormControl
                label={t("user.city")}
                fieldName="streetAddressAttributes.locality"
                required
                value={formValues.city}
                onChange={(e) => setFormValues({ ...formValues, city: e.target.value })}
              />
              <TextFormControl
                label={t("user.province")}
                fieldName="streetAddressAttributes.region"
                required
                value={formValues.province}
                onChange={(e) => setFormValues({ ...formValues, province: e.target.value })}
              />
              <TextFormControl
                label={t("user.postalCode")}
                fieldName="streetAddressAttributes.postalCode"
                required
                value={formValues.postalCode}
                onChange={(e) => setFormValues({ ...formValues, postalCode: e.target.value })}
              />
              <TextFormControl
                label={t("user.country")}
                fieldName="streetAddressAttributes.country"
                required
                value={formValues.country}
                onChange={(e) => setFormValues({ ...formValues, country: e.target.value })}
              />
              <Checkbox checked={isSameAddress} onChange={handleCheckboxChange}>
                {t("user.sameAddress")}
              </Checkbox>
              <CustomAlert
                description={t("user.changeInfo")}
                descLinkHref={t("user.changeInfoLink")}
                descLinkText={t("user.bceid")}
                icon={<Info />}
                iconColor="theme.darkBlue"
                borderColor="theme.darkBlue"
                backgroundColor="greys.offWhite"
              />
              <Text fontSize="md" fontWeight="bold">
                {t("user.postalAddress")}
              </Text>
              <TextFormControl
                label={t("user.address")}
                fieldName="mailingAddressAttributes.streetAddress"
                required
                value={formValues.isSameAddress ? formValues.address : formValues.postalAddress}
                onChange={(e) => setFormValues({ ...formValues, postalAddress: e.target.value })}
              />
              <TextFormControl
                label={t("user.city")}
                fieldName="mailingAddressAttributes.locality"
                required
                value={formValues.isSameAddress ? formValues.city : formValues.postalAddressCity}
                onChange={(e) => setFormValues({ ...formValues, postalAddressCity: e.target.value })}
              />
              <TextFormControl
                label={t("user.province")}
                fieldName="mailingAddressAttributes.region"
                required
                value={formValues.isSameAddress ? formValues.province : formValues.postalAddressProvince}
                onChange={(e) => setFormValues({ ...formValues, postalAddressProvince: e.target.value })}
              />
              <TextFormControl
                label={t("user.postalCode")}
                fieldName="mailingAddressAttributes.postalCode"
                required
                value={formValues.isSameAddress ? formValues.postalCode : formValues.postalAddressPostalcode}
                onChange={(e) => setFormValues({ ...formValues, postalAddressPostalcode: e.target.value })}
              />
              <TextFormControl
                label={t("user.country")}
                fieldName="mailingAddressAttributes.country"
                required
                value={formValues.isSameAddress ? formValues.country : formValues.postalAddressCountry}
                onChange={(e) => setFormValues({ ...formValues, postalAddressCountry: e.target.value })}
              />
              {currentUser.isUnconfirmed && !currentUser.confirmationSentAt ? (
                <EmailFormControl fieldName="email" label={t("user.emailAddress")} showIcon required />
              ) : (
                <>
                  {currentUser.unconfirmedEmail ? (
                    <EmailFormControl
                      label={t("user.emailAddress")}
                      showOptional={false}
                      required
                      showIcon
                      inputProps={{
                        isDisabled: true,
                        value: currentUser.unconfirmedEmail,
                        paddingRight: "98.23px",
                        _disabled: {
                          color: "text.primary",
                          bg: "greys.grey04",
                          borderColor: "border.light",
                        },
                      }}
                      inputRightElement={
                        <InputRightElement pointerEvents="none" width="auto" px={2}>
                          <Flex
                            color="text.primary"
                            borderColor="semantic.warning"
                            borderWidth={1}
                            bg="semantic.warningLight"
                            rounded="xs"
                            px={1.5}
                            py={0.5}
                            fontSize="sm"
                          >
                            {t("ui.unverified")}
                          </Flex>
                        </InputRightElement>
                      }
                    />
                  ) : (
                    <EmailFormControl
                      label={t("user.emailAddress")}
                      showIcon
                      showOptional={false}
                      inputProps={{
                        isDisabled: true,
                        value: currentUser.email,
                        paddingRight: "82.35px",
                        _disabled: {
                          color: "text.primary",
                          bg: "greys.grey04",
                          borderColor: "border.light",
                        },
                      }}
                      inputRightElement={
                        <InputRightElement pointerEvents="none" width="auto" px={2}>
                          <Tag
                            variant="outline"
                            color="text.primary"
                            borderColor="semantic.success"
                            bg="theme.green.100"
                            rounded="xs"
                          >
                            <TagLabel>{t("ui.verified")}</TagLabel>
                          </Tag>
                        </InputRightElement>
                      }
                    />
                  )}

                  {confirmationRequired && (
                    <Alert
                      status="warning"
                      borderRadius="sm"
                      gap={1.5}
                      borderWidth={1}
                      borderColor="semantic.warning"
                      px={2}
                      py={1.5}
                      fontSize="sm"
                    >
                      <Flex>
                        <Warning color="var(--chakra-colors-semantic-warning)" fontSize={27} />
                        <Text fontSize="md" ml={2}>
                          {currentUser.unconfirmedEmail && !currentUser.isUnconfirmed ? (
                            <Trans
                              i18nKey="user.confirmationRequiredWithEmail"
                              values={{ email: currentUser.email }}
                              components={{
                                1: <Button variant="link" onClick={handleResendConfirmationEmail} />,
                              }}
                            />
                          ) : (
                            <Trans
                              i18nKey="user.confirmationRequired"
                              components={{
                                1: <Button variant="link" onClick={handleResendConfirmationEmail} />,
                              }}
                            />
                          )}
                        </Text>
                      </Flex>
                    </Alert>
                  )}
                  {isEditingEmail ? (
                    <>
                      <Divider my={4} />
                      <EmailFormControl showIcon label={t("user.newEmail")} fieldName="email" showOptional={false} />
                    </>
                  ) : (
                    <Button
                      variant="link"
                      onClick={() => {
                        setIsEditingEmail(true)
                      }}
                    >
                      {t("user.changeEmail")}
                    </Button>
                  )}
                </>
              )}
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
                  <Button variant="secondary"> {t("ui.view")}</Button>
                </Flex>
              </Flex>
            </Section>
            <Flex as="section" gap={4} mt={4}>
              <Button variant="primary" type="submit" isLoading={isSubmitting} loadingText={t("ui.loading")}>
                {currentPath === "/profile" ? <>{t("ui.save")}</> : <>{t("ui.createAccount")}</>}
              </Button>
              {currentUser.isUnconfirmed && (
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
