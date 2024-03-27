import sqlite3
import zlib

# Read the CSV file
db_file = 'train_schedule.db'

# Compress the database
with open(db_file, 'rb') as f:
    uncompressed_data = f.read()

compressed_data = zlib.compress(uncompressed_data)

# Create a compressed database
compressed_db_file = 'train_schedule_compressed.db'
with sqlite3.connect(compressed_db_file) as conn:
    conn.isolation_level = None
    conn.execute('PRAGMA synchronous = OFF')
    conn.execute('PRAGMA journal_mode = OFF')
    conn.execute('PRAGMA temp_store = MEMORY')
    conn.execute('PRAGMA page_size = {}'.format(4096))
    conn.execute('PRAGMA cache_size = {}'.format(10000))
    conn.execute('PRAGMA mmap_size = {}'.format(0))
    conn.execute('PRAGMA locking_mode = EXCLUSIVE')
    conn.execute('PRAGMA auto_vacuum = FULL')
    conn.execute('PRAGMA shrink_memory')
    conn.execute(zlib.decompress(compressed_data).decode('utf-8'))
    conn.execute('VACUUM')

# Backup the compressed database to a new file
backup_file = 'train_schedule_compressed_backup.db'
with sqlite3.connect(compressed_db_file) as conn:
    with sqlite3.connect(backup_file) as backup_conn:
        conn.backup(backup_conn)

# Close the connections
conn.close()
backup_conn.close()
