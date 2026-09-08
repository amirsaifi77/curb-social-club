# GET /venues/search matches venues.name with the trigram similarity
# operator (docs/api.md Venues). Without this index every keystroke is a
# sequential scan of the table.
class AddVenueNameTrigramIndex < ActiveRecord::Migration[8.1]
  disable_ddl_transaction!

  def change
    add_index :venues, :name, using: :gin, opclass: :gin_trgm_ops, algorithm: :concurrently
  end
end
