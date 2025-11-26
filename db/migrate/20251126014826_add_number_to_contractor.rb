class AddNumberToContractor < ActiveRecord::Migration[7.1]
  def up
    add_column :contractors, :number, :string

    #backfill oldest first
    Contractor.reset_column_information

    sequence = 1

    Contractor
      .order(:created_at)
      .find_each do |contractor|
        contractor.update_columns(number: format("%05d", sequence))
        sequence += 1
      end
  end

  def down
    remove_column :contractors, :number
  end
end
