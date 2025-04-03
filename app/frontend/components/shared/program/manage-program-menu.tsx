import { Button, Menu, MenuButton, MenuList } from '@chakra-ui/react';
import { Export, Info, Key, Pencil, Users } from '@phosphor-icons/react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ISearch } from '../../../lib/create-search-model';
import { ManageMenuItem } from '../base/manage-menu-item';
import { Can } from '../user/can';
import { IProgram } from '../../../models/program';

interface IManageProgramMenuProps<TSearchModel extends ISearch> {
  program: IProgram;
  searchModel?: TSearchModel;
}

export const ManageProgramMenu = observer(function ManageProgramMenu<TSearchModel extends ISearch>({
  program,
  searchModel,
}: IManageProgramMenuProps<TSearchModel>) {
  const { t } = useTranslation();

  return (
    <Can action="program:manage" data={{ program }}>
      <Menu>
        <MenuButton as={Button} aria-label="manage" variant="link">
          {t('ui.manage')}
        </MenuButton>
        <MenuList boxShadow="elevations.elevation04">
          <ManageMenuItem icon={<Pencil size={16} />} to={`/programs/${program.programName}/edit?id=${program.id}`}>
            {t('program.edit.editProgram')}
          </ManageMenuItem>
          <ManageMenuItem icon={<Info size={16} />} to={`${program.slug}`}>
            {t('jurisdiction.index.about')}
          </ManageMenuItem>
          <ManageMenuItem icon={<Users size={16} />} to={`${program.slug}/users`}>
            {t('jurisdiction.index.users')}
          </ManageMenuItem>
          <ManageMenuItem icon={<Key size={16} />} to={`${program.slug}/api-settings`}>
            {t('jurisdiction.index.externalApiKeys')}
          </ManageMenuItem>

          <ManageMenuItem icon={<Export size={16} />} to={`${program.slug}/export-templates`}>
            {t('jurisdiction.index.exportTemplates')}
          </ManageMenuItem>
        </MenuList>
      </Menu>
    </Can>
  );
});
