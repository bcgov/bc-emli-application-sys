import {
  Button,
  Flex,
  HStack,
  IconButton,
  PopoverBody,
  PopoverHeader,
  Stack,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { Plus, X } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ECollaborationType } from '../../../types/enums';
import { RequestLoadingButton } from '../../shared/request-loading-button';
import { ModelSearchInput } from '../../shared/base/model-search-input';
import { ISearch } from '../../../lib/create-search-model';
import { useMst } from '../../../setup/root';

export const AssignmentPopoverContent = observer(function CollaboratorSearch({
  onSelect,
  onClose,
  getConfirmationModalDisclosureProps,
  transitionToInvite,
  takenCollaboratorStrategy = 'exclude',
  collaborationType,
  assignedUserIds = [],
}: {
  onSelect: (userId?: string) => Promise<void>;
  takenCollaboratorStrategy?: 'include' | 'exclude';
  onClose?: () => void;
  getConfirmationModalDisclosureProps?: (userId: string) => Partial<Omit<ReturnType<typeof useDisclosure>, 'onToggle'>>;
  transitionToInvite?: () => void;
  collaborationType: ECollaborationType;
  assignedUserIds?: string[];
}) {
  const { userStore } = useMst();
  const { tableUsers, setTableUsers } = userStore;
  const { t } = useTranslation();

  useEffect(() => {
    // Keep original page size of 10 users - only optimize with skipMerge and faster debounce
    // userStore.setCountPerPage(8); // Removed: keep default 10

    // Override search function to skip expensive merge operations
    const originalSearch = userStore.search;
    userStore.search = () => userStore.searchUsers({ skipMerge: true });

    return () => {
      userStore.setQuery(null);
      // Restore original search function when assignment popup closes
      userStore.search = originalSearch;
    };
  }, [userStore]);

  const onSelectCreator = (userId: string) => {
    return async (onClose?: () => void) => {
      await onSelect(userId);
      setTableUsers([]);
      onClose?.();
    };
  };

  const enhancedOnClose = () => {
    setTableUsers([]);
    userStore.setQuery(null);
    onClose?.();
  };

  return (
    <>
      <PopoverHeader as={Stack} p={4}>
        <Flex justifyContent={'space-between'}>
          <Text fontSize={'lg'} fontFamily={'heading'} fontWeight={'bold'}>
            {t('permitCollaboration.popover.assignment.title')}
          </Text>
          <IconButton
            size={'xs'}
            onClick={enhancedOnClose}
            variant={'ghost'}
            aria-label={'close assignment screen'}
            icon={<X />}
            color={'text.primary'}
          />
        </Flex>
        <HStack justifyContent={'space-between'} spacing={4}>
          <ModelSearchInput
            searchModel={userStore as ISearch}
            inputGroupProps={{ w: transitionToInvite ? 'initial' : '100%' }}
            inputProps={{ w: transitionToInvite ? '194px' : '100%', placeholder: 'Find' }}
            setAllUsers={(value) => userStore.setAllUsers(value)}
            debounceTimeInMilliseconds={300}
          />
          {transitionToInvite && (
            <Button variant={'secondary'} leftIcon={<Plus />} size={'sm'} fontSize={'sm'} onClick={transitionToInvite}>
              {t('permitCollaboration.popover.assignment.newContactButton')}
            </Button>
          )}
        </HStack>
      </PopoverHeader>
      <PopoverBody p={4}>
        <Stack as={'ul'} w={'full'} listStyleType={'none'} pl={0}>
          {tableUsers?.length === 0 && (
            <Text textAlign={'center'} fontSize={'sm'} color={'text.secondary'} fontStyle={'italic'}>
              {t(
                `permitCollaboration.popover.assignment.noResultsText.${transitionToInvite ? 'invitable' : 'default'}`,
              )}
            </Text>
          )}
          {tableUsers?.map((user) => {
            const isAlreadyAssigned = assignedUserIds.includes(user.id);

            return (
              <Text
                key={user.id}
                as={'li'}
                px={2}
                py={'0.375rem'}
                fontSize={'sm'}
                fontWeight={'bold'}
                color={isAlreadyAssigned ? 'text.disabled' : 'text.link'}
                display={'flex'}
                alignItems={'center'}
                justifyContent={'space-between'}
                borderRadius={'sm'}
                opacity={isAlreadyAssigned ? 0.6 : 1}
                _hover={{
                  bg: isAlreadyAssigned ? 'transparent' : 'theme.blueLight',
                }}
              >
                <span>{`${user.firstName} ${user.lastName}`}</span>

                <RequestLoadingButton
                  variant={'ghost'}
                  color={isAlreadyAssigned ? 'text.disabled' : 'text.link'}
                  size={'sm'}
                  fontWeight={'semibold'}
                  fontSize={'sm'}
                  isDisabled={isAlreadyAssigned}
                  onClick={() => onSelectCreator(user.id)()}
                  cursor={isAlreadyAssigned ? 'not-allowed' : 'pointer'}
                  aria-label={
                    isAlreadyAssigned
                      ? `${user.firstName} ${user.lastName} is currently assigned`
                      : `Select ${user.firstName} ${user.lastName}`
                  }
                >
                  {isAlreadyAssigned ? 'Assigned' : t('ui.select')}
                </RequestLoadingButton>
              </Text>
            );
          })}
        </Stack>
      </PopoverBody>
    </>
  );
});
