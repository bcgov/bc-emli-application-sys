import { t } from "i18next"
import React from "react"
import { BCServiceInfoBlock } from "../info-block"

export function VirtualAssistantInfoBlock() {
  return (
    <BCServiceInfoBlock
      title={t("auth.bceidInfo.virtualAssessment.title")}
      description={t("auth.bceidInfo.business.description")}
      bulletPoints={[
        t("auth.bceidInfo.virtualAssessment.virtualWalkThrough"),
        t("auth.bceidInfo.virtualAssessment.adviceUpgrades"),
        t("auth.bceidInfo.virtualAssessment.fillingRebate"),
      ]}
      ctaText={t("auth.bceidInfo.virtualAssessment.scheduleACall")}
    
    />
  )
}
