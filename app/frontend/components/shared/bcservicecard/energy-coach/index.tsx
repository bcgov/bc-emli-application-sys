import { t } from "i18next"
import React from "react"
import { BCServiceInfoBlock } from "../info-block"

export function EnergyCoachInfoBlock() {
  return (
    <BCServiceInfoBlock
      title={t("auth.bceidInfo.energyCoach.title")}
      description={t("auth.bceidInfo.energyCoach.description")}
      bulletPoints={[t("auth.bceidInfo.energyCoach.fillingRebate"), t("auth.bceidInfo.energyCoach.rebateQuestions"), t("auth.bceidInfo.energyCoach.homeUpgrades")]}
      ctaText={t("auth.bceidInfo.energyCoach.requestACall")}
      ctaLink={import.meta.env.VITE_BASIC_BCEID_REGISTRATION_URL}
    />
  )
}
