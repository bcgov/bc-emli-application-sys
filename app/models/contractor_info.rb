class ContractorInfo < ApplicationRecord
  belongs_to :contractor

  # TYPE_OF_BUSINESS = {
  #   hvac: 0,
  #   fenestration: 1,
  #   insulation: 2,
  #   health_and_safety: 3,
  #   asbestos_removal: 4,
  #   electrical: 5
  # }.freeze

  # PRIMARY_PROGRAM_MEASURE = {
  #   air_source_heat_pump: 0,
  #   air_to_water_heat_pump: 1,
  #   combined_space_and_water_heat_pump: 2,
  #   heat_pump_water_heater: 3,
  #   insulation: 4,
  #   windows_and_doors: 5
  # }.freeze

  # RETROFIT_ENABLING_MEASURES = {
  #   bathroom_fan: 0,
  #   electrical_service_upgrade: 1,
  #   health_and_safety_remediation: 2,
  #   hrv: 3
  # }.freeze
end
