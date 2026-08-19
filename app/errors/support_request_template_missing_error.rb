# Raised when no RequirementTemplate is configured at all for the program/type
# combination a support request needs - distinct from a template that exists but
# has no published version (SupportRequestTemplateError).
class SupportRequestTemplateMissingError < SupportRequestTemplateError
end
