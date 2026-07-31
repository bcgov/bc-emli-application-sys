class ReseedEulasAfterRendererChange < ActiveRecord::Migration[8.1]
  def change
    EulaUpdater.run
  end
end
