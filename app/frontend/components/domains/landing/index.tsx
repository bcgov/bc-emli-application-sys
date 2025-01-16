import {
  Box,
  BoxProps,
  Button,
  Center,
  Container,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  Image,
  InputGroup,
  Link,
  ListItem,
  Text,
  UnorderedList,
  VStack,
  Wrap,
  WrapItem,
} from "@chakra-ui/react"
import {
  ArrowSquareOut,
  CaretRight,
  CheckCircle,
  ClipboardText,
  FileArrowUp,
  Info,
  MapPin,
} from "@phosphor-icons/react"
import i18next from "i18next"
import { observer } from "mobx-react-lite"
import * as R from "ramda"
import React, { ReactNode, useEffect, useRef, useState } from "react"
import { Controller, FormProvider, useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { IJurisdiction } from "../../../models/jurisdiction"
import { useMst } from "../../../setup/root"
import { colors } from "../../../styles/theme/foundations/colors"
import { SharedSpinner } from "../../shared/base/shared-spinner"
import { RouterLink } from "../../shared/navigation/router-link"
import { RouterLinkButton } from "../../shared/navigation/router-link-button"
import { AddressSelect } from "../../shared/select/selectors/address-select"
import { JurisdictionSelect } from "../../shared/select/selectors/jurisdiction-select"
import { GreenLineSmall } from "../../shared/base/decorative/green-line-small"

interface ILandingScreenProps {}

export const LandingScreen = observer(({}: ILandingScreenProps) => {
  const { t } = useTranslation()
  const mailto = "mailto:" + t("site.contactEmail")
  const iNeedRef = useRef<HTMLDivElement>(null)
  const { sessionStore, userStore, siteConfigurationStore } = useMst()
  const { smallScaleRequirementTemplateId } = siteConfigurationStore
  const { loggedIn } = sessionStore
  const { currentUser } = userStore

  const scrollToJurisdictionSearch = () => {
    iNeedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const whoFor = i18next.t("landing.whoFor", { returnObjects: true }) as string[]
  const applyNeeds = i18next.t("landing.applyNeeds", { returnObjects: true }) as string[]

  return (
    <Flex direction="column" w="full" bg="greys.white">
      <Box
        h={{ base: "360px" }}
        position="relative"
        bgImage={`${colors.theme.blueImageGradient}, url('/images/header-background.png')`}
        backgroundRepeat="no-repeat"
        bgPosition="center"
        bgRepeat="no-repeat"
        bgSize="cover"
        alignContent="center"
      >
        {/* Content */}
        <Flex wrap="wrap" gap={4} alignItems="center" direction="column" textAlign="center" p={4}>
          <Text fontSize="5xl" fontWeight="bold" color="white" zIndex="1">
            {t("landing.title")}
          </Text>
          <Text fontSize="md" fontWeight="bold" color="white" whiteSpace="normal" zIndex="1" maxW="600px">
            {t("landing.intro")}
          </Text>
        </Flex>
      </Box>

      <Container maxW="container.lg" py={16} px={8}>
        <Flex as="section" direction="column" gap={20}>
          <Flex gap={6} direction={{ base: "column", md: "row" }}>
            <IconBox icon={<CheckCircle size={32} />}>{t("landing.checkEligiblity")}</IconBox>
            <IconBox icon={<ClipboardText size={32} />}>{t("landing.completeSteps")}</IconBox>
            <IconBox icon={<FileArrowUp size={32} />}>{t("landing.easilyUpgrade")}</IconBox>
          </Flex>

          <Flex gap={10} alignItems="stretch" direction={{ base: "column", md: "row" }}>
            <Flex
              as="section"
              direction="column"
              borderRadius="lg"
              bg="theme.blueAlt"
              p={8}
              gap={6}
              color="greys.white"
              flex={1}
              minW={{ base: "0", md: "50%" }}
            >
              <Heading as="h2">{t("landing.applyForEnergySaving")}</Heading>
              <Text>{t("landing.checkEligiblityUsingCard")}</Text>
              <Flex gap={6} direction={{ base: "column", md: "row" }}>
                <RouterLinkButton
                  to={currentUser ? "/" : "/check-eligible"}
                  variant="primaryInverse"
                  icon={<CaretRight size={16} />}
                  iconPosition="right"
                  fontWeight="bold"
                >
                  {t("landing.goTo", {
                    location:
                      !currentUser || currentUser.isSubmitter ? t("landing.permitApp") : t("landing.adminPanel"),
                  })}
                </RouterLinkButton>
              </Flex>

              <Flex mt="auto" direction="column">
                <Text>{t("landing.continuePrefix")} </Text>
                <Text>
                  <Link color="greys.white" _hover={{ opacity: 0.4 }} href="/login">
                    {t("landing.continueLogin")}
                  </Link>
                </Text>
              </Flex>
            </Flex>
            <VStack as="section" align="flex-start" spacing={4}>
              <Heading as="h2" variant="greenline" color="theme.blueText">
                {t("landing.whoForTitle")}
              </Heading>

              <UnorderedList spacing={1} pl={4}>
                {whoFor.map((str) => (
                  <ListItem key={str}>{str}</ListItem>
                ))}
              </UnorderedList>
              <Wrap spacing={2} justify="flex-start">
                <Text>
                  <Link href={t("landing.iNeedLink")} isExternal>
                    {t("landing.iNeed")} <ArrowSquareOut />
                  </Link>
                </Text>
              </Wrap>
            </VStack>
          </Flex>
        </Flex>
      </Container>
      <Box bg="greys.grey03">
        <Container maxW="container.lg" py={10} px={8}>
          <Heading as="h2" color="theme.blueText">
            {t("landing.whatToApply")}
          </Heading>
          <Text py={2}>{t("landing.duringApplication")}</Text>
          <UnorderedList spacing={1} pl={4}>
            {applyNeeds.map((str) => (
              <ListItem key={str}>{str}</ListItem>
            ))}
          </UnorderedList>
          <Text py={2}>{t("landing.informationReady")}</Text>
        </Container>
      </Box>
      <Box bg="greys.white">
        <Container maxW="container.lg" py={16} px={8} gap="6">
          <Heading as="h2" fontSize="md" color="theme.blueText">
            {t("landing.otherWays")}
          </Heading>
          <Text>{t("landing.otherWaysDesc")}</Text>
          <Flex mt={8} gap={6} direction={{ base: "column", md: "row" }}>
            <BareBox n={"1"}>
              {t("landing.additionalContent.left")}
              <br />
              <RouterLinkButton mt="2" to={currentUser ? "/" : "/"} variant="primaryInverse" fontWeight="bold">
                {t("landing.additionalContent.viewTemplate")}
              </RouterLinkButton>
            </BareBox>

            <BareBox n={"2"}>
              {t("landing.additionalContent.mid")}
              <br />
              <RouterLinkButton mt="2" to={"/"} variant="primaryInverse" fontWeight="bold">
                {t("landing.additionalContent.midButton")}
              </RouterLinkButton>
            </BareBox>
          </Flex>
        </Container>
      </Box>
    </Flex>
  )
})

interface IJurisdictionSearchProps {}

const JurisdictionSearch = observer(({}: IJurisdictionSearchProps) => {
  const { t } = useTranslation()
  const { geocoderStore, jurisdictionStore } = useMst()
  const { fetchGeocodedJurisdiction, fetchingJurisdiction } = geocoderStore
  const { addJurisdiction } = jurisdictionStore
  const formMethods = useForm()
  const { control, watch, setValue } = formMethods
  const [jurisdiction, setJurisdiction] = useState<IJurisdiction>(null)
  const [manualMode, setManualMode] = useState<boolean>(false)

  const siteWatch = watch("site")

  useEffect(() => {
    // siteWatch.value may contain an empty string
    // If this is the case, let through this conditional
    // in order to let jurisdiction search fail and set manual mode
    // empty string does not count as isNil but undefined does
    if (R.isNil(siteWatch?.value)) return
    ;(async () => {
      const jurisdiction = await fetchGeocodedJurisdiction(siteWatch.value)
      if (jurisdiction) {
        setJurisdiction(jurisdiction)
      } else {
        setManualMode(true)
      }
    })()
  }, [siteWatch?.value])

  return (
    <Flex gap={6} direction={{ base: "column", md: "row" }} w="full">
      <Flex bg="white" p={6} gap={4} borderRadius="md" w="full">
        <FormProvider {...formMethods}>
          <form style={{ width: "100%" }}>
            <Flex direction="column" gap={6}>
              <Flex direction="column">
                <Heading as="h2" variant="yellowline" mb={2}>
                  {t("landing.where")}
                </Heading>
                <Text>{t("landing.findYourAuth")}</Text>
              </Flex>

              <Controller
                name="site"
                control={control}
                render={({ field: { onChange, value } }) => {
                  return <AddressSelect onChange={onChange} value={value} />
                }}
              />

              {manualMode && (
                <FormControl w="full" zIndex={1}>
                  <FormLabel>{t("jurisdiction.index.title")}</FormLabel>
                  <InputGroup w="full">
                    <JurisdictionSelect
                      onChange={(value) => {
                        if (value) addJurisdiction(value)
                        setJurisdiction(value)
                      }}
                      onFetch={() => setValue("jurisdiction", null)}
                      selectedOption={{ label: jurisdiction?.reverseQualifiedName, value: jurisdiction }}
                      menuPortalTarget={document.body}
                    />
                  </InputGroup>
                </FormControl>
              )}
            </Flex>
          </form>
        </FormProvider>
      </Flex>
      <Center
        bg={jurisdiction ? "theme.blueAlt" : "greys.white"}
        minH={243}
        w="full"
        gap={4}
        borderRadius="md"
        color={jurisdiction ? "greys.white" : "theme.secondary"}
        _hover={{
          background: jurisdiction ? "theme.blue" : null,
          transition: "background 100ms ease-in",
        }}
      >
        {jurisdiction ? (
          <VStack
            gap={8}
            className="jumbo-buttons"
            w="full"
            height="full"
            p={6}
            alignItems="center"
            justifyContent="center"
          >
            <Text textTransform={"uppercase"} fontWeight="light" fontSize="sm">
              {jurisdiction.qualifier}
            </Text>
            <HStack gap={2}>
              <Text fontSize="2xl" fontWeight="bold" textAlign="center">
                {jurisdiction?.name}
              </Text>
              <Box color="theme.yellow">
                <CheckCircle size={32} />
              </Box>
            </HStack>
            <RouterLinkButton
              variant="ghost"
              color="greys.white"
              to={`/jurisdictions/${jurisdiction.slug}`}
              icon={<CaretRight size={16} />}
              textDecoration={"underline"}
              _hover={{
                background: "none",
              }}
            >
              {t("landing.learnRequirements")}
            </RouterLinkButton>
          </VStack>
        ) : (
          <VStack gap={6} p={6}>
            <Center h={50}>{fetchingJurisdiction ? <SharedSpinner /> : <MapPin size={40} />}</Center>
            <Text fontStyle="italic" textAlign="center">
              {t("landing.reqsVary")}
            </Text>
          </VStack>
        )}
      </Center>
    </Flex>
  )
})

interface IIconBoxProps extends BoxProps {
  icon: ReactNode
  children: ReactNode
}

const IconBox = ({ icon, children, ...rest }: IIconBoxProps) => {
  return (
    <Box p={4} borderRadius="lg" bg="theme.blueLight" color="theme.blueText" flex={1} {...rest}>
      <Flex gap={4} align="center" h="full">
        <Box>{icon}</Box>
        <Text fontSize="md" fontWeight="bold">
          {children}
        </Text>
      </Flex>
    </Box>
  )
}

interface IBareBoxProps {
  n: string
  children: ReactNode
}

const BareBox: React.FC<IBareBoxProps> = ({ n, children }) => {
  return (
    <Box p={4} borderRadius="lg" bg="theme.blueLight" color="theme.blueAlt" flex={1}>
      <Flex gap={6} align="center" h="full">
        <Flex
          alignItems="center"
          justifyContent="center"
          bg="theme.blue"
          color="white"
          borderRadius="50%"
          minWidth="35px"
          height="35px"
          fontSize={20}
          fontWeight="bold"
        >
          {n}
        </Flex>
        <Text fontSize="md" fontWeight="bold" textAlign="left">
          {children}
        </Text>
      </Flex>
    </Box>
  )
}

const AvailableJurisdictionsMessageBox: React.FC = observer(() => {
  const { t } = useTranslation()
  const { jurisdictionStore } = useMst()

  const { tableJurisdictions, searchEnabledJurisdictions, totalPages } = jurisdictionStore

  useEffect(() => {
    searchEnabledJurisdictions(12)
  }, [])

  return (
    <Flex
      direction="column"
      gap={2}
      bg={"semantic.infoLight"}
      border="1px solid"
      borderRadius="lg"
      borderColor={"semantic.info"}
      p={4}
    >
      <Flex align="flex-start" gap={2}>
        <Box color={"semantic.info"}>
          <Info size={24} />
        </Box>
        <Flex direction="column" gap={2}>
          <Text fontWeight="bold">
            {t("landing.enabledCommunitiesDescription")}{" "}
            {tableJurisdictions.map((jurisdiction) => (
              <Text as="span" fontWeight="normal" key={jurisdiction.id} mr={2}>
                <RouterLink color="black" to={`/jurisdictions/${jurisdiction.slug}`}>
                  {jurisdiction.qualifiedName}
                </RouterLink>
              </Text>
            ))}
            <br />
            {totalPages > 1 ? (
              <Text as="span" fontWeight="bold">
                {t("landing.andMore")}
              </Text>
            ) : (
              <Text as="span" fontWeight="normal">
                {t("landing.moreComingSoon")}
              </Text>
            )}
          </Text>
        </Flex>
      </Flex>
    </Flex>
  )
})
