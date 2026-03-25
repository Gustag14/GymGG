import sqlite3

conn = sqlite3.connect("gymgg.db")
cursor = conn.cursor()

cursor.execute("SELECT * FROM clase")
datos = cursor.fetchall()

for fila in datos:
    print(fila)

conn.close()