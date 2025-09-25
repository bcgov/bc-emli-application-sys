import { Box, Container, Flex, Heading, Link, Text, UnorderedList, ListItem, VStack } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';

export const SupportScreen = () => {
  const { t } = useTranslation();

  const baseTextSx = { fontSize: '16px', lineHeight: '27px', color: 'text.primary' };

  return (
    <Container maxW="1170px" px={8} pt={16} pb={20}>
      {/* Heading Section */}
      <VStack align="flex-start" mb={8}>
        <Heading as="h1" color="theme.blueAlt" fontSize="36px" fontWeight="700">
          {t('site.support.getSupport')}
        </Heading>
        <Text sx={baseTextSx}>{t('site.support.contactInfo')}</Text>
      </VStack>

      {/* Two Column Layout */}
      <Flex direction={{ base: 'column', lg: 'row' }} gap={10} align="flex-start">
        {/* Left Column */}
        <VStack
          as="main"
          id="main-content"
          tabIndex={-1}
          align="flex-start"
          spacing={4}
          flex="1"
          maxW={{ base: '100%', lg: '715px' }}
        >
          {/* Section 1: Get help with application */}
          <Text fontSize="md" fontWeight="bold">
            {t('site.support.applicationHelpTitleShort')}
          </Text>

          <Text sx={baseTextSx}>
            {t('site.support.applicationHelpDescriptionShort')}{' '}
            {/* <Link href={t('site.support.applicationHelpCallUrl')} isExternal color="text.primary">
              {t('site.support.applicationHelpCallLink')}
            </Link>
            {t('site.support.applicationHelpDescriptionEnd')} */}
          </Text>

          <UnorderedList sx={{ listStyleType: 'disc' }}>
            <ListItem sx={baseTextSx}>
              {t('site.support.groundOrientedLabel')}{' '}
              <Link href={`mailto:${t('site.support.groundOrientedEmail')}`} isExternal color="text.primary">
                {t('site.support.groundOrientedEmail')}
              </Link>
            </ListItem>
            <ListItem sx={baseTextSx}>
              {t('site.support.multiUnitLabel')}{' '}
              <Link href={`mailto:${t('site.support.multiUnitEmail')}`} isExternal color="text.primary">
                {t('site.support.multiUnitEmail')}
              </Link>
            </ListItem>
          </UnorderedList>
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
          <Text
            id="learn-more-heading"
            color="theme.blueAlt"
            fontSize="20px"
            fontWeight="bold"
            lineHeight="34px"
            mb={4}
          >
            {t('site.support.learnMoreTitleShort')}
          </Text>
          <VStack align="flex-start" spacing={4}>
            <Text sx={baseTextSx}>
              {t('site.support.learnMoreDescriptionShort')}{' '}
              <Link
                href={t('landing.iNeedLink')}
                isExternal
                color="text.primary"
                textDecoration="underline"
                fontSize="16px"
                lineHeight="22px"
              >
                {t('site.support.betterHomesLinkTextShort')}
              </Link>
              .
            </Text>
          </VStack>
        </Box>
      </Flex>
    </Container>
  );
};
