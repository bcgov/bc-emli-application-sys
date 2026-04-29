# lib/tasks/send_contractor_invite_reminder.rake
namespace :contractors do
  desc "Send contractor reminder emails for imports that have been sent but not yet consumed"
  task send_reminders: :environment do
    unconsumed = ContractorImport.email_sent.not_consumed

    puts "Found #{unconsumed.count} contractor reminders to send"

    unconsumed.find_each do |import|
      begin
        import.invite_reminder!
        puts "sent invite reminder for #{import.invite_code}"
      rescue => e
        puts "Error #{import.invite_code}: #{e.message}"
      end
    end

    puts "contractor invite reminder email run complete"
  end
end
