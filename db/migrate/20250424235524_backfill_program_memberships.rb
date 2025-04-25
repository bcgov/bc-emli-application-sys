class BackfillProgramMemberships < ActiveRecord::Migration[7.1]
  def up
    existing_memberships = execute(<<-SQL.squish)
      SELECT DISTINCT user_id, program_id
      FROM program_classification_memberships
    SQL

    existing_memberships.each do |row|
      user_id = row["user_id"]
      program_id = row["program_id"]

      # generate new program_membership if they don't already exist
      program_membership = execute(<<-SQL.squish)
        INSERT INTO program_memberships (id, user_id, program_id, created_at, updated_at)
        VALUES (gen_random_uuid(), '#{user_id}', '#{program_id}', NOW(), NOW())
        ON CONFLICT DO NOTHING
      SQL
    end

    # update classification membership with the new program_membership_id
    execute(<<-SQL.squish)
      UPDATE program_classification_memberships pcm
      SET program_membership_id = pm.id
      FROM program_memberships pm
      WHERE pcm.user_id = pm.user_id AND pcm.program_id = pm.program_id
    SQL
  end

  def down
    # code to reverse the update would go here.. likely uneccesary
  end
end
