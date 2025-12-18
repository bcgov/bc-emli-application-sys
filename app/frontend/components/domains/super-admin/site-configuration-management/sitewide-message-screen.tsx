import {
  Box,
  Button,
  Container,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Switch,
  VStack,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMst } from '../../../../setup/root';
import { TSiteWideMessageConfiguration } from '../../../../types/types';
import { TextFormControl } from '../../../shared/form/input-form-control';
import { SectionBox } from '../../home/section-box';
import { GlobalConfirmationModal } from '../../../shared/modals/global-confirmation-modal';

export const SitewideMessageScreen = observer(function SitewideMessageScreen() {
  const { siteConfigurationStore } = useMst();
  const {
    displaySitewideMessage,
    sitewideMessageColor,
    sitewideMessage,
    updateSiteConfiguration,
    configurationLoaded,
  } = siteConfigurationStore;
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getFormDefaults = () => {
    return {
      displaySitewideMessage,
      sitewideMessage,
      sitewideMessageColor,
    };
  };
  const formMethods = useForm<TSiteWideMessageConfiguration>({
    mode: 'onChange',
    defaultValues: getFormDefaults(),
  });

  useEffect(() => {
    reset(getFormDefaults());
  }, [configurationLoaded]);

  const { handleSubmit, formState, control, reset } = formMethods;
  const { isSubmitting } = formState;
  const [currentDisplayValue, setCurrentDisplayValue] = useState(displaySitewideMessage);

  const { isOpen, onOpen, onClose } = useDisclosure(); // Chakra UI hook for modal state

  const onSubmit = async (formData) => {
    await updateSiteConfiguration(formData);
    onClose(); // Close the modal after saving
  };

  return (
    <Container maxW="container.lg" py={8} px={{ base: 8, xl: 8 }} flexGrow={1} as="main">
      <Heading mb={0} fontSize="3xl" color="theme.blueAlt">
        {t('siteConfiguration.sitewideMessage.title')}
      </Heading>
      <FormProvider {...formMethods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Flex mt={8} direction="row" gap={32} align="flex-start">
            {/* Site-wide Message Settings Heading */}
            <Box minW="fit-content">
              <Heading as="h3" noOfLines={1}>
                {t('siteConfiguration.sitewideMessage.settings')}
              </Heading>
            </Box>

            {/* Site-wide Message Box */}
            <SectionBox w="80%">
              <Flex justify="space-between" w="full" gap={12}>
                <Flex direction="column" w="full">
                  {/* Banner Type Select Box and Show Button */}
                  <Flex align="center" gap={8} mb={4}>
                    {/* Banner Type Select Box */}
                    <FormControl>
                      <FormLabel htmlFor="sitewideMessageColor" mb={2}>
                        {t('siteConfiguration.sitewideMessage.colorLabel')}
                      </FormLabel>
                      <Controller
                        name="sitewideMessageColor"
                        control={control}
                        render={({ field }) => (
                          <Select {...field} id="sitewideMessageColor" w="fit-content">
                            <option value="theme.orangeLight02">
                              {t('siteConfiguration.sitewideMessage.colors.lightYellow')}
                            </option>
                            <option value="theme.softRose">{t('siteConfiguration.sitewideMessage.colors.red')}</option>
                            <option value="greys.offWhite">{t('siteConfiguration.sitewideMessage.colors.blue')}</option>
                          </Select>
                        )}
                      />
                    </FormControl>

                    {/* Show Button */}
                    <FormControl display="flex" alignItems="center" w="fit-content" gap={2}>
                      <Controller
                        name="displaySitewideMessage"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            id="displaySitewideMessage"
                            isChecked={field.value}
                            onChange={(e) => {
                              field.onChange(e);
                              setCurrentDisplayValue(e.target.checked);
                            }}
                          />
                        )}
                      />
                      <FormLabel htmlFor="displaySitewideMessage" mb={0}>
                        {t('siteConfiguration.sitewideMessage.enable')}
                      </FormLabel>
                    </FormControl>
                  </Flex>

                  {/* Text for Banner */}
                  <TextFormControl
                    label={t('siteConfiguration.sitewideMessage.label')}
                    fieldName="sitewideMessage"
                    hint={t('siteConfiguration.sitewideMessage.hint')}
                    showOptional={false}
                    inputProps={{ w: 'lg', maxLength: 255 }} // Added maxLength to limit input to 255 characters
                    sx={{
                      '& label': {
                        mb: 1,
                      },
                    }}
                  />
                </Flex>
              </Flex>
            </SectionBox>
          </Flex>

          <Divider my={16} />
          <HStack alignSelf="end">
            <Button variant="primary" onClick={onOpen} isDisabled={isSubmitting}>
              {t('ui.save')}
            </Button>
            <Button variant="secondary" onClick={() => navigate(-1)} isDisabled={isSubmitting}>
              {t('ui.cancel')}
            </Button>
          </HStack>
        </form>
      </FormProvider>

      <GlobalConfirmationModal
        headerText={currentDisplayValue ? t('ui.publishBanner') : t('ui.removeBanner')}
        isOpen={isOpen}
        onSubmit={handleSubmit(onSubmit)}
        onClose={onClose}
      />

      {/* <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="theme.blueAlt">
            {currentDisplayValue ? t('ui.publishBanner') : t('ui.removeBanner')}
          </ModalHeader>
          <ModalCloseButton size="sm" color="greys.anotherGrey" />
          <ModalFooter justifyContent="center">
            <Button
              bg="theme.darkBlue"
              color="white"
              _hover={{ bg: 'theme.blueButtonHover' }}
              mr={8}
              onClick={handleSubmit(onSubmit)}
            >
              {t('ui.confirm')}
            </Button>
            <Button variant="ghost" onClick={onClose} border="2px" borderColor="border.light" color="greys.anotherGrey">
              {t('ui.cancel')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal> */}
    </Container>
  );
});
