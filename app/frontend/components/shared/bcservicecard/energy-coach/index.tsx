import { t } from "i18next"
import React from "react"
import { BCServiceInfoBlock } from "../info-block"

export function EnergyCoachInfoBlock() {
  return (
    <BCServiceInfoBlock
      title={t("auth.bcServiceCardInfo.energyCoach.title")}
      description={t("auth.bcServiceCardInfo.energyCoach.description")}
      bulletPoints={[
        t("auth.bcServiceCardInfo.energyCoach.fillingRebate"),
        t("auth.bcServiceCardInfo.energyCoach.rebateQuestions"),
        t("auth.bcServiceCardInfo.energyCoach.virtualWalkThrough"),
        t("auth.bcServiceCardInfo.energyCoach.homeUpgrades"),
      ]}
      ctaText={t("auth.bcServiceCardInfo.energyCoach.requestACall")}
      ctaLink=""
    />
  )
}
