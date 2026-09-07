class EnablePostgresExtensions < ActiveRecord::Migration[8.1]
  def change
    enable_extension "postgis"
    enable_extension "pgcrypto"
    enable_extension "btree_gist"
    enable_extension "pg_trgm"
    enable_extension "citext"
  end
end
