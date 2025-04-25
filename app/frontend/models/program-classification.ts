import { Instance, flow, toGenerator, types } from 'mobx-state-tree';

export const ProgramClassificationModel = types
  .model('ProgramClassificationModel', {
    userGroupType: types.string,
    submissionType: types.maybeNull(types.string),
    label: types.maybeNull(types.string),
  })
  // After create isn't called when hydrating data using mergeUpdateAll, not sure a snapshotProcessor is worth the hassle?
  // .actions((self) => ({
  //   afterCreate() {
  //     const match = Object.entries(CLASSIFICATION_PRESETS).find(
  //       ([_, val]) => val.userGroupType === self.userGroupType && val.submissionType === self.submissionType,
  //     );
  //     self.label = (match?.[0] as ClassificationPresetName) ?? null;
  //   },
  // }))
  .actions((self) => ({
    applyPreset(presetName: ClassificationPresetName) {
      const preset = CLASSIFICATION_PRESETS[presetName];
      if (!preset) throw new Error(`Invalid preset: ${presetName}`);
      self.userGroupType = preset.userGroupType;
      self.submissionType = preset.submissionType;
    },
  }))
  .views((self) => ({
    get presetLabel(): ClassificationPresetName | null {
      const match = Object.entries(CLASSIFICATION_PRESETS).find(
        ([_, val]) => val.userGroupType === self.userGroupType && val.submissionType === self.submissionType,
      );
      return (match?.[0] as ClassificationPresetName) ?? null;
    },
  }));

const CLASSIFICATION_PRESETS = {
  'Participant Inbox': {
    userGroupType: 'Participant',
    submissionType: null,
  },
  'Contractor Onboarding Inbox': {
    userGroupType: 'Contractor',
    submissionType: 'Onboarding',
  },
  'Contractor Inbox': {
    userGroupType: 'Contractor',
    submissionType: null,
  },
} as const;

type ClassificationPresetName = keyof typeof CLASSIFICATION_PRESETS;
