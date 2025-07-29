import { Box, Container, Flex, Heading, Link, Text, VStack } from '@chakra-ui/react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';

export const SupportScreen = () => {
  const { t } = useTranslation();

  const mailto = `mailto:${t('site.contactEmail')}`;

  const baseTextSx = { fontSize: '16px', lineHeight: '27px', color: 'text.primary' };

  return (
    <Container maxW="1170px" px={8} pt={16} pb={20}>
      {/* Heading Section */}
      <VStack align="flex-start" spacing={4} mb={16}>
        <Heading as="h1" color="theme.blueAlt" fontSize="36px" fontWeight="700" lineHeight="49px">
          {t('site.support.getSupport')}
        </Heading>
        <Text sx={baseTextSx}>
          {t('site.support.contactAt')}{' '}
          <Link href={mailto} isExternal color="text.primary" aria-label={t('site.support.emailAriaLabel')}>
            {t('site.support.contactTeamCTA')}
          </Link>{' '}
          {t('site.support.contactUs')}
        </Text>
      </VStack>

      {/* Two Column Layout */}
      <Flex direction={{ base: 'column', lg: 'row' }} gap={10} align="flex-start">
        {/* Left Column */}
        <VStack as="main" align="flex-start" spacing={4} flex="1" maxW={{ base: '100%', lg: '715px' }}>
          {/* Section 1: Get help with application */}
          <Heading as="h2" sx={baseTextSx} fontWeight="700">
            {t('site.support.applicationHelpTitle')}
          </Heading>
          <Box>
            <Text sx={baseTextSx} mb={0}>
              {t('site.support.applicationHelpDescription')}
            </Text>
            <Text sx={baseTextSx} mt={0} pt={0}>
              {t('site.support.applicationHelpContactPrefix')}{' '}
              <Link href={mailto} isExternal color="text.primary">
                {t('site.support.contactTeamCTA')}
              </Link>{' '}
              {t('site.support.applicationHelpContactSuffix')}
            </Text>
          </Box>

          {/* Section 2: Get personalized upgrade advice */}
          <Heading as="h3" sx={baseTextSx} mt={4} fontWeight="700">
            {t('site.support.personalizedAdviceTitle')}
          </Heading>
          <Text sx={baseTextSx}>{t('site.support.personalizedAdviceDescription')}</Text>

          {/* Button */}
          <RouterLinkButton
            to={t('landing.additionalContent.energyCoachBookCallLink')}
            variant="secondary"
            size="md"
            px={3}
            py={1.5}
            fontSize="16px"
            lineHeight="22px"
            border="1px"
            borderColor="border.randomBorderColorforthePublishModal"
            bg="white"
            color="text.primary"
            _hover={{ bg: 'greys.grey03' }}
            aria-label={t('site.support.bookAssessmentAriaLabel')}
            mt={2}
          >
            {t('site.support.bookAssessmentButton')}
          </RouterLinkButton>
        </VStack>

        {/* Right Column - Learn More Card */}
        <Box
          as="aside"
          bg="greys.offWhite"
          borderRadius="8px"
          p={8}
          w={{ base: '100%', lg: '351px' }}
          h="fit-content"
          flexShrink={0}
          role="complementary"
          aria-labelledby="learn-more-heading"
        >
          <Heading
            as="h3"
            id="learn-more-heading"
            color="theme.blueAlt"
            fontSize="20px"
            fontWeight="700"
            lineHeight="34px"
            mb={4}
          >
            {t('site.support.learnMoreTitle')}
          </Heading>
          <VStack align="flex-start" spacing={4}>
            <Text sx={baseTextSx}>{t('site.support.learnMoreDescription')}</Text>
            <Flex align="center" gap={1}>
              <Link
                href={t('landing.iNeedLink')}
                isExternal
                color="text.primary"
                textDecoration="underline"
                fontSize="16px"
                lineHeight="22px"
                aria-label={t('site.support.betterHomesLinkAriaLabel')}
              >
                {t('site.support.betterHomesLinkText')}
              </Link>
              <ArrowSquareOut size={16} color="greys.anotherGrey" aria-hidden="true" />
            </Flex>
          </VStack>
        </Box>
      </Flex>
    </Container>
  );
};
