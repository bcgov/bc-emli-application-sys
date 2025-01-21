import { Box, Container, Heading, ListItem, Text, UnorderedList, VStack } from "@chakra-ui/react"
import { observer } from "mobx-react-lite"
import React from "react"
import { useTranslation } from "react-i18next"
import { IHomeScreenProps } from "../../domains/home"
import { RouterLink } from "../navigation/router-link"

interface INotFoundScreenProps extends IHomeScreenProps {}

export const NotFoundScreen = observer(({ ...rest }: INotFoundScreenProps) => {
  const { t } = useTranslation()

  return (
    <Container maxW="container.lg">
      <VStack gap="16" my="20" mb="40">
        <Box>
          <Heading as="h1" color="theme.blueAlt">
            {t("site.pageNotFound")}
          </Heading>
          <Text>{t("site.pageNotFoundInstructions")}</Text>
          <Text>{t("site.pageNotFoundWeSuggest")}</Text>
          <UnorderedList>
            <ListItem>
              <Text>{t("site.pageNotFoundChecking")}</Text>
            </ListItem>
            <ListItem>
              <Text>
                {t("site.pageNotFoundGoing")} <RouterLink to="/welcome">{t("site.pageNotFoundGoHome")}</RouterLink>
              </Text>
            </ListItem>
            <ListItem>
              <Text>
                {t("site.pageNotFoundReaching")}{" "}
                <RouterLink to="/get-support">{t("site.pageNotFoundGetSupport")}</RouterLink>
              </Text>
            </ListItem>
          </UnorderedList>
        </Box>
      </VStack>
    </Container>
  )
})
