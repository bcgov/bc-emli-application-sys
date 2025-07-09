import { observer } from 'mobx-react-lite';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMst } from '../../../setup/root';
import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, Container, Flex, Heading, Text, VStack } from '@chakra-ui/react';
import { BlueTitleBar } from '../../shared/base/blue-title-bar';
import { EFlashMessageStatus, EPermitClassificationCode, EUserRoles } from '../../../types/enums';
import { usePermitClassificationsLoad } from '../../../hooks/resources/use-permit-classifications-load';
import { VersionTag } from '../../shared/version-tag';

interface INewApplicationScreenProps {}

export type TCreateEnergyApplicationFormData = {
  user_id: string;
  nickname: string;
  user_group_type: string;
  audience_type: string;
  submission_type: string;
  slug: string;
};

export const NewApplicationScreen = observer(({}: INewApplicationScreenProps) => {
  const { t } = useTranslation();

  const { permitApplicationStore, userStore, uiStore, permitClassificationStore } = useMst();
  const { getAudienceTypeIdByCode } = permitClassificationStore;
  const { isLoaded: isPermitClassificationsLoaded } = usePermitClassificationsLoad();
  const { currentUser } = userStore;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isBlank = pathname === '/blank-applications';

  const [audienceTypeId, setaudienceTypeId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  interface IHandleCreatePermitApplicationParams {
    slug: string;
    template?: any;
  }

  const handleCreatePermitApplication = useCallback(
    async ({ slug, template }: IHandleCreatePermitApplicationParams) => {
      const nickname =
        currentUser.physicalAddress?.streetAddress && currentUser.physicalAddress?.locality
          ? `${currentUser.physicalAddress.streetAddress} ${currentUser.physicalAddress.locality}`
          : '';

      const params = {
        user_id: currentUser.id,
        ...(nickname && { nickname }),
        user_group_type: template?.userGroupType ? template.userGroupType.code : EPermitClassificationCode.participant,
        audience_type: template?.audienceType ? template.audienceType.code : EPermitClassificationCode.external,
        submission_type: template?.submissionType
          ? template.submissionType.code
          : EPermitClassificationCode.application,
        slug: slug,
      };

      if (isBlank) {
        navigate(`/blank-template/${template.versionId}`);
      } else {
        const permitApplicationId = await permitApplicationStore.createEnergyApplication(params);
        if (permitApplicationId) {
          navigate(`/applications/${permitApplicationId}/edit`);
        } else {
          navigate(`/`);
        }
      }
    },
    [currentUser, permitApplicationStore, navigate, pathname],
  );
  const loadProgramOptions = useCallback(async () => {
    try {
      await userStore.fetchActivePrograms();
      const data = userStore.currentUser?.activePrograms;
      if (data.length == 0) {
        uiStore.flashMessage.show(
          EFlashMessageStatus.error,
          t('energySavingsApplication.submissionInbox.noAccess'),
          '',
        );
        return;
      }
      setSelectedProgramId(data[0].program.id);
    } catch (error) {
      console.error('Failed to load programs', error);
    }
  }, [userStore, uiStore, t]);

  useEffect(() => {
    if (!currentUser.isParticipant) {
      loadProgramOptions();
    } else {
      handleCreatePermitApplication({ slug: 'energy-savings-program' }); // Default slug for participant
    }
  }, [loadProgramOptions]);

  useEffect(() => {
    if (isPermitClassificationsLoaded) {
      const audienceTypeId = getAudienceTypeIdByCode(EPermitClassificationCode.internal);
      setaudienceTypeId(audienceTypeId);
    }
  }, [isPermitClassificationsLoaded]);

  const data = userStore.currentUser?.activePrograms;
  const selectedProgramData = data.find((p) => p.program.id === selectedProgramId);

  return (
    <Flex as="main" direction="column" w="full" bg="greys.white" pb="16">
      {userStore.currentUser?.activePrograms.length > 0 && (
        <>
          <BlueTitleBar
            title={isBlank ? t('site.breadcrumb.blankApplications') : t('energySavingsApplication.start')}
          />
          <Container maxW="container.xl" as="main">
            <Flex justify="left" align="left" p={8}>
              <Text>
                {isBlank
                  ? t('energySavingsApplication.new.selectBlankApplication')
                  : t('energySavingsApplication.new.fillApplication')}
              </Text>
            </Flex>
            <Flex direction={{ base: 'column', md: 'row' }} p={10} gap={8}>
              {/* Sidebar: Program Selector */}
              <VStack align="center" minW={{ base: '100%', md: '250px' }} mb={{ base: 4, md: 0 }}>
                <Text fontWeight="bold" mb={2}>
                  {t('energySavingsApplication.new.program')}
                </Text>
                {userStore.currentUser?.activePrograms.map(({ program }) => {
                  return (
                    <Box
                      key={program.id}
                      px={5}
                      py={5}
                      pl={2}
                      w="full"
                      borderLeft={selectedProgramId === program.id ? '4px solid' : '4px solid transparent'}
                      borderColor={selectedProgramId === program.id ? 'text.link' : 'transparent'}
                      bg={selectedProgramId === program.id ? 'theme.blueLight02' : 'transparent'}
                      color={selectedProgramId === program.id ? 'text.link' : 'gray.700'}
                      fontWeight={selectedProgramId === program.id ? 'bold' : 'normal'}
                      cursor="pointer"
                      _hover={{ bg: 'gray.100' }}
                      onClick={() => setSelectedProgramId(program.id)}
                    >
                      {program.programName}
                    </Box>
                  );
                })}
              </VStack>

              {/* Form Templates Display Area */}
              <VStack align="stretch" spacing={4} flex="1">
                {selectedProgramData?.requirementTemplates.length > 0 ? (
                  selectedProgramData.requirementTemplates.map(({ template }) => {
                    return (
                      (isBlank || template.audienceTypeId === audienceTypeId) && (
                        <Box key={template.id} p={8} border="1px solid" borderColor="gray.200" borderRadius="md">
                          <Flex
                            direction={{ base: 'column', md: 'row' }}
                            justify="space-between"
                            align={{ base: 'stretch', md: 'center' }}
                            wrap="wrap"
                          >
                            <Box mb={{ base: 4, md: 0 }}>
                              <Heading size="md" color="theme.blueAlt" mb={1}>
                                {template.nickname}
                              </Heading>

                              <VStack spacing={2} align="start" mt={4}>
                                <Flex>
                                  <Text fontWeight="bold" color="gray.600" fontSize="sm">
                                    {t('energySavingsApplication.new.lastUpdated')}
                                  </Text>

                                  <Text fontSize="sm" ml={2}>
                                    {new Date(template.updatedAt).toLocaleDateString('en-US')}
                                  </Text>
                                </Flex>
                                <VersionTag versionDate={template.versionDate} w="fit-content" />
                              </VStack>
                            </Box>
                            <Button
                              variant="primary"
                              mt={{ base: 4, md: 0 }}
                              onClick={() =>
                                handleCreatePermitApplication({
                                  slug: selectedProgramData?.program.slug,
                                  template: template,
                                })
                              }
                            >
                              {isBlank ? t('ui.view') : t('energySavingsApplication.new.startApplication')}
                            </Button>
                          </Flex>
                        </Box>
                      )
                    );
                  })
                ) : (
                  <Text> {t('energySavingsApplication.new.noTemplate')}</Text>
                )}
              </VStack>
            </Flex>
          </Container>
        </>
      )}
    </Flex>
  );
});

export default NewApplicationScreen;
