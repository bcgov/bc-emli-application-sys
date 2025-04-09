import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMst } from '../../../setup/root';

export type TSearchAddressFormData = {
  addressString: string;
};

interface INewApplicationScreenProps {}

export type TCreateEnergyApplicationFormData = {
  user_id: string;
  nickname: string;
};

export const NewApplicationScreen = observer(({}: INewApplicationScreenProps) => {
  const { t } = useTranslation();
  const formMethods = useForm<TCreateEnergyApplicationFormData>({
    mode: 'onChange',
    defaultValues: {
      user_id: '',
      nickname: '',
    },
  });
  const { handleSubmit, formState, control, watch, setValue } = formMethods;
  const { isSubmitting } = formState;
  const { permitClassificationStore, permitApplicationStore, userStore } = useMst();

  const { fetchPermitTypeOptions, fetchActivityOptions } = permitClassificationStore;
  const { currentUser } = userStore;
  const navigate = useNavigate();

  const handleCreatePermitApplication = async () => {
    const nickname = currentUser.physicalAddress.streetAddress + ' ' + currentUser.physicalAddress.locality;

    const params = {
      user_id: currentUser.id,
      nickname: nickname,
    };

    const permitApplicationId = await permitApplicationStore.createEnergyApplication(params);
    if (permitApplicationId) {
      navigate(`/applications/${permitApplicationId}/edit`);
    } else {
      navigate(`/`);
    }
  };

  useEffect(() => {
    handleCreatePermitApplication();
  }, []);

  return <></>;
});
