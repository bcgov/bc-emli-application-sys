class AddSlugToPrograms < ActiveRecord::Migration[7.1]
  def change
    add_column :programs, :slug, :string
  end
end
