import { Instance, flow, toGenerator, types } from 'mobx-state-tree';
import { toTitleCase } from '../utils/utility-functions';

export const ProgramClassificationModel = types
  .model('ProgramClassificationModel', {
    userGroupType: types.string,
    submissionType: types.maybeNull(types.string),
    label: types.maybeNull(types.string),
  })
  .views((self) => ({
    get userGroupTypeLabel(): string {
      return toTitleCase(self.userGroupType);
    },
    get submissionTypeLabel(): string | null {
      return self.submissionType ? toTitleCase(self.submissionType) : null;
    },
    get presetLabel(): ClassificationPresetName | null {
      const match = Object.entries(classificationPresets).find(
        ([_, val]) =>
          val.userGroupType.toLowerCase() === self.userGroupType.toLowerCase() &&
          (val.submissionType?.toLowerCase() ?? null) === (self.submissionType?.toLowerCase() ?? null),
      );
      return (match?.[0] as ClassificationPresetName) ?? null;
    },
  }))
  .actions((self) => ({
    toApiFormat() {
      return {
        user_group_type: self.userGroupType,
        submission_type: self.submissionType,
      };
    },
    applyPreset(presetName: ClassificationPresetName) {
      const preset = classificationPresets[presetName];
      if (!preset) throw new Error(`Invalid preset: ${presetName}`);
      self.userGroupType = preset.userGroupType.toLowerCase();
      self.submissionType = preset.submissionType?.toLowerCase() ?? null;
    },
  }));

export const classificationPresets = {
  Participant: { userGroupType: 'Participant', submissionType: null },
  Onboarding: { userGroupType: 'Contractor', submissionType: 'Onboarding' },
  Contractor: { userGroupType: 'Contractor', submissionType: null },
} as const;

export type ClassificationPresetName = keyof typeof classificationPresets;
