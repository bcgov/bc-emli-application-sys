import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Flex,
  FormControl,
  FormErrorMessage,
  Radio,
  RadioGroup,
  Stack,
  Text,
  VisuallyHidden,
} from '@chakra-ui/react';
import { useMst } from '../../../setup/root';
import { usePermitClassificationsLoad } from '../../../hooks/resources/use-permit-classifications-load';
import { BlueTitleBar } from '../../shared/base/blue-title-bar';
import { EPermitClassificationCode } from '../../../types/enums';

export const NewInvoiceScreen = observer(() => {
  const { t } = useTranslation();
  const { permitApplicationStore, permitClassificationStore, userStore } = useMst();
  const navigate = useNavigate();

  usePermitClassificationsLoad();

  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showError, setShowError] = useState(false);

  const currentUser = userStore.currentUser;

  // Redirect if contractor is suspended (works for contractors AND employees)
  React.useEffect(() => {
    if (currentUser?.contractorSuspended) {
      navigate('/contractor-dashboard');
    }
  }, [currentUser, navigate]);

  const invoiceSubmissionTypeId = permitClassificationStore.getSubmissionTypeIdByCode(
    EPermitClassificationCode.invoice,
  );

  const invoiceVariants = invoiceSubmissionTypeId
    ? permitClassificationStore.getSubmissionVariantsForType(invoiceSubmissionTypeId)
    : [];

  const handleSelectionChange = (value: string) => {
    setSelectedVariantId(value);
    setShowError(false);
  };

  const handleNext = async () => {
    if (!selectedVariantId) {
      setShowError(true);
      return;
    }

    setIsCreating(true);

    const selectedVariant = invoiceVariants.find((v) => v.id === selectedVariantId);

    const permitApplicationId = await permitApplicationStore.createEnergyApplication({
      user_id: userStore.currentUser.id,
      user_group_type: EPermitClassificationCode.contractor,
      audience_type: EPermitClassificationCode.external,
      submission_type: EPermitClassificationCode.invoice,
      slug: 'energy-savings-program',
      submission_variant_id: selectedVariantId,
      nickname: selectedVariant?.name,
    });

    if (permitApplicationId) {
      navigate(`/applications/${permitApplicationId}/edit`);
    } else {
      setIsCreating(false);
    }
  };

  return (
    <Flex as="main" id="main-content" direction="column" w="full" bg="greys.white" pb={16} minH="100vh" tabIndex={-1}>
      <BlueTitleBar title={t('invoices.selection.pageTitle', 'Select an invoice type')} />

      <Container maxW="container.lg" pt={12}>
        <FormControl isInvalid={showError}>
          <RadioGroup
            value={selectedVariantId}
            onChange={handleSelectionChange}
            aria-describedby={showError ? 'invoice-type-error' : undefined}
          >
            <Stack as="fieldset" spacing={4} border="none" p={0} m={0}>
              <VisuallyHidden as="legend">{t('invoices.selection.pageTitle', 'Select an invoice type')}</VisuallyHidden>

              {invoiceVariants.length === 0 ? (
                <Text color="greys.homeScreenGrey" py={4}>
                  {t('invoices.selection.noInvoicesFound', 'No invoices found')}
                </Text>
              ) : (
                invoiceVariants.map((variant) => (
                  <Box
                    key={variant.id}
                    onClick={() => handleSelectionChange(variant.id)}
                    cursor="pointer"
                    p={4}
                    border="1px solid"
                    borderColor={selectedVariantId === variant.id ? 'theme.blue' : 'border.homeScreenBorderColor'}
                    borderRadius="4px"
                    bg={selectedVariantId === variant.id ? 'theme.blueLight02' : 'white'}
                    _hover={{ borderColor: 'theme.blue', bg: 'greys.grey04' }}
                    _focusWithin={{ outline: '2px solid', outlineColor: 'theme.blue', outlineOffset: '2px' }}
                    transition="all 0.2s"
                  >
                    <Radio
                      value={variant.id}
                      size="lg"
                      sx={{
                        '& .chakra-radio__label': {
                          fontWeight: '700',
                          fontSize: 'xl',
                          lineHeight: '34px',
                          color: 'greys.homeScreenGrey',
                          width: '100%',
                        },
                      }}
                    >
                      {variant.name}
                    </Radio>
                  </Box>
                ))
              )}
            </Stack>
          </RadioGroup>

          {showError && (
            <FormErrorMessage id="invoice-type-error" role="alert" mt={4} fontSize="xl">
              {t('invoices.selection.errorNoSelection', 'Please select an invoice type before continuing.')}
            </FormErrorMessage>
          )}

          <Flex justify="flex-end" gap={6} pt={8}>
            <Button
              variant="primary"
              onClick={handleNext}
              isLoading={isCreating}
              loadingText={t('ui.loading', 'Loading...')}
              minW="155px"
            >
              {t('ui.next', 'Next')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/contractor-dashboard')}
              isDisabled={isCreating}
              minW="155px"
            >
              {t('ui.back', 'Back')}
            </Button>
          </Flex>
        </FormControl>
      </Container>
    </Flex>
  );
});
