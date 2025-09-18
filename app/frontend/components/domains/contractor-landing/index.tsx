import {
  Box,
  Container,
  Flex,
  Heading,
  HStack,
  Link,
  ListItem,
  Text,
  UnorderedList,
  VStack,
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  AccordionIcon,
} from '@chakra-ui/react';
import { colors } from '../../../styles/theme/foundations/colors';
import { CaretRight, ArrowSquareOut } from '@phosphor-icons/react';
import React from 'react';
import { RouterLinkButton } from '../../shared/navigation/router-link-button';
import { useTranslation } from 'react-i18next';

export const ContractorLandingScreen = () => {
  const { t } = useTranslation();
  const flow = (t('landing.contractor.flow', { returnObjects: true }) as string[]) || [];
  const registrationRequirements =
    (t('landing.contractor.registrationRequirements', { returnObjects: true }) as string[]) || [];

  return (
    <Flex direction="column" w="full" bg="white">
      {/* Header Section */}
      <Box
        as="header"
        h={{ base: '660px', md: '534px' }}
        position="relative"
        bg={colors.theme.darkBlue}
        bgImage={`${colors.theme.bannerGradient}, url('/images/contractor-header-background.png')`}
        backgroundRepeat="no-repeat"
        bgPosition="center"
        bgSize="cover"
        aria-label={t('landing.contractor.title')}
      >
        <Flex direction="column" justify="center" h="100%" px={{ base: 10, md: 16 }} maxW="7xl" mx="auto" mt={4}>
          <Heading as="h1" fontSize="6xl" fontWeight="bold" color="white" textShadow="theme.bannerTextShadow">
            {t('landing.contractor.title')}
            <br />
            {t('landing.contractor.titleDesc')}
          </Heading>
          <Text fontSize="md" color="white" mt={4} mb={4} fontWeight="bold" textShadow="theme.bannerTextShadow">
            {t('landing.contractor.description')}
          </Text>
          <HStack spacing={4} mt={8} flexDirection={{ base: 'column', md: 'row' }} align="stretch" w="full">
            <RouterLinkButton
              mt="2"
              w={{ base: '100%', md: '200px' }}
              variant="primaryInverse"
              rightIcon={<CaretRight aria-hidden="true" />}
              aria-label={t('auth.login')}
            >
              {t('auth.login')}
            </RouterLinkButton>
            <Link
              variant="primaryInverse"
              href="#main-content"
              aria-label={t('auth.findOut')}
              w={{ base: '100%', md: 'auto' }}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {t('auth.findOut')}
            </Link>
          </HStack>
        </Flex>
      </Box>

      <Box as="main" id="main-content" tabIndex={-1}>
        {/* How it works */}
        <Container as="section" maxW="container.lg" py={10}>
          <Heading as="h2" mb={6} color="theme.blueAlt">
            {t('landing.contractor.itWorks')}
          </Heading>
          <Text mb={6} variant="line_height_medium">
            {t('landing.contractor.itWorksDesc')}
          </Text>
          <Link
            href={t('landing.contractor.learnMoreLink')}
            isExternal
            aria-label={`${t('landing.contractor.learnMore')} (opens in a new tab)`}
          >
            {t('landing.contractor.learnMore')} <ArrowSquareOut aria-hidden="true" />
          </Link>
          {/* Stepper for desktop */}
          <Stepper steps={flow} orientation="horizontal" />
          {/* Stepper for mobile */}
          <Stepper steps={flow} orientation="vertical" />
        </Container>

        {/* Registration Section */}
        <Container as="section" maxW="container.lg" py={8}>
          <Heading as="h2" mb={4} color="theme.blueAlt">
            {t('landing.contractor.registeredContractor')}
          </Heading>
          <Text>{t('landing.contractor.needId')}</Text>
          <Accordion allowToggle mt={4} borderRadius="md">
            <AccordionItem border="1px solid" borderColor="greys.lightGrey">
              <h3>
                <AccordionButton bg="greys.grey20" p={4}>
                  <Box flex="1" textAlign="left" fontWeight="bold">
                    {t('landing.contractor.typeOfContractors')}
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
              </h3>
              <AccordionPanel pb={4} gap={4}>
                <Heading as="h4" fontSize="md" fontWeight="bold" mb={2} mt={4}>
                  {t('landing.contractor.notMember')}
                </Heading>
                <Text mb={2} variant="line_height_medium">
                  {t('landing.contractor.hpcnMember')}{' '}
                  <Link
                    href={t('landing.contractor.visitHomeLink')}
                    isExternal
                    aria-label={`${t('landing.contractor.visitHome')} (opens in a new tab)`}
                  >
                    {t('landing.contractor.visitHome')}
                  </Link>{' '}
                  {t('landing.contractor.toJoin')}
                </Text>
                <Text mt={4} fontWeight="bold">
                  {t('landing.contractor.duringRegistration')}
                </Text>
                <UnorderedList mt={4}>
                  <ListItem>{t('landing.contractor.businessNumber')}</ListItem>
                </UnorderedList>
                <RouterLinkButton
                  to="/terms"
                  mt="2"
                  variant="primaryInverse"
                  rightIcon={<CaretRight aria-hidden="true" />}
                  aria-label="Register as HPCN member contractor"
                >
                  {t('auth.registerButton')}
                </RouterLinkButton>
              </AccordionPanel>
            </AccordionItem>

            <AccordionItem border="1px solid" borderColor="greys.lightGrey" mt={4}>
              <h3>
                <AccordionButton p={4} bg="greys.grey20">
                  <Box flex="1" textAlign="left" fontWeight="bold">
                    {t('landing.contractor.healthSafetyContractors')}
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
              </h3>
              <AccordionPanel pb={4}>
                <AccordionPanel pb={4} gap={4}>
                  <Text mb={2} fontWeight="bold">
                    {t('landing.contractor.duringRegistration')}
                  </Text>
                  <UnorderedList mt={4}>
                    {registrationRequirements.map((item, idx) => (
                      <ListItem key={idx}>{item}</ListItem>
                    ))}
                  </UnorderedList>
                  <RouterLinkButton
                    to="/terms"
                    mt="2"
                    variant="primaryInverse"
                    rightIcon={<CaretRight aria-hidden="true" />}
                    aria-label="Register as Health Safety contractor"
                  >
                    {t('auth.registerButton')}
                  </RouterLinkButton>
                </AccordionPanel>
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </Container>
      </Box>

      {/* Already have an account? */}
      <Box as="footer" bg="greys.grey04" mb={8}>
        <Container as="section" maxW="container.lg" py={8} gap={8}>
          <Heading as="h2" mb={2} color="theme.blueAlt">
            {t('landing.contractor.alreadyAccount')}
          </Heading>
          <Text mt={4}>{t('landing.contractor.submitInvoices')}</Text>
          <RouterLinkButton
            mt={4}
            variant="primaryInverse"
            rightIcon={<CaretRight aria-hidden="true" />}
            aria-label={t('auth.login')}
          >
            {t('auth.login')}
          </RouterLinkButton>
        </Container>
      </Box>
    </Flex>
  );
};

// Reusable Stepper component for desktop and mobile
const Stepper = ({
  steps,
  orientation = 'horizontal',
}: {
  steps: string[];
  orientation?: 'horizontal' | 'vertical';
}) => {
  const isHorizontal = orientation === 'horizontal';
  const containerProps = isHorizontal
    ? {
        direction: { base: 'column', md: 'row' } as const,
        display: { base: 'none', md: 'flex' } as const,
        align: 'center',
        justify: 'space-between',
        gap: 0,
        as: 'ol' as React.ElementType,
      }
    : {
        direction: 'column' as const,
        display: { base: 'flex', md: 'none' } as const,
        align: 'stretch',
        justify: 'center',
        gap: 6,
        as: 'ol' as React.ElementType,
      };

  // Responsive lineProps based on orientation and screen size
  const lineProps = isHorizontal
    ? {
        top: 'calc(50% - 20px)',
        left: `calc(100% / ${steps.length * 2} + 8px)`,
        right: `calc(100% / ${steps.length * 2} + 8px)`,
        height: '2px',
        width: 'auto',
      }
    : {
        left: 'calc(32px + 8px )', //(32px is circle size)
        top: `calc(32px - 8px)`, // below first circle, 8px gap
        bottom: `calc(32px - 8px)`, // above last circle, 8px gap
        width: '2px',
        height: 'auto',
      };

  return (
    <Flex mt={8} bg="theme.blueLight02" p={6} borderRadius="md" position="relative" {...containerProps}>
      {/* Connecting line */}
      <Box
        display={isHorizontal ? { base: 'none', md: 'block' } : 'block'}
        position="absolute"
        bg="theme.blueAlt"
        zIndex={0}
        {...lineProps}
        aria-hidden="true"
      />
      {steps.map((step, index) => {
        const StepCircle = (
          <Box
            as="span"
            bg="theme.blueAlt"
            borderRadius="full"
            w="32px"
            h="32px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontWeight="bold"
            fontSize="xl"
            color="white"
            flexShrink={0}
            mr={!isHorizontal ? 4 : 0}
            aria-hidden="true"
          >
            {index + 1}
          </Box>
        );
        const StepLabel = (
          <Text as="span" fontSize="sm" color="theme.blueAlt" fontWeight="bold">
            {step}
          </Text>
        );
        return isHorizontal ? (
          <VStack
            as="li"
            key={index}
            spacing={2}
            align="center"
            textAlign="center"
            w="full"
            zIndex={1}
            aria-label={`Step ${index + 1}: ${step}`}
          >
            {StepCircle}
            {StepLabel}
          </VStack>
        ) : (
          <Flex
            as="li"
            key={index}
            align="center"
            position="relative"
            zIndex={1}
            mb={index < steps.length - 1 ? 6 : 0}
            aria-label={`Step ${index + 1}: ${step}`}
          >
            {StepCircle}
            {StepLabel}
          </Flex>
        );
      })}
    </Flex>
  );
};
