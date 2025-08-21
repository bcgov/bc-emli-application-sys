import { t } from 'i18next';
import React from 'react';
import { Button, Flex, Heading, Hide, Link, ListItem, Show, Text, UnorderedList } from '@chakra-ui/react';
import { ArrowSquareOut, CaretRight, Phone } from '@phosphor-icons/react';
import { RouterLinkButton } from '../navigation/router-link-button';

export function EnergyCoachInfoBlock() {
  // return (
  //   <BCServiceInfoBlock
  //     title={}
  //     //description={t('auth.bcServiceCardInfo.energyCoach.description')}

  //     ctaText={t('auth.bcServiceCardInfo.energyCoach.requestACall')}
  //     ctaLink={t('auth.bcServiceCardInfo.energyCoach.ctaLink')}
  //   />
  // );

  const bulletPoints = [
    t('auth.bcServiceCardInfo.energyCoach.fillingRebate'),
    t('auth.bcServiceCardInfo.energyCoach.rebateQuestions'),
    t('auth.bcServiceCardInfo.energyCoach.virtualWalkThrough'),
    //t("auth.bcServiceCardInfo.energyCoach.homeUpgrades"),
  ];

  return (
    <Flex direction="column" gap={2} p={6} rounded="sm" borderWidth={1} borderColor="border.light" bg="greys.white">
      <Heading as="h3" m={0} color="theme.blueAlt">
        {t('auth.bcServiceCardInfo.energyCoach.title')}
      </Heading>
      {/* <Text fontSize="sm">{description}</Text> */}
      <UnorderedList fontSize="sm" pl={2} mb={0}>
        {bulletPoints.map((p) => (
          <ListItem>{p}</ListItem>
        ))}
      </UnorderedList>
      <Flex direction="row" align="center" gap={2} mt={2} mb={2}>
        <Phone size={16} />
        <Show below="md">
          <Link href={`tel:${t('auth.bcServiceCardInfo.energyCoach.phoneNumber')}`} flex={1}>
            {t('auth.bcServiceCardInfo.energyCoach.phoneNumber')}
          </Link>
        </Show>
        <Hide below="md">
          <Text flex={1}>{t('auth.bcServiceCardInfo.energyCoach.phoneNumber')}</Text>
        </Hide>
      </Flex>
      <Text flex={1}>{t('auth.bcServiceCardInfo.energyCoach.phoneNumberHours')}</Text>
    </Flex>
  );
}
