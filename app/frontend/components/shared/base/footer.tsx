import { Box, Container, Divider, Flex, Show, Text } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useMst } from '../../../setup/root';
import { RouterLink } from '../navigation/router-link';

function isValidSemVer(version) {
  return /^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z-.]+)?(\+[0-9A-Za-z-.]+)?$/.test(version);
}

function formatUTCDate(isoString) {
  const date = new Date(isoString);
  return (
    date
      .toLocaleString('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      })
      .replace(',', '') + ' UTC'
  );
}

export const Footer = observer(() => {
  const location = useLocation();
  const {
    sessionStore: { loggedIn },
    userStore: { currentUser },
  } = useMst();
  const { t } = useTranslation();
  const onlyShowFooterOnRoutes = [
    '/reset-password',
    '/accept-invitation',
    '/forgot-password',
    '/welcome',
    '/contact',
    '/check-eligible',
    '/not-found',
    '/get-support',
  ];

  const shouldShowFooter = onlyShowFooterOnRoutes.some(
    (route) => location.pathname.startsWith(route) || (location.pathname === '/' && !currentUser?.isSubmitter),
  );

  const deploymentTagElem = document.querySelector('meta[name="deployment-tag"]');
  const deploymentTimestampElem = document.querySelector('meta[name="deployment-timestamp"]');

  const deploymentTag = (deploymentTagElem && (deploymentTagElem as HTMLMetaElement).content) || 'localdev';
  const deploymentTimestamp =
    (deploymentTimestampElem && (deploymentTimestampElem as HTMLMetaElement).content) || new Date().toISOString();

  const isCommitSHA = deploymentTag.length === 40;
  const isTag = isValidSemVer(deploymentTag);

  let version = deploymentTag;
  if (isCommitSHA) {
    version = deploymentTag.substring(0, 7);
  } else if (isTag) {
    version = `v${deploymentTag}`;
  }

  return (
    <>
      {shouldShowFooter && (
        <Flex
          direction="column"
          as="footer"
          w="full"
          justifySelf="flex-end"
          borderTop="2px solid"
          borderColor="border.light"
          zIndex={10}
        >
          <Flex py={8} borderY="4px solid" borderColor="theme.yellow" bg="text.primary" color="greys.white">
            <Container maxW="container.lg">
              <Text>{t('site.territorialAcknowledgement')}</Text>
            </Container>
          </Flex>
          <Show above="md">
            <Box py={14} bg="greys.grey03" w="full">
              <Container maxW="container.xl">
                <Flex direction={{ base: 'column', md: 'row' }} gap={12}>
                  <Flex direction={'row'} align="center" justify="center" wrap="wrap" gap={8}>
                    <RouterLink to={t('site.footerLinks.betterHomes')} color="text.secondary">
                      {t('site.betterHomes')}
                    </RouterLink>
                    <Divider orientation="vertical" h="25px" mx={4} borderColor="text.secondary" />
                    <RouterLink to={t('site.footerLinks.disclaimer')} color="text.secondary">
                      {t('site.disclaimer')}
                    </RouterLink>
                    <Divider orientation="vertical" h="25px" mx={4} borderColor="text.secondary" />
                    <RouterLink to={t('site.footerLinks.accessibility')} color="text.secondary">
                      {t('site.accessibility')}
                    </RouterLink>
                    <Divider orientation="vertical" h="25px" mx={4} borderColor="text.secondary" />
                    <RouterLink to={t('site.footerLinks.copyright')} color="text.secondary">
                      {t('site.copyright')}
                    </RouterLink>
                    <Divider orientation="vertical" h="25px" mx={4} borderColor="text.secondary" />
                    <RouterLink to={t('site.footerLinks.dataAndPrivacy')} color="text.secondary">
                      {t('site.dataAndPrivacy')}
                    </RouterLink>
                    <Divider orientation="vertical" h="25px" mx={4} borderColor="text.secondary" />
                    <div>{`${version} (${formatUTCDate(deploymentTimestamp)})`}</div>
                  </Flex>
                </Flex>
              </Container>
            </Box>
          </Show>
        </Flex>
      )}
    </>
  );
});
