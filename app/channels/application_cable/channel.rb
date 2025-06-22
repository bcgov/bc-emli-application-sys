module ApplicationCable
  class Channel < ActionCable::Channel::Base
    def subscribe_to_channel
      Rails.logger.info "[ApplicationCable::Channel] Channel subscription attempt: #{self.class.name}"
      super
    end

    def unsubscribe_from_channel
      Rails.logger.info "[ApplicationCable::Channel] Channel unsubscription: #{self.class.name}"
      super
    end
  end
end
