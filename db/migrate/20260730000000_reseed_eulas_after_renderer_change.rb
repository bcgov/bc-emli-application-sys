class ReseedEulasAfterRendererChange < ActiveRecord::Migration[8.1]
  def up
    EulaUpdater.run
  end

  # Reseeding reads the current eulas/*.html files and overwrites the active
  # agreement content in place; there is no prior content to restore.
  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
