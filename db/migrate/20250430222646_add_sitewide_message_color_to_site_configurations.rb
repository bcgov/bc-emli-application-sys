class AddSitewideMessageColorToSiteConfigurations < ActiveRecord::Migration[7.1]
  def change
    add_column :site_configurations, :sitewide_message_color, :string
  end
end
