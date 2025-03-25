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
  activity_id: string;
  permit_type_id: string;
  sub_district_id: string;
  user_id: string;
  nickname: string;
};

export const NewApplicationScreen = observer(({}: INewApplicationScreenProps) => {
  const { t } = useTranslation();
  const formMethods = useForm<TCreateEnergyApplicationFormData>({
    mode: 'onChange',
    defaultValues: {
      activity_id: '',
      permit_type_id: '',
      sub_district_id: '',
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
      activity_id: '62f44c78-f2f3-4887-a027-05d5cbca2ad4',
      permit_type_id: '375b8c43-fa69-4934-9504-10a8da207ecb',
      sub_district_id: 'cfe9b809-5f13-4754-8e04-d2a94dd2b790',
      user_id: currentUser.id,
      nickname: nickname,
    };

    const permitApplicationId = await permitApplicationStore.createEnergyApplication(params);
    if (permitApplicationId) {
      navigate(`/applications/${permitApplicationId}/edit`);
    }
  };

  useEffect(() => {
    handleCreatePermitApplication();
  }, []);

  //   const onSubmit = async (formValues) => {
  //     const params = {
  //       ...formValues,
  //       fullAddress: formValues.site.label,
  //     };
  //     const permitApplication = await permitApplicationStore.createPermitApplication(params);
  //     if (permitApplication) {
  //       navigate(`/applications/${permitApplication.id}/edit`);
  //     }
  //   };

  return <></>;
});
