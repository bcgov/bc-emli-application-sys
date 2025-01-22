import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  IconButton,
  Link,
  ListItem,
  Stack,
  Text,
  UnorderedList,
} from "@chakra-ui/react"
import { ArrowSquareOut, WarningCircle } from "@phosphor-icons/react"
import React, { ReactElement } from "react"
import { FC, ReactNode } from "react"

type ErrorAlertProps = {
  title?: string
  description?: string
  items?: string[] // Optional list of error details
  linkText?: string // Optional link text
  linkHref?: string // Optional link URL
  icon?: ReactElement // Optional icon
  borderColor?: string // Optional border color
  backgroundColor?: string // Optional background color
  iconColor?: string // Optional icon color
}

const ErrorAlert: FC<ErrorAlertProps> = ({
  title,
  description,
  items = [],
  linkText,
  linkHref,
  icon = <WarningCircle size={20} />, // Default icon
  borderColor = "semantic.error", // Default border color
  backgroundColor = "semantic.errorLight", // Default background color
  iconColor = "semantic.error", // Default icon color
}) => {
  return (
    <Stack
      p={4}
      mt={4}
      bg={backgroundColor}
      border="1px"
      borderColor={borderColor}
      borderRadius="lg"
      width="100%"
      align="stretch"
    >
      <Alert status="error" variant="subtle" bg="transparent" alignItems="start" p={0}>
        <IconButton variant="ghost" icon={icon} zIndex={1} color={iconColor} aria-label="Error Icon" fontSize={20} />
        <Stack mt={2}>
          {title && (
            <AlertTitle fontSize="md" fontWeight="bold">
              {title}
            </AlertTitle>
          )}
          <AlertDescription fontSize="md" fontWeight="normal" lineHeight="normal">
            <Box>
              <Text mb={2}>{description}</Text>
              {items.length > 0 && (
                <UnorderedList spacing={1}>
                  {items.map((item, index) => (
                    <ListItem key={index}>{item}</ListItem>
                  ))}
                </UnorderedList>
              )}
            </Box>
          </AlertDescription>
          {linkText && (
            <Link href={linkHref} isExternal fontSize="md" fontWeight="normal">
              {/* <Text fontSize="sm" color="text.secondary"> */}
              {linkText} <ArrowSquareOut />
              {/* </Text> */}
            </Link>
          )}
        </Stack>
      </Alert>
    </Stack>
  )
}

export default ErrorAlert
