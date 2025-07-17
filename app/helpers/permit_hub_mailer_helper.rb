module PermitHubMailerHelper
  def participant_greeting
    name_parts = [@participant_first_name, @participant_last_name].compact
    name_parts.any? ? " #{name_parts.join(" ")}" : ""
  end
end
