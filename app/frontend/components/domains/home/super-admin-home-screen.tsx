import { Container, Flex } from "@chakra-ui/react"
import { BookOpen, Buildings, Clock, FileText, Folder, Pencil } from "@phosphor-icons/react"
import React from "react"
import { useTranslation } from "react-i18next"
import { IHomeScreenProps } from "."
import { BlueTitleBar } from "../../shared/base/blue-title-bar"
import { HomeScreenBox } from "./home-screen-box"

export const SuperAdminHomeScreen = ({ ...rest }: IHomeScreenProps) => {
  const { t } = useTranslation()

  return (
    <Flex as="main" direction="column" w="full" bg="greys.white" pb="24">
      <BlueTitleBar title={t("home.superAdminTitle")} />
      <Container maxW="container.md" py={16}>
        <Flex direction="column" align="center" w="full">
          <Flex direction="column" align="center" w="full" gap={6}>
            <HomeScreenBox
              title={t("home.jurisdictionsTitle")}
              description={t("home.jurisdictionsDescription")}
              icon={<Buildings size={24} />}
              href="/jurisdictions"
            />
            <HomeScreenBox
              title={t("home.permitTemplateCatalogueTitle")}
              description={t("home.permitTemplateCatalogueDescription")}
              icon={<FileText size={24} />}
              href="/requirement-templates"
              linkText={t("ui.create")}
            />
            <HomeScreenBox
              title={t("home.requirementsLibraryTitle")}
              description={t("home.requirementsLibraryDescription")}
              icon={<BookOpen size={24} />}
              href="/requirements-library"
              linkText={t("ui.create")}
            />
            <HomeScreenBox
              title={t("home.configurationManagement.title")}
              description={t("home.configurationManagement.adminDescription")}
              icon={<Pencil size={24} />}
              href="/configuration-management"
            />
            <HomeScreenBox
              title={t("home.reportingTitle")}
              description={t("home.reportingDescription")}
              icon={<Folder size={24} />}
              href="/reporting"
              pointerEvents="none"
              opacity={0.6}
              bg="gray.100"
              linkText={t("ui.comingSoon")}
            />
            <HomeScreenBox
              title={t("home.earlyAccess.title")}
              description={t("home.earlyAccess.adminDescription")}
              icon={<Clock size={24} />}
              href="/early-access"
              pointerEvents="none"
              opacity={0.6}
              bg="gray.100"
              linkText={t("ui.comingSoon")}
            />
          </Flex>
        </Flex>
      </Container>
    </Flex>
  )
}
