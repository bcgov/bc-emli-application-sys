import { Button, Flex, Heading, Link, ListItem, Text, UnorderedList } from '@chakra-ui/react';
import { ArrowSquareOut, CaretRight } from '@phosphor-icons/react';
import React from 'react';
import { RouterLinkButton } from '../navigation/router-link-button';

export function BCServiceInfoBlock({ title, description, bulletPoints, ctaText, ctaLink, infoLink = null }) {
  return (
    <Flex direction="column" gap={2} p={6} rounded="sm" borderWidth={1} borderColor="border.light" bg="greys.white">
      <Heading as="h3" m={0} color="theme.blueAlt">
        {title}
      </Heading>
      <Text fontSize="sm">{description}</Text>
      <UnorderedList fontSize="sm" pl={2}>
        {bulletPoints.map((p) => (
          <ListItem>{p}</ListItem>
        ))}
      </UnorderedList>
      {infoLink && (
        /* TODO: link to CMS Page */
        <Button variant="link" as={Link} href="" rightIcon={<CaretRight />}>
          {infoLink}
        </Button>
      )}
      <RouterLinkButton to={ctaLink} variant="secondary" rightIcon={<ArrowSquareOut size={16} color="border.dark" />}>
        {ctaText}
      </RouterLinkButton>
    </Flex>
  );
}
