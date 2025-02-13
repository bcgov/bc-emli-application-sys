import { Box, Flex, Hide, Image, Show, Spacer, Text } from "@chakra-ui/react"
import { Info, Pencil, Users, Warning } from "@phosphor-icons/react"
import { format } from "date-fns"
import React from "react"
import { Trans, useTranslation } from "react-i18next"
import { IEnergySavingsApplication } from "../../../models/energy-savings-application"
import { useMst } from "../../../setup/root"
import { GreenLineSmall } from "../base/decorative/green-line-small"
import { RouterLinkButton } from "../navigation/router-link-button"
import SandboxHeader from "../sandbox/sandbox-header"
import { EnergySavingsApplicationStatusTag } from "./energy-savings-application-status-tag"
import { EPermitApplicationStatus, EPermitApplicationStatusGroup } from "../../../types/enums"

interface IEnergySavingsApplicationCardProps {
  energySavingsApplication: IEnergySavingsApplication
}

const calloutBannerContainerProps = {
  py: "0.375rem",
  px: 2,
  align: "center",
  gap: "0.375rem",
  w: "fit-content",
  borderRadius: "sm",
}

const calloutBannerTextProps = {
  fontSize: "sm",
  numOfLines: 2,
}

export const EnergySavingsApplicationCard = ({ energySavingsApplication }: IEnergySavingsApplicationCardProps) => {
  const { id, nickname, permitTypeAndActivity, number, createdAt, updatedAt, viewedAt } = energySavingsApplication
  const nicknameSplitText = nickname.split(":")
  const { userStore } = useMst()
  const currentUser = userStore.currentUser
  const { t } = useTranslation()

  const { usingCurrentTemplateVersion } = energySavingsApplication

  const showNewVersionWarning = !usingCurrentTemplateVersion && !energySavingsApplication.isSubmitted

  const isSubmissionCollaboration = energySavingsApplication.submitter?.id !== currentUser?.id

  const routingButtonText = (() => {
    if (energySavingsApplication.isSubmitted) return t("ui.view")

    return isSubmissionCollaboration ? t("energySavingsApplication.card.collaborateButton") : t("ui.continue")
  })()

  return (
    <Flex
      direction="column"
      borderRadius="lg"
      border="1px solid"
      borderColor={
        energySavingsApplication.status === EPermitApplicationStatus.updateNeeded ? "theme.yellow" : "border.light"
      }
      p={8}
      align="center"
      gap={4}
      position="relative"
      cursor="pointer"
      bg={
        energySavingsApplication.status === EPermitApplicationStatus.updateNeeded ? "theme.orangeLight" : "greys.white"
      }
    >
      {energySavingsApplication.sandbox && <SandboxHeader override sandbox={energySavingsApplication.sandbox} />}
      <Flex flexDirection={{ base: "column", md: "row" }} gap={6} w="full">
        <Show above="md">
          <Flex direction="column" flex={{ base: 0, md: 1 }} maxW={{ base: "100%", md: "20%" }} justifyContent="center">
            <Image
              p={2}
              src="/images/permit_classifications/low_residential.png"
              alt={`thumbnail for ${nickname}`}
              bg="semantic.infoLight"
              objectFit="contain"
            />
            {/* <Text align="center" mt="1" color="text.secondary" fontSize="sm" fontWeight="bold" lineHeight="1.2">
                {permitTypeAndActivity}
              </Text> */}
          </Flex>
        </Show>
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
        <Flex direction="column" gap={2} flex={{ base: 0, md: 5 }} maxW={{ base: "100%", md: "75%" }}>
          {showNewVersionWarning && (
            <Flex bg="semantic.warning" {...calloutBannerContainerProps}>
              <Warning size={14} />
              <Text {...calloutBannerTextProps}>
                <Text as="span" fontWeight="bold">
                  {t("ui.actionRequired")}
                </Text>
                {": "}
                {t("energySavingsApplication.newVersionPublished")}
              </Text>
            </Flex>
          )}
          {isSubmissionCollaboration && (
            <Flex bg="semantic.info" color={"white"} {...calloutBannerContainerProps}>
              <Info size={14} />
              <Text {...calloutBannerTextProps}>
                <Trans
                  i18nKey={
                    energySavingsApplication.isDraft
                      ? "energySavingsApplication.card.collaborationCalloutDraft"
                      : "energySavingsApplication.card.collaborationCalloutSubmitted"
                  }
                  t={t}
                  components={{ 1: <Text as="span" fontWeight="bold" /> }}
                  values={{
                    authorName: energySavingsApplication.submitter?.name,
                  }}
                />
              </Text>
            </Flex>
          )}
          <Flex direction="column" flex={1} gap={2}>
            {/* Commented as per new design- */}
            {/* <RouterLinkButton
              variant="link"
              whiteSpace="normal"
              overflowWrap="break-word"
              fontSize="lg"
              fontWeight="bold"
              color="text.link"
              to={`/permit-applications/${id}/edit`}
              rightIcon={<CaretRight size={16} />}
            >
              {nickname}
            </RouterLinkButton> */}
            {/* <Flex bg="#F8BB47" p={2} alignItems="center" gap={1} borderRadius={4}>
              <Warning size={16} />
              <Text>
                <b>Action required:</b> Please review the changes an agent made to your application.  
              </Text>
            </Flex> */}
            {energySavingsApplication.status === EPermitApplicationStatus.updateNeeded && (
              <Flex bg="theme.orange" p={2} borderRadius={4} alignItems={"center"}>
                <Box>
                  <Warning size={16} aria-label={"warning icon"} />
                </Box>
                <Text fontSize="sm" ml={2}>
                  <b>{t(`energySavingsApplication.card.actionRequired`)}</b>{" "}
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
                  {t("energySavingsApplication.fields.number")}:
                </Text>
                {number}
              </Text>
            </Show>
            <Box flex="1" alignContent="center">
              <GreenLineSmall />
            </Box>

            <Flex gap={4} flex="1" alignItems="end">
              <Text>
                {t("energySavingsApplication.startedOn")}
                <Text as="span">{":  "}</Text>
                <Show below="md">
                  <br />
                </Show>
                {format(createdAt, "MMM d, yyyy")}
              </Text>
              <Hide below="md">
                <Text>{"  |  "}</Text>
              </Hide>
              <Show below="sm">
                <Spacer />
              </Show>
              <Text>
                {t("energySavingsApplication.lastUpdated")}
                <Text as="span">{":  "}</Text>
                <Show below="md">
                  <br />
                </Show>
                {format(updatedAt, "MMM d, yyyy")}
              </Text>
              {viewedAt && (
                <>
                  <Show above="md">
                    <Text>{"  |  "}</Text>
                  </Show>
                  <Show below="md">
                    <Spacer />
                  </Show>
                  <Text>
                    {t("energySavingsApplication.viewedOn")}
                    <Text as="span">{":  "}</Text>
                    <Show below="md">
                      <br />
                    </Show>
                    {format(viewedAt, "MMM d, yyyy")}
                  </Text>
                </>
              )}
            </Flex>
          </Flex>
          {/* Links commented as per design changes  */}
          {/* <Flex direction={{ base: "column", md: "row" }} gap={4}>
            <Link href={t("energySavingsApplication.seeBestPractices_link")} isExternal>
              {t("energySavingsApplication.seeBestPractices_CTA")}
              <ArrowSquareOut />
            </Link>
            <Show above="md">
              <Text>{"  |  "}</Text>
            </Show>
            <Link href={t("energySavingsApplication.searchKnowledge_link")} isExternal>
              {t("energySavingsApplication.searchKnowledge_CTA")} <ArrowSquareOut />
            </Link>
          </Flex> */}
        </Flex>
        <Flex direction="column" align="flex-end" gap={4} flex={{ base: 0, md: 1 }} maxW={{ base: "100%", md: "25%" }}>
          <Show above="md">
            <EnergySavingsApplicationStatusTag energySavingsApplication={energySavingsApplication} />
            <Box>
              <Text align="right" variant="tiny_uppercase">
                {t("energySavingsApplication.fields.number")}
              </Text>
              <Text align="right">{number}</Text>
            </Box>
          </Show>
          <RouterLinkButton
            to={`/permit-applications/${id}/edit`}
            variant="secondary"
            w={{ base: "full", md: "fit-content" }}
            leftIcon={!energySavingsApplication.isSubmitted && isSubmissionCollaboration ? <Users /> : <Pencil />}
          >
            {routingButtonText}
          </RouterLinkButton>
        </Flex>
      </Flex>
    </Flex>
  )
}
