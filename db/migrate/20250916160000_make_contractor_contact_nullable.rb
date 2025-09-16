# contractors.contact_id should be nullable to allow for contractors to be shimmed without a user account
# db/migrate/20250916160000_make_contractor_contact_nullable.rb
class MakeContractContactNullable < ActiveRecord::Migration[7.1]
  def change
    change_column_null :contractors, :contact_id, true
  end
end
