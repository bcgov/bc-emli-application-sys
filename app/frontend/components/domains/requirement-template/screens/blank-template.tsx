import { Box, Button, Flex, Heading } from '@chakra-ui/react';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTemplateVersion } from '../../../../hooks/resources/use-template-version';
import { ErrorScreen } from '../../../shared/base/error-screen';
import { LoadingScreen } from '../../../shared/base/loading-screen';
import { BuilderBottomFloatingButtons } from '../builder-bottom-floating-buttons';
import { SectionsDisplay } from '../sections-display';
import { SectionsSidebar } from '../sections-sidebar';
import { useSectionHighlight } from '../use-section-highlight';
import { HStack } from '../../step-code/checklist/pdf-content/shared/h-stack';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

const scrollToIdPrefix = 'template-version-scroll-to-id-';
export const formScrollToId = (id: string) => `${scrollToIdPrefix}${id}`;

export const BlankTemplateScreen = observer(function TemplateVersionScreen() {
  const { templateVersion, error } = useTemplateVersion();
  const denormalizedTemplate = templateVersion?.denormalizedTemplateJson;
  const { t } = useTranslation();
  const {
    rootContainerRef: rightContainerRef,
    sectionRefs,
    sectionIdToHighlight: currentSectionId,
  } = useSectionHighlight({ sections: denormalizedTemplate?.requirementTemplateSections });
  const [isCollapsedAll, setIsCollapsedAll] = useState(false);
  const navigate = useNavigate();

  console.log('templateVersion', templateVersion);
  console.log('denormalizedTemplate', denormalizedTemplate);

  if (error) return <ErrorScreen error={error} />;
  if (!templateVersion?.isFullyLoaded) return <LoadingScreen />;

  const templateSections = denormalizedTemplate?.requirementTemplateSections ?? [];
  const hasNoSections = templateSections.length === 0;

  const onClose = () => {
    window.history.state && window.history.state.idx > 0 ? navigate(-1) : navigate(`/requirement-templates`);
  };

  return (
    <Box as="main" id="view-template-version">
      <Flex id="permitHeader" direction="column" position="sticky" top={0} zIndex={12}>
        <Flex
          w="full"
          p={6}
          bg="theme.blue"
          justify="space-between"
          color="greys.white"
          position="sticky"
          top="0"
          zIndex={12}
          flexDirection={{ base: 'column', md: 'row' }}
        >
          <HStack gap={4} flex={1}>
            <Flex direction="column" w="full">
              <Heading fontSize="xl" as="h3">
                {denormalizedTemplate.nickname}
              </Heading>
            </Flex>
          </HStack>
          <HStack
            flexDir={{
              base: 'column',
              md: 'row',
            }}
            gap={4}
          >
            <Button leftIcon={<CaretLeft />} onClick={() => navigate(-1)}>
              {t('ui.back')}
            </Button>
          </HStack>
        </Flex>
      </Flex>
      <Box>
        <SectionsSidebar
          sections={templateSections}
          onItemClick={scrollIntoView}
          sectionIdToHighlight={currentSectionId}
        />
        <Box
          bg={hasNoSections ? 'greys.grey03' : undefined}
          ref={rightContainerRef}
          position={'relative'}
          display="flex"
          flexDirection="column"
        >
          <SectionsDisplay
            sections={templateSections}
            isCollapsedAll={isCollapsedAll}
            setSectionRef={setSectionRef}
            formScrollToId={formScrollToId}
          />
        </Box>
      </Box>
      <BuilderBottomFloatingButtons isCollapsedAll={isCollapsedAll} setIsCollapsedAll={setIsCollapsedAll} />
    </Box>
  );

  function scrollToTop() {
    rightContainerRef.current?.scrollTo({ behavior: 'smooth', top: 0 });
  }

  function scrollIntoView(id: string) {
    const element = document.getElementById(formScrollToId(id));

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function setSectionRef(el: HTMLElement, id: string) {
    sectionRefs.current[id] = el;
  }
});
