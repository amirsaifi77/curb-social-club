# docs/data-model.md admin_audits: every write through the admin UI.
# `changeset` rather than `changes`, which Active Record reserves.
class CreateAdminAudits < ActiveRecord::Migration[8.1]
  def change
    create_table :admin_audits, id: :uuid do |t|
      t.references :admin, type: :uuid, null: true, foreign_key: { to_table: :users, on_delete: :nullify }, index: false
      t.text :action, null: false
      t.text :target_type
      t.uuid :target_id
      t.jsonb :changeset, null: false, default: {}
      t.inet :ip
      t.datetime :created_at, null: false, default: -> { "CURRENT_TIMESTAMP" }
    end

    add_index :admin_audits, %i[target_type target_id created_at], order: { created_at: :desc }
    add_index :admin_audits, %i[admin_id created_at], order: { created_at: :desc }
  end
end
