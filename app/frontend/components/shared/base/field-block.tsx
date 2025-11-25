import React from 'react';
import { Flex, Text, FlexProps } from '@chakra-ui/react';

export interface IFieldBlockProps extends FlexProps {
  /** label shown at top of block */
  label?: string;

  /** description text shown below the label (optional) */
  description?: string;

  /** if the label includes the required asterisk */
  required?: boolean;

  /** usually one or more dropdowns/fields */
  children: React.ReactNode;
}

export const FieldBlock: React.FC<IFieldBlockProps> = ({ label, description, required, children, ...rest }) => {
  return (
    <Flex direction="column" w="full" mb={6} {...rest}>
      {label && (
        <Text fontWeight="semibold" mb={2}>
          {label}
          {required && (
            <Text as="span" color="supporting.red" ml={1}>
              *
            </Text>
          )}
        </Text>
      )}

      {description && (
        <Text fontSize="sm" color="greys.grey03" mb={2}>
          {description}
        </Text>
      )}

      {/* main area: fields stacked vertically, could enhcance this for side by side stacking */}
      <Flex
        direction="column"
        gap={4}
        bg="greys.grey10"
        p={4}
        border="1px solid"
        borderColor="greys.grey02"
        borderRadius="sm"
      >
        {children}
      </Flex>
    </Flex>
  );
};
