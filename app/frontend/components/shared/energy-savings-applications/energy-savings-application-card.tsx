import { Box, Flex, Hide, Image, Show, Spacer, Text } from '@chakra-ui/react';
import { PencilIcon, UsersIcon, WarningIcon } from '@phosphor-icons/react';
import { format } from 'date-fns';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IEnergySavingsApplication } from '../../../models/energy-savings-application';
import { useMst } from '../../../setup/root';
import { GreenLineSmall } from '../base/decorative/green-line-small';
import { RouterLinkButton } from '../navigation/router-link-button';
import SandboxHeader from '../sandbox/sandbox-header';
import { EnergySavingsApplicationStatusTag } from './energy-savings-application-status-tag';
import { EPermitApplicationStatus } from '../../../types/enums';
import SupportRequestList from './support-request-list';
interface IEnergySavingsApplicationCardProps {
  energySavingsApplication: IEnergySavingsApplication;
}

export const EnergySavingsApplicationCard = ({ energySavingsApplication }: IEnergySavingsApplicationCardProps) => {
  const { id, nickname, permitTypeAndActivity, number, createdAt, updatedAt, viewedAt } = energySavingsApplication;
  const nicknameSplitText = nickname.split(':');
  const { userStore } = useMst();
  const currentUser = userStore.currentUser;
  const { t } = useTranslation();

  const isSubmissionCollaboration = energySavingsApplication.submitter?.id !== currentUser?.id;

  const routingButtonText = (() => {
    if (
      [
        energySavingsApplication.isSubmitted,
        energySavingsApplication.isIneligible,
        energySavingsApplication.isResubmitted,
        energySavingsApplication.isApproved,
        energySavingsApplication.isInReview,
      ].some(Boolean)
    ) {
      return t('energySavingsApplication.card.viewApplication');
    }

    return isSubmissionCollaboration ? t('energySavingsApplication.card.collaborateButton') : t('ui.continue');
  })();

  return (
    <Flex
      direction="column"
      borderRadius="lg"
      border="1px solid"
      borderColor={
        energySavingsApplication.status === EPermitApplicationStatus.revisionsRequested
          ? 'theme.yellow'
          : 'border.light'
      }
      p={8}
      align="center"
      gap={4}
      position="relative"
      bg={
        energySavingsApplication.status === EPermitApplicationStatus.revisionsRequested
          ? 'theme.orangeLight'
          : 'greys.white'
      }
    >
      {energySavingsApplication.sandbox && <SandboxHeader override sandbox={energySavingsApplication.sandbox} />}
      <Flex flexDirection={{ base: 'column', md: 'row' }} gap={6} w="full">
        <Flex
          display={{ base: 'none', md: 'flex' }}
          direction="column"
          flex={{ base: 0, md: 1 }}
          maxW={{ base: '100%', md: '20%' }}
          justifyContent="center"
        >
          <Box position="relative" w="full" h="full">
            <Image
              src="/images/permit_classifications/low_residential.png"
              alt={`thumbnail for ${nickname}`}
              bg="semantic.infoLight"
              objectFit="contain"
              boxSize="100%"
            />
          </Box>
        </Flex>
        <Show below="md">
          <Flex justify="space-between" alignItems="center">
            <Image
              src="/images/permit_classifications/low_residential.png"
              alt={`thumbnail for ${nickname}`}
              w="150px"
              h="80px"
              bg="semantic.infoLight"
              objectFit="contain"
            />
            <EnergySavingsApplicationStatusTag energySavingsApplication={energySavingsApplication} />
          </Flex>
        </Show>
        <Flex direction="column" gap={2} flex={{ base: 0, md: 5 }} maxW={{ base: '100%', md: '75%' }}>
          <Flex direction="column" flex={1} gap={2}>
            {energySavingsApplication.status === EPermitApplicationStatus.revisionsRequested && (
              <Flex bg="theme.orange" p={2} borderRadius={4} alignItems={'center'}>
                <Box>
                  <WarningIcon size={16} aria-label={'warning icon'} />
                </Box>
                <Text fontSize="sm" ml={2}>
                  <b>{t(`energySavingsApplication.card.actionRequired`)}</b>{' '}
                  {t(`energySavingsApplication.card.reviewApplication`)}
                </Text>
              </Flex>
            )}
            <Text color="text.link" fontSize="lg" fontWeight="bold">
              {nicknameSplitText?.[0]}
            </Text>
            <Text color="text.link" fontSize="lg" fontWeight="bold" flex="1">
              {nicknameSplitText?.[1]}
            </Text>
            <Show below="md">
              <Text>
                <Text as="span" fontWeight={700} mr="1">
                  {t('energySavingsApplication.fields.number')}:
                </Text>
                {number}
              </Text>
            </Show>
            <Box flex="1" alignContent="center">
              <GreenLineSmall />
            </Box>

            <Flex gap={4} flex="1" alignItems="end">
              <Text>
                {t('energySavingsApplication.startedOn')}
                <Text as="span">{':  '}</Text>
                <Show below="md">
                  <br />
                </Show>
                {format(createdAt, 'MMM d, yyyy')}
              </Text>
              <Hide below="md">
                <Text>{'  |  '}</Text>
              </Hide>
              <Show below="sm">
                <Spacer />
              </Show>
              <Text>
                {t('energySavingsApplication.lastUpdated')}
                <Text as="span">{':  '}</Text>
                <Show below="md">
                  <br />
                </Show>
                {format(updatedAt, 'MMM d, yyyy')}
              </Text>
              {viewedAt && (
                <>
                  <Show above="md">
                    <Text>{'  |  '}</Text>
                  </Show>
                  <Show below="md">
                    <Spacer />
                  </Show>
                  <Text>
                    {t('energySavingsApplication.viewedOn')}
                    <Text as="span">{':  '}</Text>
                    <Show below="md">
                      <br />
                    </Show>
                    {format(viewedAt, 'MMM d, yyyy')}
                  </Text>
                </>
              )}
            </Flex>
          </Flex>
        </Flex>
        <Flex direction="column" align="flex-end" gap={4} flex={{ base: 0, md: 1 }} maxW={{ base: '100%', md: '25%' }}>
          <Show above="md">
            <EnergySavingsApplicationStatusTag energySavingsApplication={energySavingsApplication} />
            <Box>
              <Text align="right" variant="tiny_uppercase">
                {t('energySavingsApplication.fields.number')}
              </Text>
              <Text align="right">{number}</Text>
            </Box>
          </Show>
          <RouterLinkButton
            to={`/applications/${id}/edit`}
            variant="secondary"
            w={{ base: 'full', md: 'fit-content' }}
            aria-label={`${routingButtonText} for ${nicknameSplitText?.[0]} ${nicknameSplitText?.[1] || ''}`}
            leftIcon={
              !energySavingsApplication.isSubmitted && isSubmissionCollaboration ? (
                <UsersIcon />
              ) : [
                  energySavingsApplication.isSubmitted,
                  energySavingsApplication.isIneligible,
                  energySavingsApplication.isResubmitted,
                  energySavingsApplication.isApproved,
                  energySavingsApplication.isInReview,
                ].some(Boolean) ? undefined : (
                <PencilIcon />
              )
            }
          >
            {routingButtonText}
          </RouterLinkButton>
        </Flex>
      </Flex>
      {energySavingsApplication.supportRequests?.length > 0 && (
        <SupportRequestList supportRequests={energySavingsApplication.supportRequests} />
      )}
    </Flex>
  );
};
