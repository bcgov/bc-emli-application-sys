class CreateAwsCredentials < ActiveRecord::Migration[7.1]
  def change
    create_table :aws_credentials, id: :uuid do |t|
      t.string :name, null: false
      t.text :access_key_id, null: false
      t.text :secret_access_key, null: false
      t.text :session_token
      t.datetime :expires_at, null: false
      t.boolean :active, default: true, null: false

      t.timestamps
    end

    add_index :aws_credentials, :name, unique: true
    add_index :aws_credentials, :active
    add_index :aws_credentials, :expires_at
  end
end
