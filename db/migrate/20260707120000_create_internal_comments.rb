class CreateInternalComments < ActiveRecord::Migration[8.1]
  def change
    create_table :internal_comments, id: :uuid do |t|
      t.references :permit_application,
                   null: false,
                   foreign_key: true,
                   type: :uuid
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.text :body, null: false

      t.timestamps
    end

    add_column :permit_applications,
               :internal_comments_count,
               :integer,
               default: 0,
               null: false
  end
end
