import { Box, Container, Flex, Heading, Link, ListItem, Text, UnorderedList } from '@chakra-ui/react';
import { ArrowSquareOut, CaretRight } from '@phosphor-icons/react';
import i18next from 'i18next';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { useMst } from '../../../setup/root';
import { colors } from '../../../styles/theme/foundations/colors';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';

export const LandingScreen = observer(() => {
  const { t } = useTranslation();
  const { userStore } = useMst();
  const { currentUser } = userStore;

  const whoFor = i18next.t('landing.whoFor', { returnObjects: true }) as string[];
  const applyNeeds = i18next.t('landing.applyNeeds', { returnObjects: true }) as string[];
  const applicationSteps = i18next.t('landing.applicationSteps', { returnObjects: true }) as string[];

  return (
    <Flex direction="column" w="full" bg="greys.white">
      {/* Hero Section */}
      <Box
        h="360px"
        w="full"
        position="relative"
        bgImage={`${colors.theme.blueImageGradient}, url('/images/header-background.png')`}
        bgPosition="center"
        bgSize="cover"
        display="flex"
        alignItems="center"
        justifyContent="center"
        aria-hidden="true"
      >
        <Flex
          as="section"
          aria-labelledby="hero-title"
          direction="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          gap="16px"
          px={{ base: '24px', md: '32px' }}
          py="64px"
          w={{ base: '382px', md: '618px' }}
          h={{ base: '320px', md: '228px' }}
          filter={{
            base: 'none',
          }}
        >
          <Heading
            as="h1"
            id="hero-title"
            fontSize="48px"
            fontWeight="700"
            color="greys.white"
            textShadow={`${colors.theme.bannerTextShadow}, 0 0 3px ${colors.darken[70]}`}
            lineHeight="65px"
            w="full"
            h={{ base: '195px', md: '130px' }}
            display="flex"
            alignItems="center"
          >
            {t('landing.title')}
          </Heading>
          <Text
            fontSize="16px"
            color="greys.white"
            textShadow={`${colors.theme.bannerTextShadow}, 0 0 3px ${colors.darken[70]}`}
            lineHeight="27px"
            w="full"
            h={{ base: '109px', md: '82px' }}
            display="flex"
            alignItems="center"
          >
            {t('landing.intro')}
          </Text>
        </Flex>
      </Box>

      {/* Main Content Section */}
      <Container as="main" id="main-content" maxW="1170px" py="64px" px="32px">
        <Flex direction="column" gap={{ base: '64px', md: '80px' }}>
          {/* Main Cards Section */}
          <Flex
            gap={{ base: '24px', lg: '40px' }}
            direction={{ base: 'column', lg: 'row' }}
            alignItems="flex-start"
            w="full"
            maxW={{ base: 'full', lg: '1106px' }}
            mx="auto"
            h={{ base: 'auto', lg: '418px' }}
            px={{ base: '24px', md: '16px', lg: '0' }}
          >
            {/* Who is this for Card */}
            <Flex
              as="section"
              aria-labelledby="who-for-title"
              direction="column"
              w={{ base: 'full', lg: '533px' }}
              h={{ base: 'auto', lg: '418px' }}
              maxW={{ base: '366px', md: '600px', lg: '533px' }}
              gap="16px"
              borderRadius="4px"
            >
              <Flex direction="column" gap="8px" w="full">
                <Box w="36px" h="4px" bg="theme.green" role="presentation" aria-hidden="true" />
                <Heading
                  as="h2"
                  id="who-for-title"
                  fontSize="32px"
                  fontWeight="700"
                  color="theme.blueAlt"
                  lineHeight="54px"
                  mb={4}
                >
                  {t('landing.whoForTitle')}
                </Heading>
              </Flex>
              <Box
                w="full"
                h={{ base: 'auto', md: '298px' }}
                display="flex"
                alignItems={{ base: 'flex-start', md: 'center' }}
              >
                <UnorderedList spacing={1} pl={4} fontSize="16px" lineHeight="27px" color="greys.anotherGrey" mb={4}>
                  {whoFor.map((str) => (
                    <ListItem key={str}>{str}</ListItem>
                  ))}
                  <ListItem>
                    {t('landing.contractorPortalLink')}{' '}
                    <Link
                      as={RouterLink}
                      to="/welcome/contractor"
                      textDecoration="underline"
                      aria-label={t('landing.ariaLabels.visitContractorPortal')}
                      _focus={{ outline: '2px solid', outlineColor: 'theme.blue', outlineOffset: '2px' }}
                    >
                      {t('landing.energySavingsProgramPortal')}
                    </Link>
                  </ListItem>
                </UnorderedList>
              </Box>
              <Flex alignItems="center" gap="4px">
                <Link
                  href={t('landing.iNeedLink')}
                  isExternal
                  textDecoration="underline"
                  fontSize="16px"
                  color="greys.anotherGrey"
                  aria-label={`${t('landing.iNeed')} ${t('landing.ariaLabels.opensInNewWindow')}`}
                  _focus={{ outline: '2px solid', outlineColor: 'theme.blue', outlineOffset: '2px' }}
                >
                  {t('landing.iNeed')}
                </Link>
                <ArrowSquareOut size={16} aria-hidden="true" />
              </Flex>
            </Flex>

            {/* Apply Card */}
            <Flex
              as="section"
              aria-labelledby="apply-title"
              direction="column"
              bg="theme.blueAlt"
              borderRadius="8px"
              p="32px"
              gap="24px"
              color="greys.white"
              w={{ base: 'full', lg: '533px' }}
              h={{ base: 'auto', lg: '418px' }}
              maxW={{ base: '366px', md: '600px', lg: '533px' }}
              minH={{ base: 'auto', md: '418px' }}
              justifyContent={{ base: 'flex-start', md: 'space-between' }}
            >
              <Flex direction="column" gap="24px" w={{ base: 'full', md: '469px' }} mx="auto">
                <Heading as="h2" id="apply-title" fontSize="24px" fontWeight="700" lineHeight="36px">
                  {t('landing.applyForEnergySaving')}
                </Heading>
                <UnorderedList spacing={2} fontSize="16px" lineHeight="27px">
                  {applicationSteps.map((step) => (
                    <ListItem key={step}>{step}</ListItem>
                  ))}
                </UnorderedList>
                <RouterLinkButton
                  to={currentUser ? '/profile' : '/check-eligible'}
                  variant="primaryInverse"
                  icon={<CaretRight size={16} />}
                  iconPosition="right"
                  w="200px"
                  h="50px"
                  minH="40px"
                  alignSelf="flex-start"
                  aria-label={t('landing.ariaLabels.startApplication')}
                  _focus={{ outline: '2px solid', outlineColor: 'greys.white', outlineOffset: '2px' }}
                >
                  {t('landing.getStarted')}
                </RouterLinkButton>
              </Flex>
              <Flex
                direction="column"
                w={{ base: 'full', md: '469px' }}
                mx="auto"
                mt={{ base: '24px', md: '0' }}
                fontSize="14px"
                lineHeight="21px"
              >
                <Text>{t('landing.alreadyStarted')}</Text>
                <Link
                  href="/login"
                  color="greys.white !important"
                  textDecoration="underline"
                  _hover={{ color: 'greys.lightGrey !important' }}
                  _focus={{ outline: '2px solid', outlineColor: 'greys.white', outlineOffset: '2px' }}
                  aria-label={t('landing.ariaLabels.loginToCheckStatus')}
                >
                  {t('landing.loginToCheck')}
                </Link>
              </Flex>
            </Flex>
          </Flex>
        </Flex>
      </Container>

      {/* What do I need to apply Section */}
      <Box as="section" aria-labelledby="what-to-apply-title" bg="greys.grey04">
        <Container maxW="1170px" py="64px" px="32px">
          <Heading
            as="h2"
            id="what-to-apply-title"
            fontSize="24px"
            fontWeight="700"
            color="theme.blueAlt"
            lineHeight="36px"
            mb={4}
          >
            {t('landing.whatToApply')}
          </Heading>
          <Text fontSize="16px" lineHeight="27px" color="greys.anotherGrey" mb={4}>
            {t('landing.duringApplication')}
          </Text>
          <UnorderedList spacing={1} pl={4} color="greys.anotherGrey" mb={4}>
            {applyNeeds.map((str) => (
              <ListItem key={str} fontSize="16px" lineHeight="27px">
                {str}
              </ListItem>
            ))}
          </UnorderedList>
          <Text fontSize="16px" lineHeight="27px" color="greys.anotherGrey">
            {t('landing.informationReady')}
          </Text>
        </Container>
      </Box>

      {/* Other ways to get started Section */}
      <Box as="section" aria-labelledby="other-ways-title" bg="greys.white">
        <Container maxW="1170px" py="64px" px="32px">
          <Heading
            as="h2"
            id="other-ways-title"
            fontSize="24px"
            fontWeight="700"
            color="theme.blueAlt"
            lineHeight="36px"
            mb={8}
          >
            {t('landing.otherWaysTitle')}
          </Heading>
          <Flex gap={6} direction={{ base: 'column', lg: 'row' }}>
            {/* Method 1: Get help with your ESP application */}
            <Flex
              direction="column"
              maxW={{ base: 'full', lg: '352px' }}
              flex={1}
              bg="greys.offWhite"
              borderRadius="8px"
              p={4}
            >
              <Heading as="h3" fontSize="20px" fontWeight="700" color="theme.blueAlt" lineHeight="34px" mb={4}>
                {t('landing.getHelpTitle')}
              </Heading>
              <Text fontSize="16px" lineHeight="27px" color="theme.blueAlt" mb={4}>
                <Text as="span" aria-label={t('landing.ariaLabels.phoneNumber')}>
                  {t('landing.phoneText')}
                </Text>
                {t('landing.phoneHours')}
              </Text>
            </Flex>

            {/* Method 2: Get upgrade advice from an energy specialist */}
            <Flex
              direction="column"
              maxW={{ base: 'full', lg: '352px' }}
              flex={1}
              bg="greys.offWhite"
              borderRadius="8px"
              p={4}
            >
              <Heading as="h3" fontSize="20px" fontWeight="700" color="theme.blueAlt" lineHeight="34px" mb={4}>
                {t('landing.energySpecialistTitle')}
              </Heading>
              <Link
                href={t('landing.energyCoachLink')}
                isExternal
                display="inline-flex"
                alignItems="center"
                gap={2}
                px={4}
                py={2}
                border="1px solid"
                borderColor="border.randomBorderColorforthePublishModal"
                borderRadius="md"
                color="greys.anotherGrey"
                textDecoration="none"
                _hover={{ bg: 'greys.offWhite' }}
                _focus={{ outline: '2px solid', outlineColor: 'theme.blue', outlineOffset: '2px' }}
                aria-label={t('landing.ariaLabels.bookEnergyAssessment')}
              >
                {t('landing.energyCoachBooking')}
                <ArrowSquareOut size={16} aria-hidden="true" />
              </Link>
            </Flex>

            {/* Method 3: Learn more about your home's energy efficiency */}
            <Flex
              direction="column"
              maxW={{ base: 'full', lg: '352px' }}
              flex={1}
              bg="greys.offWhite"
              borderRadius="8px"
              p={4}
            >
              <Heading as="h3" fontSize="20px" fontWeight="700" color="theme.blueAlt" lineHeight="34px" mb={4}>
                {t('landing.energyEfficiencyTitle')}
              </Heading>
              <Link
                href={t('landing.homeEnergyPlannerLink')}
                isExternal
                display="inline-flex"
                alignItems="center"
                gap={2}
                px={4}
                py={2}
                border="1px solid"
                borderColor="border.randomBorderColorforthePublishModal"
                borderRadius="md"
                color="greys.anotherGrey"
                textDecoration="none"
                _hover={{ bg: 'greys.offWhite' }}
                _focus={{ outline: '2px solid', outlineColor: 'theme.blue', outlineOffset: '2px' }}
                aria-label={t('landing.ariaLabels.useHomePlanner')}
              >
                {t('landing.homeEnergyPlanner')}
                <ArrowSquareOut size={16} aria-hidden="true" />
              </Link>
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* Are you a contractor Section */}
      <Box as="section" aria-labelledby="contractor-title" bg="greys.grey04">
        <Container maxW="1170px" py="64px" px="32px">
          <Heading
            as="h2"
            id="contractor-title"
            fontSize="24px"
            fontWeight="700"
            color="theme.blueAlt"
            lineHeight="36px"
            mb={4}
          >
            {t('landing.contractorTitle')}
          </Heading>
          <Text fontSize="16px" lineHeight="27px" color="greys.anotherGrey" mb={4}>
            {t('landing.contractorDescriptionPart1')}{' '}
            <Link
              as={RouterLink}
              to="/welcome/contractor"
              textDecoration="underline"
              aria-label={t('landing.ariaLabels.visitContractorPortalRegister')}
              _focus={{ outline: '2px solid', outlineColor: 'theme.blue', outlineOffset: '2px' }}
            >
              {t('landing.contractorPortalText')}
            </Link>{' '}
            {t('landing.contractorDescriptionPart2')}
          </Text>
        </Container>
      </Box>
    </Flex>
  );
});
