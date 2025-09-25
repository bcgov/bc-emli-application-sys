# lib/tasks/reindex.rake
namespace :search do
  desc "Reindex selected models"
  task reindex: :environment do
    puts "Starting reindex..."

    [
      Collaborator,
      RequirementTemplate,
      Program,
      PermitApplication,
      User,
      LiveRequirementTemplate
      # add more models here
    ].each do |model|
      puts "Reindexing #{model.name}..."
      model.reindex
    end
    
    puts "Reindex complete."
  end
end
