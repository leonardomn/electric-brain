import sqlite3
import numpy

db = sqlite3.connect('word_vectors.db')

cursor = db.cursor()

# Create table
cursor.execute('''CREATE TABLE word_vectors (
                  word      VARCHAR PRIMARY KEY,
                  tensor    VARCHAR
                );''')


db.commit()

# Insert a row of data

total = 0
with open('glove.42B.300d.txt') as f:
    for line in f:
        lineData = line.split(' ')
        word = lineData[0]
        numbers = numpy.array([float(x) for x in lineData[1:]])
        data = (word, numbers.tobytes())
        cursor.execute("INSERT INTO word_vectors VALUES(?, ?);", data)
        total += 1
        if total % 100000 == 0:
            print("total " + str(total))
            db.commit()

# We can also close the connection if we are done with it.
# Just be sure any changes have been committed or they will be lost.
db.close()
