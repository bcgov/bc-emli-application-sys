# lib/tasks/send_contractor_invites.rake
namespace :contractors do
  desc "Send contractor invite emails for imports that have not yet been sent"
  task send_invites: :environment do
    imports = ContractorImport.email_not_sent

    puts "Found #{imports.count} contractor invites to send"

    imports.find_each do |import|
      begin
        import.invite!
        puts "sent invite for #{import.invite_code}"
      rescue => e
        puts "Error #{import.invite_code}: #{e.message}"
      end
    end

    puts "contractor invite email run complete"
  end
end