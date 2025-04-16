interface HomeScreenBoxProps {
  headingColor?: string;
  // other props
}

const HomeScreenBox: React.FC<HomeScreenBoxProps> = ({ headingColor = 'theme.blueAlt', ...rest }) => (
  <Box
    _hover={{
      borderColor: 'theme.blueAlt',
      backgroundColor: 'theme.BlueLight',
      cursor: 'pointer',
    }}
    {...rest}
  >
    {isMarked && <SandboxHeader />}

    <Flex direction={{ base: 'column', md: 'row' }} gap={8} align="center">
      <Flex direction="column" gap={3} flex={1}>
        <Flex align="center" color={headingColor}>
          {icon}
          <Heading as="h3" ml={2} mb={0} size="md">
            {title}
          </Heading>
        </Flex>
        <Text ml={8} fontSize="sm" color="gray.600">
          {description}
        </Text>
      </Flex>
      {isDisabled ? (
        <Text fontWeight="bold" color="greys.grey01" maxW={100}>
          {t('sandbox.disabledFor')}
        </Text>
      ) : null}
    </Flex>
  </Box>
);