import { Box, BoxProps, Container, Flex, Heading, Image } from "@chakra-ui/react"
import React from "react"

interface IBlueTitleBarProps extends BoxProps {
  title: string
  imageSrc?: string
}

export const BlueTitleBar = ({ title, imageSrc, ...rest }: IBlueTitleBarProps) => {
  return (
    <Box h="fit-content" bg="theme.blueGradient" {...rest}>
      <Container
        as={Flex}
        direction="column"
        justifyContent="center"
        alignContent="center"
        maxW="container.lg"
        minHeight="180px"
      >
        {/* <Box position="relative" minHeight="180px" alignItems="center"> */}
        <Heading as="h1" color="greys.white" my="12">
          {title}
        </Heading>

        {/* <Image
            position="absolute"
            right="0"
            zIndex="0"
            src={imageSrc || "/images/banner-housing.svg"}
            opacity="10%"
            alt="title decoration"
            h="full"
            objectFit="cover"
          /> */}
        {/* </Box> */}
      </Container>
    </Box>
  )
}
