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
} from '@chakra-ui/react';
import { Info, Warning } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React, { useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMst } from '../../../setup/root';
import { EmailFormControl } from '../../shared/form/email-form-control';
import { TextFormControl } from '../../shared/form/input-form-control';
import CustomAlert, { InformationAlert } from '../../shared/base/custom-alert';
import { useCurrentUserLicenseAgreements } from '../../../hooks/resources/user-license-agreements';
import { format } from 'date-fns';

interface IProfileScreenProps {}

// eslint-disable-next-line no-empty-pattern
export const ProfileScreen = observer(({}: IProfileScreenProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const currentPath = location.pathname;

  const [isEditingEmail, setIsEditingEmail] = useState(false);

  const { userStore } = useMst();
  const { currentUser, updateProfile } = userStore;

  const { error, licenseAgreements, isLoading, currentEula } = useCurrentUserLicenseAgreements();
  let acceptedLicenseAgreement = null;
  useMemo(() => {
    acceptedLicenseAgreement = licenseAgreements?.find((la) => la.agreement?.id === currentEula?.id);
  }, [isLoading]);

  const [sameAddressChecked, setSameAddressChecked] = useState(currentUser.isSameAddress);

  const confirmationRequired =
    currentUser.unconfirmedEmail || (currentUser.isUnconfirmed && currentUser.confirmationSentAt);

  // Function to get defaults
  const getDefaults = () => {
    const { firstName, lastName, organization, preference, email, physicalAddress, mailingAddress } = currentUser;
    return {
      firstName,
      lastName,
      certified: true,
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
      reviewed: true,
    };
  };
  const formMethods = useForm({
    mode: 'onSubmit',
    defaultValues: getDefaults(),
  });
  const [formValues, setFormValues] = useState(getDefaults());
  const { handleSubmit, reset, formState } = formMethods;
  const { isSubmitting, errors } = formState;

  const navigate = useNavigate();
  const onSubmit = async (formData) => {
    console.log(formData);
    await updateProfile(formData);
    setIsEditingEmail(false);
    reset(getDefaults());
    navigate('/');
  };

  const handleResendConfirmationEmail = async () => {
    await currentUser.resendConfirmation();
  };

  // Handle checkbox change to sync physical address with postal address
  const handleCheckboxChange = (event) => {
    const checked = event.target.checked;
    setSameAddressChecked(checked);
    setFormValues((prevValues) => ({
      ...prevValues,
      ...(checked && {
        postalAddress: prevValues.address,
        postalAddressCity: prevValues.city,
        postalAddressProvince: prevValues.province,
        postalAddressPostalcode: prevValues.postalCode,
        postalAddressCountry: prevValues.country,
      }),
      // If unchecked, reset postal address fields
      ...(!checked && {
        postalAddress: '',
        postalAddressCity: '',
        postalAddressProvince: '',
        postalAddressPostalcode: '',
        postalAddressCountry: '',
      }),
    }));
  };

  return (
    <Container maxW="container.sm" p={8} as="main">
      <Flex mb={6}> {Object.keys(errors).length > 0 && <CustomAlert description={t('ui.correctFields')} />} </Flex>
      <FormProvider {...formMethods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Flex as="section" direction="column" w="full" gap={6}>
            <Heading as="h1" m={0} color="theme.blueAlt">
              {currentPath === '/profile' ? 'My account' : <>{t('user.accountCreation')}</>}
            </Heading>
            <Section>
              <Flex gap={{ base: 4, md: 6 }} direction={{ base: 'column', md: 'row' }}>
                <TextFormControl
                  label={t('user.firstName')}
                  fieldName="firstName"
                  required
                  disabled={true}
                  value={formValues.firstName}
                  onChange={(e) => setFormValues({ ...formValues, firstName: e.target.value })}
                />
                <TextFormControl
                  label={t('user.lastName')}
                  fieldName="lastName"
                  required
                  disabled={true}
                  value={formValues.lastName}
                  onChange={(e) => setFormValues({ ...formValues, lastName: e.target.value })}
                />
              </Flex>
              {currentUser.isParticipant && !currentUser.isBasicBCEID ? (
                <>
                  <PhysicalAddressBlock formValues={formValues} />
                  <Checkbox isChecked={sameAddressChecked} onChange={handleCheckboxChange}>
                    {t('user.sameAddress')}
                  </Checkbox>
                  <InformationAlert
                    description={t('user.changeBcsc.info')}
                    descLinkHref={t('user.changeBcsc.link')}
                    descLinkText={t('user.changeBcsc.linkText')}
                  />
                </>
              ) : null}
              {currentUser.isParticipant && !currentUser.isBasicBCEID && !sameAddressChecked ? (
                <MailingAddressBlock
                  sameAddressChecked={sameAddressChecked}
                  formValues={formValues}
                  setFormValues={setFormValues}
                />
              ) : null}
              {currentUser.isParticipant && currentUser.isBasicBCEID ? (
                <InformationAlert
                  description={t('user.changeBasic.info')}
                  descLinkHref={t('user.changeBasic.link')}
                  descLinkText={t('user.changeBasic.linkText')}
                />
              ) : null}
              {currentUser.isUnconfirmed && !currentUser.confirmationSentAt ? (
                <EmailFormControl fieldName="email" label={t('user.emailAddress')} showIcon required />
              ) : (
                <>
                  {currentUser.unconfirmedEmail ? (
                    <EmailFormControl
                      label={t('user.emailAddress')}
                      showOptional={false}
                      required
                      showIcon
                      inputProps={{
                        isDisabled: true,
                        value: currentUser.unconfirmedEmail,
                        paddingRight: '98.23px',
                        _disabled: {
                          color: 'text.primary',
                          bg: 'greys.grey04',
                          borderColor: 'border.light',
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
                            {t('ui.unverified')}
                          </Flex>
                        </InputRightElement>
                      }
                    />
                  ) : (
                    <EmailFormControl
                      label={t('user.emailAddress')}
                      showIcon
                      showOptional={false}
                      inputProps={{
                        isDisabled: true,
                        value: currentUser.email,
                        paddingRight: '82.35px',
                        _disabled: {
                          color: 'text.primary',
                          bg: 'greys.grey04',
                          borderColor: 'border.light',
                        },
                      }}
                      inputRightElement={
                        <InputRightElement pointerEvents="none" width="auto" px={2}>
                          <Tag
                            variant="outline"
                            color="text.primary"
                            bg="green.50"
                            rounded="xs"
                            sx={{
                              '--badge-color': 'var(--chakra-colors-semantic-success)',
                            }}
                          >
                            <TagLabel>{t('ui.verified')}</TagLabel>
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

                  {!(currentUser.isIDIR || currentUser.isBusBCEID) &&
                    (isEditingEmail ? (
                      <>
                        <Divider my={4} />
                        <EmailFormControl showIcon label={t('user.newEmail')} fieldName="email" showOptional={false} />
                      </>
                    ) : (
                      <Button
                        variant="link"
                        onClick={() => {
                          setIsEditingEmail(true);
                        }}
                      >
                        {t('user.changeEmail')}
                      </Button>
                    ))}
                </>
              )}
              {currentUser.isBusBCEID ? (
                <InformationAlert
                  description={t('user.changeBceid.info')}
                  descLinkHref={t('user.changeBceid.link')}
                  descLinkText={t('user.changeBceid.linkText')}
                />
              ) : null}
              {currentUser.isIDIR ? (
                <InformationAlert
                  description={t('user.changeIdir.info')}
                  descLinkHref={t('user.changeIdir.link')}
                  descLinkText={t('user.changeIdir.linkText')}
                />
              ) : null}
            </Section>
            <Section>
              <Flex alignItems="center" alignSelf="stretch">
                <Flex direction="column" flex={1}>
                  <Text fontWeight={'bold'}>{t('user.termsandConditions')}</Text>
                  <Text color="text.secondary" pr={4}>
                    {acceptedLicenseAgreement
                      ? t('user.acceptedConditions', {
                          date: format(acceptedLicenseAgreement.acceptedAt, 'MMM dd, yyy'),
                          time: format(acceptedLicenseAgreement.acceptedAt, 'hh:mm'),
                        })
                      : null}
                  </Text>
                </Flex>
                <Flex>
                  <Button variant="secondary"> {t('ui.view')}</Button>
                </Flex>
              </Flex>
            </Section>
            <Flex as="section" gap={4} mt={4}>
              <Button variant="primary" type="submit" isLoading={isSubmitting} loadingText={t('ui.loading')}>
                {currentPath === '/profile' ? <>{t('ui.save')}</> : <>{t('ui.createAccount')}</>}
              </Button>
              {currentUser.isUnconfirmed && (
                <Button variant="secondary" isDisabled={isSubmitting} onClick={() => navigate(-1)}>
                  {t('ui.cancel')}
                </Button>
              )}
            </Flex>
          </Flex>
        </form>
      </FormProvider>
    </Container>
  );
});

function Section({ children }) {
  return (
    <Flex as="section" direction="column" gap={4} w="full" p={6} borderWidth={1} borderColor="border.light">
      {children}
    </Flex>
  );
}

const PhysicalAddressBlock = ({ formValues }) => {
  const { t } = useTranslation();

  return (
    <>
      <TextFormControl
        disabled={true}
        label={t('user.address')}
        fieldName="streetAddressAttributes.streetAddress"
        value={formValues.address}
        showOptional={false}
      />
      <TextFormControl
        disabled={true}
        label={t('user.city')}
        fieldName="streetAddressAttributes.locality"
        value={formValues.city}
        required={false}
        showOptional={false}
      />
      <TextFormControl
        disabled={true}
        label={t('user.province')}
        fieldName="streetAddressAttributes.region"
        value={formValues.province}
        showOptional={false}
      />
      <TextFormControl
        disabled={true}
        label={t('user.postalCode')}
        fieldName="streetAddressAttributes.postalCode"
        value={formValues.postalCode}
        showOptional={false}
      />
      <TextFormControl
        disabled={true}
        label={t('user.country')}
        fieldName="streetAddressAttributes.country"
        value={formValues.country}
        showOptional={false}
      />
    </>
  );
};

const MailingAddressBlock = ({ formValues, setFormValues, sameAddressChecked }) => {
  const { t } = useTranslation();

  return (
    <>
      <Text fontSize="md" fontWeight="bold">
        {t('user.postalAddress')}
      </Text>
      <TextFormControl
        label={t('user.mailingAdress')}
        fieldName="mailingAddressAttributes.streetAddress"
        value={sameAddressChecked ? formValues.address : formValues.postalAddress}
        onChange={(e) => setFormValues({ ...formValues, postalAddress: e.target.value })}
        showOptional={false}
      />
      <TextFormControl
        label={t('user.city')}
        fieldName="mailingAddressAttributes.locality"
        value={sameAddressChecked ? formValues.city : formValues.postalAddressCity}
        onChange={(e) => setFormValues({ ...formValues, postalAddressCity: e.target.value })}
        showOptional={false}
      />
      <TextFormControl
        label={t('user.province')}
        fieldName="mailingAddressAttributes.region"
        value={sameAddressChecked ? formValues.province : formValues.postalAddressProvince}
        onChange={(e) => setFormValues({ ...formValues, postalAddressProvince: e.target.value })}
        showOptional={false}
      />
      <TextFormControl
        label={t('user.postalCode')}
        fieldName="mailingAddressAttributes.postalCode"
        value={sameAddressChecked ? formValues.postalCode : formValues.postalAddressPostalcode}
        onChange={(e) => setFormValues({ ...formValues, postalAddressPostalcode: e.target.value })}
        showOptional={false}
      />
      <TextFormControl
        label={t('user.country')}
        fieldName="mailingAddressAttributes.country"
        value={sameAddressChecked ? formValues.country : formValues.postalAddressCountry}
        onChange={(e) => setFormValues({ ...formValues, postalAddressCountry: e.target.value })}
        showOptional={false}
      />
    </>
  );
};
