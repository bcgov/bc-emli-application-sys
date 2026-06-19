# lib/tasks/reindex.rake
namespace :search do
  desc "Reindex selected models"
  task reindex: :environment do
    puts "Starting reindex..."

    puts "Reindexing PermitApplication (batch_size: 100)..."
    PermitApplication.searchkick_options[:batch_size] = 100
    PermitApplication.reindex

    [
      Collaborator,
      RequirementTemplate,
      Program,
      User,
      LiveRequirementTemplate,
      Contractor
      # add more models here
    ].each do |model|
      puts "Reindexing #{model.name}..."
      model.reindex
    end
    
    puts "Reindex complete."
  end
end
